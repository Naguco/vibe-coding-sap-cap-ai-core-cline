const cds = require('@sap/cds');

/**
 * Shopping Cart Utility Functions
 * These functions handle common cart operations used across cart handlers
 */
class CartUtils {
    
    /**
     * Get or create user's active shopping cart
     * @param {string} user - User ID
     * @param {Object} entities - Service entities object
     * @returns {Object} Active cart for the user
     */
    static async getOrCreateCart(user, entities) {
        const { MyShoppingCart } = entities;
        
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
    }

    /**
     * Calculate cart totals (items count and total amount)
     * @param {string} cartId - Cart ID
     * @param {Object} entities - Service entities object
     * @returns {Object} Object with cartItemCount and cartTotal
     */
    static async calculateCartTotals(cartId, entities) {
        const { MyShoppingCartItems, Books } = entities;
        
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
    }
}

module.exports = CartUtils;
