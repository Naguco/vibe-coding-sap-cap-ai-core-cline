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
}

module.exports = CartHandlers;
