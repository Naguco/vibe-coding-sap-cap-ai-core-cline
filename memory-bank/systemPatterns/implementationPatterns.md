## Shopping Cart Implementation Patterns

### Entity Structure Pattern
```cds
// Shopping Cart with Virtual Fields
entity MyShoppingCart as projection on bookstore.ShoppingCarts {
    *,
    items: redirected to MyShoppingCartItems,
    virtual totalItems: Integer,
    virtual totalAmount: Decimal(10,2)
};

// Cart Items with Calculated Fields
entity MyShoppingCartItems as projection on bookstore.ShoppingCartItems {
    *,
    cart: redirected to MyShoppingCart,
    book: redirected to Books,
    virtual subtotal: Decimal(10,2),
    virtual unitPrice: Decimal(10,2)
};
```

### Bound Action Patterns
```cds
// Entity-bound actions for shopping cart operations
entity MyShoppingCart {
    actions {
        @Common.SideEffects: {
            TargetEntities: ['items', '_parent']
        }
        action clearCart() returns {
            success: Boolean;
            message: String;
        };
        
        action getCartSummary() returns {
            success: Boolean;
            message: String;
        };
    }
};

entity MyShoppingCartItems {
    actions {
        @Common.SideEffects: {
            TargetEntities: ['_parent', 'cart']
        }
        action removeFromCart() returns {
            success: Boolean;
            message: String;
            cartItemCount: Integer;
            cartTotal: Decimal(10,2);
        };
    }
};
```

### Critical Implementation Patterns

#### Parameter Handling for Nested URLs
```javascript
// CRITICAL: Bound actions on nested entities use different parameter indexing
// For URL: /MyShoppingCart(cartId)/items(itemId)/CustomerService.removeFromCart

// WRONG (causes 404 errors):
const itemId = req.params[0].ID; 

// CORRECT:
const itemId = req.params[1].ID; // Use index [1] for nested entity ID
const cartId = req.params[0].ID; // Use index [0] for parent entity ID
```

#### Authorization Through Relationships
```javascript
// CRITICAL: Cart items don't have direct createdBy field
// Must check authorization through cart relationship

// WRONG (cart item doesn't have createdBy):
if (cartItem.createdBy !== user) { /* fails */ }

// CORRECT (check through cart relationship):
const cartItem = await SELECT.one.from(MyShoppingCartItems)
    .columns('ID', 'cart_ID', 'cart.createdBy')
    .where({ ID: itemId });

if (cartItem.cart_createdBy !== user) {
    req.error(404, 'Cart item not found');
    return;
}
```

#### UI Message Display Pattern
```javascript
// CRITICAL: Fiori Elements doesn't auto-display complex action returns
// Use req.info() for user-visible messages

// User-friendly detailed message popup
const summaryText = `Cart Summary:\n\n• Book Title by Author\n  Quantity: 2 × $19.99 = $39.98\n\nTotal: $39.98`;
req.info(summaryText); // Shows popup to user

// Structured API response for consistency
return {
    success: true,
    message: `Cart contains ${totalItems} items with total amount $${totalAmount.toFixed(2)}`
};
```

### Side Effects for UI Refresh
```cds
// CRITICAL: Actions need side effects to trigger UI refresh
@Common.SideEffects: {
    TargetEntities: [
        'items',     // Refresh cart items table
        '_parent'    // Refresh parent cart entity
    ]
}
action clearCart() returns { success: Boolean; message: String; };
```

### Helper Function Patterns
```javascript
// Cart creation/retrieval pattern
const getOrCreateCart = async (user) => {
    let cart = await SELECT.one.from(MyShoppingCart)
        .where({ createdBy: user, status: 'ACTIVE' });
    
    if (!cart) {
        await INSERT.into(MyShoppingCart).entries({
            status: 'ACTIVE',
            createdBy: user
        });
        cart = await SELECT.one.from(MyShoppingCart)
            .where({ createdBy: user, status: 'ACTIVE' });
    }
    
    return cart;
};

// Cart totals calculation pattern
const calculateCartTotals = async (cartId) => {
    const cartItems = await SELECT.from(MyShoppingCartItems)
        .columns('quantity', 'book_ID')
        .where({ cart_ID: cartId });
    
    let totalItems = 0;
    let totalAmount = 0;
    
    for (const item of cartItems) {
        const book = await SELECT.one.from(Books).where({ ID: item.book_ID });
        if (book) {
            totalItems += item.quantity;
            totalAmount += book.price * item.quantity;
        }
    }
    
    return {
        cartItemCount: totalItems,
        cartTotal: Math.round(totalAmount * 100) / 100
    };
};
```

### Virtual Field Implementation
```javascript
// After-read handler for calculated fields using extracted utilities
this.after('READ', 'MyShoppingCart', async (results, req) => {
    if (!Array.isArray(results)) results = [results];

    for (const cart of results) {
        if (cart) {
            const totals = await CartUtils.calculateCartTotals(cart.ID, this.entities);
            cart.totalItems = totals.cartItemCount;
            cart.totalAmount = totals.cartTotal;
        }
    }
});

this.after('READ', 'MyShoppingCartItems', async (results, req) => {
    if (!Array.isArray(results)) results = [results];

    for (const item of results) {
        if (item && item.book) {
            item.unitPrice = item.book.price;
            item.subtotal = Math.round(item.book.price * item.quantity * 100) / 100;
        }
    }
});
```

### URL Structure Patterns
```
Shopping Cart Action URLs:
├── Cart Actions: /MyShoppingCart(cartId)/action
│   ├── clearCart
│   ├── getCartSummary  
│   └── purchaseFromCart
│
├── Cart Item Actions: /MyShoppingCart(cartId)/items(itemId)/CustomerService.action
│   ├── removeFromCart
│   └── updateCartItem
│
└── Book Actions: /Books(bookId)/action
    └── addToCart
```

### Test Patterns for Bound Actions
```javascript
// CRITICAL: Test URLs must match nested structure
describe('removeFromCart Action', () => {
    test('should successfully remove item from cart', async () => {
        // CORRECT nested URL pattern
        const response = await POST(
            `/odata/v4/customer/MyShoppingCart(${cartId})/items(${cartItemId})/CustomerService.removeFromCart`, 
            {}, 
            customerAuth
        );
        
        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
    });
});
```

### Custom Action Navigation Pattern
```javascript
// Enhanced navigation for single-cart scenarios
sap.ui.define([
    "sap/m/MessageToast"
], function (MessageToast) {
    "use strict";

    return {
        onPress: function (oEvent) {
            MessageToast.show("Opening your shopping cart...");
            
            // Simple URL navigation to cart list
            var sCurrentUrl = window.location.href;
            var sBaseUrl = sCurrentUrl.split('#')[0];
            var sCartUrl = sBaseUrl + "#/MyShoppingCart";
            
            window.location.href = sCartUrl;
        }
    };
});
```
