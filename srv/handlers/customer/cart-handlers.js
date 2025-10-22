const CartUtils = require('../../utils/cart-utils');

/**
 * Shopping Cart Action Handlers
 * Extracted handlers for cart-related operations
 */
class CartHandlers {
    
    /**
     * Register all cart handlers with the service
     * @param {Object} service - CAP service instance
     */
    static register(service) {
        // Register the addToCart handler
        service.on('addToCart', 'Books', CartHandlers.addToCart.bind(service));
        service.on('clearCart', 'MyShoppingCart', CartHandlers.clearCart.bind(service));
        service.on('removeFromCart', 'MyShoppingCartItems', CartHandlers.removeFromCart.bind(service));
        service.on('updateCartItem', 'MyShoppingCartItems', CartHandlers.updateCartItem.bind(service));
        service.on('getCartSummary', 'MyShoppingCart', CartHandlers.getCartSummary.bind(service));
    }
    
    /**
     * Add to Cart handler - bound to Books entity
     */
    static async addToCart(req) {
        const { quantity } = req.data;
        const bookId = req.params[0].ID; // The book ID comes from the entity context
        const user = req.user.id;
        
        const { Books, MyShoppingCart, MyShoppingCartItems } = this.entities;
        
        // Validate input
        if (!bookId || !quantity) {
            req.error(400, 'Book ID and quantity are required');
            return;
        }
        
        if (quantity < 1 || quantity > 99) {
            req.error(400, 'Quantity must be between 1 and 99');
            return;
        }
        
        // Check if book exists and has sufficient stock
        const book = await SELECT.one.from(Books).where({ ID: bookId });
        if (!book) {
            req.error(404, `Book with ID ${bookId} not found`);
            return;
        }
        
        if (book.stock < quantity) {
            req.error(400, `Insufficient stock for book "${book.title}". Available: ${book.stock}, Requested: ${quantity}`);
            return;
        }
        
        // Get or create user's cart
        const cart = await CartUtils.getOrCreateCart(user, this.entities);
        
        // Check if book is already in cart
        const existingItem = await SELECT.one.from(MyShoppingCartItems)
            .where({ cart_ID: cart.ID, book_ID: bookId });
        
        let message;
        
        if (existingItem) {
            // Update existing item quantity
            const newQuantity = existingItem.quantity + quantity;
            
            if (newQuantity > book.stock) {
                req.error(400, `Cannot add ${quantity} more. Total would exceed available stock of ${book.stock}`);
                return;
            }
            
            if (newQuantity > 99) {
                req.error(400, 'Maximum quantity per item is 99');
                return;
            }
            
            await UPDATE(MyShoppingCartItems)
                .where({ ID: existingItem.ID })
                .with({ quantity: newQuantity });
            
            message = `Cart updated - "${book.title}" quantity increased to ${newQuantity}`;
        } else {
            // Add new item to cart
            await INSERT.into(MyShoppingCartItems).entries({
                cart_ID: cart.ID,
                book_ID: book.ID,
                quantity,
                createdBy: user
            });
            
            message = 'Book added to cart successfully';
        }
        
        // Calculate cart totals
        const totals = await CartUtils.calculateCartTotals(cart.ID, this.entities);
        
        return {
            success: true,
            message,
            cartItemCount: totals.cartItemCount,
            cartTotal: totals.cartTotal
        };
    }
    
    /**
     * Clear Cart handler - bound to MyShoppingCart entity
     */
    static async clearCart(req) {
        const cartId = req.params[0].ID; // The cart ID comes from the entity context
        const user = req.user.id;
        
        const { MyShoppingCart, MyShoppingCartItems } = this.entities;
        
        // Verify cart belongs to user
        const cart = await SELECT.one.from(MyShoppingCart)
            .where({ ID: cartId, createdBy: user, status: 'ACTIVE' });
        
        if (!cart) {
            req.error(404, 'Active cart not found');
            return;
        }
        
        // Delete all cart items
        await DELETE.from(MyShoppingCartItems).where({ cart_ID: cartId });
        
        return {
            success: true,
            message: 'Cart cleared successfully'
        };
    }
    
