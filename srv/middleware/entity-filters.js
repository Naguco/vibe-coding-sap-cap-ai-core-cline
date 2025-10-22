const cds = require('@sap/cds');

/**
 * Entity Filtering Middleware
 * Provides reusable filtering patterns for user context and authorization
 */
class EntityFilters {
    
    /**
     * Register all entity filter middleware with the service
     * @param {Object} service - CAP service instance
     */
    static register(service) {
        // Register entity filtering middleware
        EntityFilters.registerUserContextFilters(service);
        EntityFilters.registerVirtualFieldCalculations(service);
        EntityFilters.registerTransactionalEntityProtection(service);
    }
    
    /**
     * Register user context filtering for all user-specific entities
     * @param {Object} service - CAP service instance
     */
    static registerUserContextFilters(service) {
        // Direct user filtering for entities with createdBy field
        service.before('READ', 'MyOrders', (req) => {
            req.query.where({ createdBy: req.user.id });
        });
        
        service.before('READ', 'MyReviews', (req) => {
            req.query.where({ createdBy: req.user.id });
        });
        
        service.before('READ', 'MyReturns', (req) => {
            req.query.where({ createdBy: req.user.id });
        });

        // Shopping cart filtering (active carts only)
        service.before('READ', 'MyShoppingCart', (req) => {
            req.query.where({ createdBy: req.user.id, status: 'ACTIVE' });
        });

        // Related entity filtering for order items (through order ownership)
        service.before('READ', 'MyOrderItems', async (req) => {
            const { MyOrders } = service.entities;
            
            // Filter order items by user's orders
            const userOrders = await SELECT.from(MyOrders)
                .columns('ID')
                .where({ createdBy: req.user.id });
            
            const orderIds = userOrders.map(order => order.ID);
            if (orderIds.length > 0) {
                req.query.where({ order_ID: { in: orderIds } });
            } else {
                req.query.where({ order_ID: null }); // No results if user has no orders
            }
        });

        // Related entity filtering for cart items (through cart ownership)
        service.before('READ', 'MyShoppingCartItems', async (req) => {
            const { MyShoppingCart } = service.entities;
            
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
    }
    
    /**
     * Register virtual field calculations for enhanced entity data
     * @param {Object} service - CAP service instance
     */
    static registerVirtualFieldCalculations(service) {
        const CartUtils = require('../utils/cart-utils');
        
        // Virtual field calculations for shopping cart
        service.after('READ', 'MyShoppingCart', async (results, req) => {
            if (!Array.isArray(results)) {
                results = [results];
            }

            for (const cart of results) {
                if (cart) {
                    const totals = await CartUtils.calculateCartTotals(cart.ID, service.entities);
                    cart.totalItems = totals.cartItemCount;
                    cart.totalAmount = totals.cartTotal;
                }
            }
        });

        // Virtual field calculations for shopping cart items
        service.after('READ', 'MyShoppingCartItems', async (results, req) => {
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
    }
    
    /**
     * Register protection for transactional entities to prevent direct modification
     * @param {Object} service - CAP service instance
     */
    static registerTransactionalEntityProtection(service) {
        // Prevent direct creation/update/delete of orders (use actions instead)
        service.before('CREATE', 'MyOrders', (req) => {
            req.error(403, 'Orders must be created through the purchaseBooks action');
        });
        
        service.before('UPDATE', 'MyOrders', (req) => {
            req.error(403, 'Orders cannot be modified by customers');
        });
        
        service.before('DELETE', 'MyOrders', (req) => {
            req.error(403, 'Orders cannot be deleted by customers');
        });
        
        // Prevent direct creation/update/delete of returns (use actions instead)
        service.before('CREATE', 'MyReturns', (req) => {
            req.error(403, 'Returns must be created through the requestReturn action');
        });
        
        service.before('UPDATE', 'MyReturns', (req) => {
            req.error(403, 'Return requests cannot be modified after submission');
        });
        
        service.before('DELETE', 'MyReturns', (req) => {
            req.error(403, 'Return requests cannot be deleted');
        });
    }
}

module.exports = EntityFilters;
