# System Patterns: CAP Bookstore Architecture

## Overall Architecture

### Service-Oriented Design
The application follows CAP's service-oriented architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Fiori UI Layer                           │
├─────────────────────────────────────────────────────────────┤
│                    Service Layer                            │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐│
│  │   Admin Service     │  │    Customer Service             ││
│  │   - Full CRUD       │  │    - Read Books                 ││
│  │   - Analytics       │  │    - Purchase                   ││
│  │   - User Mgmt       │  │    - Reviews                    ││
│  └─────────────────────┘  │    - Returns                    ││
│                           └─────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│                    Data Model Layer                         │
│   Books | Authors | Categories | Orders | Reviews | Users   │
├─────────────────────────────────────────────────────────────┤
│                    Database Layer                           │
└─────────────────────────────────────────────────────────────┘
```

## Core Entity Patterns

### Domain Entities
- **Books**: Central entity with rich metadata
- **Authors**: Separate entity for author management
- **Categories**: Hierarchical categorization system
- **Orders**: Purchase transaction records
- **OrderItems**: Line items for each order
- **Reviews**: Customer feedback and ratings
- **Returns**: Return request management
- **User Management**: Handled via XSUAA/IAS (no custom User entity)

### Relationship Patterns
- **One-to-Many**: Author → Books, Category → Books
- **Many-to-Many**: Books ↔ Categories (through association)
- **Composition**: Order → OrderItems, Order → Returns
- **User Context**: Orders and Reviews linked via $user (XSUAA context)

## Service Design Patterns

### AdminService Pattern
```cds
service AdminService {
  // Full entity exposure with unrestricted access
  entity Books as projection on bookstore.Books;
  entity Authors as projection on bookstore.Authors;
  entity Categories as projection on bookstore.Categories;
  entity Orders as projection on bookstore.Orders;
  entity Reviews as projection on bookstore.Reviews;
  entity Returns as projection on bookstore.Returns;
  
  // Admin-specific views and analytics
  view SalesAnalytics as select from Orders;
  view InventoryReport as select from Books;
}
```

### CustomerService Pattern
```cds
service CustomerService {
  // Read-only catalog access
  @readonly entity Books as projection on bookstore.Books;
  @readonly entity Authors as projection on bookstore.Authors;
  @readonly entity Categories as projection on bookstore.Categories;
  
  // Customer-specific operations (filtered by XSUAA user context)
  entity MyOrders as projection on bookstore.Orders where createdBy = $user;
  entity MyReviews as projection on bookstore.Reviews where createdBy = $user;
  entity MyReturns as projection on bookstore.Returns where createdBy = $user;
  
  // Actions for business operations
  action purchaseBooks(items: array of PurchaseItem) returns Order;
  action returnBook(orderId: UUID, bookId: UUID) returns ReturnRequest;
}
```

## Authorization Patterns

### Role-Based Access Control
```cds
// Roles definition
annotate AdminService with @requires: 'admin';
annotate CustomerService with @requires: 'customer';

// Fine-grained restrictions
annotate CustomerService.Books with @restrict: [
  { grant: 'READ', to: 'customer' }
];

annotate CustomerService.MyOrders with @restrict: [
  { grant: ['READ', 'CREATE'], to: 'customer', where: 'createdBy = $user' }
];
```

### Data Privacy Patterns
- **Personal Data Isolation**: Customer can only access their own orders/reviews
- **Admin Oversight**: Administrators can view all data but with audit trails
- **Secure Transactions**: Purchase operations are atomic and logged

## UI Architecture Patterns

### Fiori Elements Integration
```
Customer App Structure:
├── BookCatalog (List Report)
├── BookDetails (Object Page)
├── MyPurchases (List Report)
├── PurchaseHistory (Object Page)
└── ReturnProcess (Form/Workflow)

Admin App Structure:
├── BookManagement (List Report + Object Page)
├── OrderManagement (List Report + Object Page)
├── CustomerManagement (List Report + Object Page)
├── Analytics Dashboard (Analytical List Page)
└── InventoryTracking (List Report)
```

### Navigation Patterns
- **Semantic Object-Based**: Books → BookDetails → Reviews
- **Cross-App Navigation**: From Customer to Admin context (role-dependent)
- **Deep Linking**: Direct access to specific books/orders via URL

## Data Model Patterns

### Temporal Data Pattern
```cds
entity Orders {
  // Audit fields for temporal tracking
  createdAt  : Timestamp @cds.on.insert: $now;
  createdBy  : String    @cds.on.insert: $user;
  modifiedAt : Timestamp @cds.on.insert: $now @cds.on.update: $now;
  modifiedBy : String    @cds.on.insert: $user @cds.on.update: $user;
}
```

### Business State Management
```cds
type OrderStatus : String enum {
  PENDING;
  CONFIRMED;
  SHIPPED;
  DELIVERED;
  RETURNED;
}

type ReturnStatus : String enum {
  REQUESTED;
  APPROVED;
  REJECTED;
  PROCESSED;
}
```

## Integration Patterns

### Event-Driven Architecture
- **Order Events**: Created, Updated, Shipped, Delivered
- **Inventory Events**: Stock Updated, Low Stock Alert
- **Customer Events**: Review Added, Return Requested

### External Service Integration
- **Payment Processing**: Integration pattern for payment gateways
- **Inventory Sync**: Real-time stock level management
- **Notification Service**: Email/SMS for order updates

## Error Handling Patterns

### Validation Patterns
- **Business Rules**: Stock availability, return policies
- **Data Integrity**: Required fields, format validation
- **Authorization**: Access control and user context validation

### Recovery Patterns
- **Transaction Rollback**: Failed purchase recovery
- **Compensation**: Return processing and refund handling
- **Audit Trail**: Complete operation logging for troubleshooting

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
// After-read handler for calculated fields
this.after('READ', 'MyShoppingCart', async (results, req) => {
    if (!Array.isArray(results)) results = [results];

    for (const cart of results) {
        if (cart) {
            const totals = await calculateCartTotals(cart.ID);
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

## Key Lessons for CAP Development

### Bound Action Parameter Access
- Nested entity actions use `req.params[1].ID` for the nested entity
- Parent entity ID is available at `req.params[0].ID`
- URL structure determines parameter indexing

### Authorization in Related Entities
- Check authorization through entity relationships, not direct fields
- Use proper column selection to include relationship fields
- Always verify user ownership through the correct path

### Fiori Elements UI Integration
- Use `req.info()` for user-visible messages
- Add `@Common.SideEffects` for automatic UI refresh
- Structure action returns for API consistency

### Virtual Field Calculations
- Implement in after-read handlers for automatic calculation
- Handle both single results and arrays
- Perform calculations server-side for accuracy