    /**
     * Remove from Cart handler - bound to MyShoppingCartItems entity
     */
    static async removeFromCart(req) {
        const itemId = req.params[1].ID; // The cart item ID comes from the nested path
        const user = req.user.id;
        
        const { MyShoppingCartItems } = this.entities;

        // Find cart item and verify it belongs to user through cart relationship
        const cartItem = await SELECT.one.from(MyShoppingCartItems)
            .columns('ID', 'cart_ID', 'cart.createdBy')
            .where({ ID: itemId });
        
        if (!cartItem) {
            req.error(404, 'Cart item not found');
            return;
        }
        
        // Verify the cart belongs to the current user
        if (cartItem.cart_createdBy !== user) {
            req.error(404, 'Cart item not found');
            return;
        }
        
        // Remove cart item
        await DELETE.from(MyShoppingCartItems).where({ ID: itemId });
        
        // Calculate cart totals
        const totals = await CartUtils.calculateCartTotals(cartItem.cart_ID, this.entities);
        
        return {
            success: true,
            message: 'Item removed from cart successfully',
            cartItemCount: totals.cartItemCount,
            cartTotal: totals.cartTotal
        };
    }
    
    /**
     * Update Cart Item handler - bound to MyShoppingCartItems entity
     */
    static async updateCartItem(req) {
        const { quantity } = req.data;
        const itemId = req.params[1].ID; // The cart item ID comes from the nested path
        const user = req.user.id;
        
        const { MyShoppingCartItems, Books } = this.entities;
        
        // Validate input
        if (!quantity) {
            req.error(400, 'Quantity is required');
            return;
        }
        
        if (quantity < 1 || quantity > 99) {
            req.error(400, 'Quantity must be between 1 and 99');
            return;
        }
        
        // Find cart item and verify it belongs to user through cart relationship
        const cartItem = await SELECT.one.from(MyShoppingCartItems)
            .columns('ID', 'cart_ID', 'book_ID', 'cart.createdBy')
            .where({ ID: itemId });
        
        if (!cartItem) {
            req.error(404, 'Cart item not found');
            return;
        }
        
        // Verify the cart belongs to the current user
        if (cartItem.cart_createdBy !== user) {
            req.error(404, 'Cart item not found');
            return;
        }
        
        // Check book stock
        const book = await SELECT.one.from(Books).where({ ID: cartItem.book_ID });
        if (!book) {
            req.error(404, 'Book not found');
            return;
        }
        
        if (book.stock < quantity) {
            req.error(400, `Insufficient stock for book "${book.title}". Available: ${book.stock}, Requested: ${quantity}`);
            return;
        }
        
        // Update cart item
        await UPDATE(MyShoppingCartItems)
            .where({ ID: itemId })
            .with({ quantity });
        
        // Calculate cart totals
        const totals = await CartUtils.calculateCartTotals(cartItem.cart_ID, this.entities);
        
        return {
            success: true,
            message: 'Cart item updated successfully',
            cartItemCount: totals.cartItemCount,
            cartTotal: totals.cartTotal
        };
    }
    
    /**
     * Get Cart Summary handler - bound to MyShoppingCart entity
     */
    static async getCartSummary(req) {
        const cartId = req.params[0].ID; // The cart ID comes from the entity context
        const user = req.user.id;
        
        const { MyShoppingCart, MyShoppingCartItems } = this.entities;
        
        // Verify cart belongs to user
        const cart = await SELECT.one.from(MyShoppingCart)
            .where({ ID: cartId, createdBy: user });
        
        if (!cart) {
            req.error(404, 'Cart not found');
            return;
        }
        
        // Get cart items with book details
        const cartItems = await SELECT.from(MyShoppingCartItems)
            .columns('ID', 'quantity', 'book_ID', 'book.title', 'book.author.name as authorName', 'book.price')
            .where({ cart_ID: cartId });
        
        if (cartItems.length === 0) {
            req.info('Your cart is empty.');
            return { success: true, message: 'Your cart is empty.' };
        }
        
        let totalItems = 0;
        let totalAmount = 0;
        let summaryText = 'Cart Summary:\n\n';
        
        cartItems.forEach(item => {
            const subtotal = item.book_price * item.quantity;
            totalItems += item.quantity;
            totalAmount += subtotal;
            
            summaryText += `• ${item.book_title} by ${item.authorName}\n`;
            summaryText += `  Quantity: ${item.quantity} × $${Number.parseFloat(item.book_price).toFixed(2)} = $${Number.parseFloat(subtotal).toFixed(2)}\n\n`;
        });
        
        summaryText += `Total Items: ${totalItems}\n`;
        summaryText += `Total Amount: $${Number.parseFloat(totalAmount).toFixed(2)}`;
        
        // Use req.info to display the summary as a message to the user
        req.info(summaryText);
        
        return {
            success: true,
            message: `Cart contains ${totalItems} items with total amount $${totalAmount.toFixed(2)}`
        };
    }
}

module.exports = CartHandlers;
