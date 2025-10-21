using bookstore from '../db/data-model';

service CustomerService {
    
    // Read-only access to catalog entities - excluding admin metadata
    @readonly entity Books as projection on bookstore.Books {
        *,
        author: redirected to Authors,
        categories: redirected to BookCategories
    } excluding { createdAt, createdBy, modifiedAt, modifiedBy }
    actions {
        action addToCart(
            quantity: Integer
        ) returns {
            success: Boolean;
            message: String;
            cartItemCount: Integer;
            cartTotal: Decimal(10,2);
        };
    };
    
    @readonly entity Authors as projection on bookstore.Authors {
        *,
        books: redirected to Books
    } excluding { createdAt, createdBy, modifiedAt, modifiedBy };
    
    @readonly entity Categories as projection on bookstore.Categories {
        *,
        subcategories: redirected to Categories,
        books: redirected to BookCategories
    } excluding { createdAt, createdBy, modifiedAt, modifiedBy };
    
    @readonly entity BookCategories as projection on bookstore.BookCategories {
        *,
        book: redirected to Books,
        category: redirected to Categories
    };
    
    // Customer-specific transactional entities (filtered by user context)
    entity MyOrders as projection on bookstore.Orders {
        *,
        items: redirected to MyOrderItems
    };
    
    entity MyOrderItems as projection on bookstore.OrderItems {
        *,
        order: redirected to MyOrders,
        book: redirected to Books
    };
    
    entity MyReviews as projection on bookstore.Reviews {
        *,
        book: redirected to Books
    };
    
    entity MyReturns as projection on bookstore.Returns {
        *,
        order: redirected to MyOrders,
        book: redirected to Books
    };
    
    // Shopping Cart entities - filtered by user context with virtual calculated fields
    entity MyShoppingCart as projection on bookstore.ShoppingCarts {
        *,
        items: redirected to MyShoppingCartItems,
        virtual totalItems: Integer,
        virtual totalAmount: Decimal(10,2)
    }
    actions {
        @Common.SideEffects: {
            TargetEntities: [
                'items',
                '_parent'
            ]
        }
        action clearCart() returns {
            success: Boolean;
            message: String;
        };
        
        action purchaseFromCart(
            discountCode: String,
            shippingAddress: String,
            billingAddress: String,
            customerEmail: String,
            customerPhone: String
        ) returns String;
        
        action getCartSummary() returns {
            success: Boolean;
            message: String;
        };
    };
    
    entity MyShoppingCartItems as projection on bookstore.ShoppingCartItems {
        *,
        cart: redirected to MyShoppingCart,
        book: redirected to Books,
        virtual subtotal: Decimal(10,2),
        virtual unitPrice: Decimal(10,2)
    }
    actions {
        @Common.SideEffects: {
            TargetEntities: [
                '_parent',
                'cart'
            ]
        }
        action updateCartItem(
            quantity: Integer
        ) returns {
            success: Boolean;
            message: String;
            cartItemCount: Integer;
            cartTotal: Decimal(10,2);
        };
        
        @Common.SideEffects: {
            TargetEntities: [
                '_parent',
                'cart'
            ]
        }
        action removeFromCart() returns {
            success: Boolean;
            message: String;
            cartItemCount: Integer;
            cartTotal: Decimal(10,2);
        };
    };
    
    // Customer-specific actions for business operations
    action purchaseBooks(
        items: array of {
            bookId: UUID;
            quantity: Integer;
        },
        discountCode: String,
        shippingAddress: String,
        billingAddress: String,
        customerEmail: String,
        customerPhone: String
    ) returns String;
    
    action submitReview(
        bookId: UUID,
        rating: Integer,
        title: String,
        comment: String
    ) returns String;
    
    action requestReturn(
        orderId: UUID,
        bookId: UUID,
        quantity: Integer,
        reason: String
    ) returns String;
    
    // Discount-related actions
    action validateDiscountCode(
        discountCode: String,
        orderTotal: Decimal(10,2)
    ) returns {
        isValid: Boolean;
        discountType: String;
        discountValue: Decimal(10,2);
        discountAmount: Decimal(10,2);
        finalAmount: Decimal(10,2);
        message: String;
    };
    
    action calculateOrderTotal(
        items: array of {
            bookId: UUID;
            quantity: Integer;
        },
        discountCode: String
    ) returns {
        originalAmount: Decimal(10,2);
        discountAmount: Decimal(10,2);
        totalAmount: Decimal(10,2);
        isValidDiscount: Boolean;
    };
    
    
    
    // Customer utility functions
    function getRecommendations() returns array of Books;
    function getOrderHistory() returns array of MyOrders;
    function canReview(bookId: UUID) returns Boolean;
}

// Apply customer role authorization to the entire service
annotate CustomerService with @(requires: 'customer');

// Fine-grained authorization for customer-specific entities
annotate CustomerService.MyOrders with @(restrict: [
    { grant: ['READ', 'CREATE'], to: 'customer', where: 'createdBy = $user' }
]);

annotate CustomerService.MyOrderItems with @(restrict: [
    { grant: 'READ', to: 'customer', where: 'order.createdBy = $user' }
]);

annotate CustomerService.MyReviews with @(restrict: [
    { grant: ['READ', 'CREATE', 'UPDATE', 'DELETE'], to: 'customer', where: 'createdBy = $user' }
]);

annotate CustomerService.MyReturns with @(restrict: [
    { grant: ['READ', 'CREATE'], to: 'customer', where: 'createdBy = $user' }
]);

annotate CustomerService.MyShoppingCart with @(restrict: [
    { grant: ['READ', 'CREATE', 'UPDATE', 'DELETE', 'clearCart', 'getCartSummary', 'purchaseFromCart'], to: 'customer', where: 'createdBy = $user' }
]);

annotate CustomerService.MyShoppingCartItems with @(restrict: [
    { grant: ['READ', 'CREATE', 'UPDATE', 'DELETE', 'updateCartItem', 'removeFromCart'], to: 'customer', where: 'createdBy = $user' }
]);
