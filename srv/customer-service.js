const cds = require('@sap/cds');
const CartUtils = require('./utils/cart-utils');
const CartHandlers = require('./handlers/customer/cart-handlers');
const OrderHandlers = require('./handlers/customer/order-handlers');
const RecommendationHandlers = require('./handlers/customer/recommendation-handlers');
const EntityFilters = require('./middleware/entity-filters');

module.exports = cds.service.impl(async function() {
    
    const { Books, MyOrders, MyOrderItems, MyReviews, MyReturns, MyShoppingCart, MyShoppingCartItems } = this.entities;

    // Get the underlying database service to access DiscountCodes without exposing it to customers
    const db = await cds.connect.to('db');
    const { DiscountCodes } = db.entities('bookstore');
    
    // Register modular handlers and middleware
    CartHandlers.register(this);
    OrderHandlers.register(this);
    RecommendationHandlers.register(this);
    EntityFilters.register(this);
});
