const cds = require('@sap/cds');

/**
 * Recommendation and Utility Action Handlers
 * Extracted handlers for recommendation and utility operations
 */
class RecommendationHandlers {
    
    /**
     * Register all recommendation handlers with the service
     * @param {Object} service - CAP service instance
     */
    static register(service) {
        // Register recommendation and utility handlers
        service.on('getRecommendations', RecommendationHandlers.getRecommendations.bind(service));
        service.on('getOrderHistory', RecommendationHandlers.getOrderHistory.bind(service));
        service.on('canReview', RecommendationHandlers.canReview.bind(service));
        service.on('purchaseFromCart', 'MyShoppingCart', RecommendationHandlers.purchaseFromCart.bind(service));
    }
    
    /**
     * Get Recommendations Action Handler
     * Provides personalized book recommendations based on purchase history
     */
    static async getRecommendations(req) {
        const user = req.user.id;
        
        // Get user's purchased books to find categories they're interested in
        const userOrderItems = await SELECT.from(this.entities.MyOrderItems)
            .columns('book_ID')
            .where({ 'order.createdBy': user });
        
        if (userOrderItems.length === 0) {
            // If no purchase history, return popular books with stock
            return await SELECT.from(this.entities.Books)
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
            return await SELECT.from(this.entities.Books)
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
            return await SELECT.from(this.entities.Books)
                .columns('ID', 'title', 'price', 'imageUrl', 'author')
                .where({ 
                    stock: { '>': 0 },
                    ID: { 'not in': purchasedBookIds }
                })
                .limit(10);
        }
        
        // Return recommended books with stock
        return await SELECT.from(this.entities.Books)
            .columns('ID', 'title', 'price', 'imageUrl', 'author')
            .where({ 
                ID: { in: recommendedBookIds },
                stock: { '>': 0 }
            })
            .limit(10);
    }
    
    /**
     * Get Order History Action Handler
     * Retrieves user's order history with sorting
     */
    static async getOrderHistory(req) {
        const user = req.user.id;
        
        return await SELECT.from(this.entities.MyOrders)
            .columns('*')
            .where({ createdBy: user })
            .orderBy('orderDate desc');
    }
    
    /**
     * Can Review Action Handler
     * Checks if user can review a specific book
     */
    static async canReview(req) {
        const { bookId } = req.data;
        const user = req.user.id;
        
        // Check if user has already reviewed this book
        const existingReview = await SELECT.from(this.entities.MyReviews)
            .where({ book_ID: bookId, createdBy: user });
        
        if (existingReview.length > 0) {
            return false;
        }
        
        // Check if user has purchased this book
        const hasPurchased = await SELECT.from(this.entities.MyOrderItems)
            .columns('ID')
            .where({ 
                book_ID: bookId,
                'order.createdBy': user,
                'order.status': { in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'] }
            });
        
        return hasPurchased.length > 0;
    }

    /**
     * Purchase from Cart Action Handler (bound to MyShoppingCart)
     * Handles purchasing all items from user's cart
     */
    static async purchaseFromCart(req) {
        const { discountCode, shippingAddress, billingAddress, customerEmail, customerPhone } = req.data;
        const cartId = req.params[0].ID; // The cart ID comes from the entity context
        const user = req.user.id;
        
        // Validate required fields
        if (!shippingAddress || !billingAddress || !customerEmail || !customerPhone) {
            req.error(400, 'Shipping address, billing address, customer email, and customer phone are required');
            return;
        }
        
        // Verify cart belongs to user and is active
        const cart = await SELECT.one.from(this.entities.MyShoppingCart)
            .where({ ID: cartId, createdBy: user, status: 'ACTIVE' });
        
        if (!cart) {
            req.error(404, 'Active cart not found');
            return;
        }
        
        // Get cart items
        const cartItems = await SELECT.from(this.entities.MyShoppingCartItems)
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
        await DELETE.from(this.entities.MyShoppingCartItems).where({ cart_ID: cartId });
        
        // Mark cart as converted
        await UPDATE(this.entities.MyShoppingCart)
            .where({ ID: cartId })
            .with({ status: 'CONVERTED' });
        
        return orderResult.replace('created successfully', 'created successfully from cart');
    }
}

module.exports = RecommendationHandlers;
