const cds = require('@sap/cds');
const CartUtils = require('./utils/cart-utils');
const CartHandlers = require('./handlers/customer/cart-handlers');
const OrderHandlers = require('./handlers/customer/order-handlers');

module.exports = cds.service.impl(async function() {
    
    const { Books, MyOrders, MyOrderItems, MyReviews, MyReturns, MyShoppingCart, MyShoppingCartItems } = this.entities;

    // Get the underlying database service to access DiscountCodes without exposing it to customers
    const db = await cds.connect.to('db');
    const { DiscountCodes } = db.entities('bookstore');
    
    // Register modular handlers
    CartHandlers.register(this);
    OrderHandlers.register(this);
    
    
    
    // Function: Get Recommendations
    this.on('getRecommendations', async (req) => {
        const user = req.user.id;
        
        // Get user's purchased books to find categories they're interested in
        const userOrderItems = await SELECT.from(MyOrderItems)
            .columns('book_ID')
            .where({ 'order.createdBy': user });
        
        if (userOrderItems.length === 0) {
            // If no purchase history, return popular books with stock
            return await SELECT.from(Books)
                .columns('ID', 'title', 'price', 'imageUrl', 'author')
                .where({ stock: { '>': 0 } })
                .limit(10);
        }
        
        // Get purchased book IDs
        const purchasedBookIds = userOrderItems.map(item => item.book_ID);
        
        // Get categories from purchased books
        const { BookCategories } = this.entities;
        const userBookCategories = await SELECT.from(BookCategories)
            .columns('category_ID')
            .where({ book_ID: { in: purchasedBookIds } });
        
        if (userBookCategories.length === 0) {
            // Fallback to popular books if no categories found
            return await SELECT.from(Books)
                .columns('ID', 'title', 'price', 'imageUrl', 'author')
                .where({ 
                    stock: { '>': 0 },
                    ID: { 'not in': purchasedBookIds }
                })
                .limit(10);
        }
        
        const categoryIds = [...new Set(userBookCategories.map(cat => cat.category_ID))];
        
        // Get books from same categories, excluding already purchased books
        const recommendedBookCategories = await SELECT.from(BookCategories)
            .columns('book_ID')
            .where({ 
                category_ID: { in: categoryIds },
                book_ID: { 'not in': purchasedBookIds }
            });
        
        const recommendedBookIds = [...new Set(recommendedBookCategories.map(cat => cat.book_ID))];
        
        if (recommendedBookIds.length === 0) {
            // Fallback if no recommendations found
            return await SELECT.from(Books)
                .columns('ID', 'title', 'price', 'imageUrl', 'author')
                .where({ 
                    stock: { '>': 0 },
                    ID: { 'not in': purchasedBookIds }
                })
                .limit(10);
        }
        
        // Return recommended books with stock
        return await SELECT.from(Books)
            .columns('ID', 'title', 'price', 'imageUrl', 'author')
            .where({ 
                ID: { in: recommendedBookIds },
                stock: { '>': 0 }
            })
            .limit(10);
    });
    
    // Function: Get Order History
    this.on('getOrderHistory', async (req) => {
        const user = req.user.id;
        
        return await SELECT.from(MyOrders)
            .columns('*')
            .where({ createdBy: user })
            .orderBy('orderDate desc');
    });
    
    // Function: Can Review
    this.on('canReview', async (req) => {
        const { bookId } = req.data;
        const user = req.user.id;
        
        // Check if user has already reviewed this book
        const existingReview = await SELECT.from(MyReviews)
            .where({ book_ID: bookId, createdBy: user });
        
        if (existingReview.length > 0) {
            return false;
        }
        
        // Check if user has purchased this book
        const hasPurchased = await SELECT.from(MyOrderItems)
            .columns('ID')
            .where({ 
                book_ID: bookId,
                'order.createdBy': user,
                'order.status': { in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'] }
            });
        
        return hasPurchased.length > 0;
    });

    // Action: Purchase from Cart (bound to MyShoppingCart)
    this.on('purchaseFromCart', 'MyShoppingCart', async (req) => {
        const { discountCode, shippingAddress, billingAddress, customerEmail, customerPhone } = req.data;
        const cartId = req.params[0].ID; // The cart ID comes from the entity context
        const user = req.user.id;
        
        // Validate required fields
        if (!shippingAddress || !billingAddress || !customerEmail || !customerPhone) {
            req.error(400, 'Shipping address, billing address, customer email, and customer phone are required');
            return;
        }
        
        // Verify cart belongs to user and is active
        const cart = await SELECT.one.from(MyShoppingCart)
            .where({ ID: cartId, createdBy: user, status: 'ACTIVE' });
        
        if (!cart) {
            req.error(404, 'Active cart not found');
            return;
        }
        
        // Get cart items
        const cartItems = await SELECT.from(MyShoppingCartItems)
            .columns('quantity', 'book_ID')
            .where({ cart_ID: cartId });
        
        if (cartItems.length === 0) {
            req.error(400, 'Cart is empty');
            return;
        }
        
        // Convert cart items to purchase format
        const purchaseItems = cartItems.map(item => ({
            bookId: item.book_ID,
            quantity: item.quantity
        }));
        
        // Use existing purchaseBooks logic
        const orderResult = await this.send('purchaseBooks', {
            items: purchaseItems,
            discountCode,
            shippingAddress,
            billingAddress,
            customerEmail,
            customerPhone
        });
        
        // Clear cart after successful purchase
        await DELETE.from(MyShoppingCartItems).where({ cart_ID: cartId });
        
        // Mark cart as converted
        await UPDATE(MyShoppingCart)
            .where({ ID: cartId })
            .with({ status: 'CONVERTED' });
        
        return orderResult.replace('created successfully', 'created successfully from cart');
    });

    // Entity-level handlers for user context filtering
    this.before('READ', 'MyOrders', (req) => {
        req.query.where({ createdBy: req.user.id });
    });
    
    this.before('READ', 'MyOrderItems', async (req) => {
        // Filter order items by user's orders
        const userOrders = await SELECT.from(Orders)
            .columns('ID')
            .where({ createdBy: req.user.id });
        
        const orderIds = userOrders.map(order => order.ID);
        if (orderIds.length > 0) {
            req.query.where({ order_ID: { in: orderIds } });
        } else {
            req.query.where({ order_ID: null }); // No results if user has no orders
        }
    });
    
    this.before('READ', 'MyReviews', (req) => {
        req.query.where({ createdBy: req.user.id });
    });
    
    this.before('READ', 'MyReturns', (req) => {
        req.query.where({ createdBy: req.user.id });
    });

    // Shopping cart entity handlers
    this.before('READ', 'MyShoppingCart', (req) => {
        req.query.where({ createdBy: req.user.id, status: 'ACTIVE' });
    });

    this.before('READ', 'MyShoppingCartItems', async (req) => {
        // Filter cart items by user's carts
        const userCarts = await SELECT.from(MyShoppingCart)
            .columns('ID')
            .where({ createdBy: req.user.id });
        
        const cartIds = userCarts.map(cart => cart.ID);
        if (cartIds.length > 0) {
            req.query.where({ cart_ID: { in: cartIds } });
        } else {
            req.query.where({ cart_ID: null }); // No results if user has no carts
        }
    });

    // Virtual field calculations for shopping cart
    this.after('READ', 'MyShoppingCart', async (results, req) => {
        if (!Array.isArray(results)) {
            results = [results];
        }

        for (const cart of results) {
            if (cart) {
                const totals = await CartUtils.calculateCartTotals(cart.ID, this.entities);
                cart.totalItems = totals.cartItemCount;
                cart.totalAmount = totals.cartTotal;
            }
        }
    });

    // Virtual field calculations for shopping cart items
    this.after('READ', 'MyShoppingCartItems', async (results, req) => {
        if (!Array.isArray(results)) {
            results = [results];
        }

        for (const item of results) {
            if (item && item.book) {
                item.unitPrice = item.book.price;
                item.subtotal = Math.round(item.book.price * item.quantity * 100) / 100;
            }
        }
    });
    
    // Prevent direct creation/update of transactional entities (use actions instead)
    this.before('CREATE', 'MyOrders', (req) => {
        req.error(403, 'Orders must be created through the purchaseBooks action');
    });
    
    this.before('UPDATE', 'MyOrders', (req) => {
        req.error(403, 'Orders cannot be modified by customers');
    });
    
    this.before('DELETE', 'MyOrders', (req) => {
        req.error(403, 'Orders cannot be deleted by customers');
    });
    
    this.before('CREATE', 'MyReturns', (req) => {
        req.error(403, 'Returns must be created through the requestReturn action');
    });
    
    this.before('UPDATE', 'MyReturns', (req) => {
        req.error(403, 'Return requests cannot be modified after submission');
    });
    
    this.before('DELETE', 'MyReturns', (req) => {
        req.error(403, 'Return requests cannot be deleted');
    });
});
