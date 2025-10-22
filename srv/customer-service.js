const cds = require('@sap/cds');
const CartUtils = require('./utils/cart-utils');
const CartHandlers = require('./handlers/customer/cart-handlers');

module.exports = cds.service.impl(async function() {
    
    const { Books, MyOrders, MyOrderItems, MyReviews, MyReturns, MyShoppingCart, MyShoppingCartItems } = this.entities;

    // Get the underlying database service to access DiscountCodes without exposing it to customers
    const db = await cds.connect.to('db');
    const { DiscountCodes } = db.entities('bookstore');
    
    // Register cart handlers
    CartHandlers.register(this);
    
    // Action: Purchase Books
    this.on('purchaseBooks', async (req) => {
        const { items, discountCode, shippingAddress, billingAddress, customerEmail, customerPhone } = req.data;
        const user = req.user.id;
        
        if (!items || items.length === 0) {
            req.error(400, 'No items provided for purchase');
            return;
        }
        
        let originalAmount = 0;
        const orderItems = [];
        
        // Validate items and calculate original total
        for (const item of items) {
            const book = await SELECT.one.from(Books).where({ ID: item.bookId });
            if (!book) {
                req.error(404, `Book with ID ${item.bookId} not found`);
                return;
            }
            
            if (book.stock < item.quantity) {
                req.error(400, `Insufficient stock for book "${book.title}". Available: ${book.stock}, Requested: ${item.quantity}`);
                return;
            }
            
            const itemTotal = book.price * item.quantity;
            originalAmount += itemTotal;
            
            orderItems.push({
                book_ID: item.bookId,
                quantity: item.quantity,
                unitPrice: book.price,
                totalPrice: itemTotal
            });
        }
        
        // Round original amount to 2 decimal places
        originalAmount = Math.round(originalAmount * 100) / 100;
        
        // Apply discount if provided
        let discountAmount = 0;
        let finalAmount = originalAmount;
        let appliedDiscountCode = null;
        let discountMessage = '';
        let discountCodeId = null;
        
        if (discountCode) {
            const discountValidation = await this.send('validateDiscountCode', {
                discountCode, 
                orderTotal: originalAmount
            });
            
            if (discountValidation.isValid) {
                discountAmount = discountValidation.discountAmount;
                finalAmount = discountValidation.finalAmount;
                appliedDiscountCode = discountCode;
                discountMessage = ` with ${discountCode} discount applied (saved $${discountAmount.toFixed(2)})`;
                
                // Update discount usage counter
                await UPDATE(DiscountCodes)
                    .where({ code: discountCode })
                    .with({ usedCount: { '+=': 1 } });

                discountCodeId = await SELECT.one.from(DiscountCodes).where({ code: discountCode });
            }
        }
        
        // Generate order number
        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        
        // Create order
        const order = await INSERT.into(MyOrders).entries({
            orderNumber,
            orderDate: new Date(),
            status: 'PENDING',
            paymentStatus: 'PENDING',
            originalAmount,
            discountAmount,
            totalAmount: finalAmount,
            appliedDiscountCode: discountCodeId,
            shippingAddress,
            billingAddress,
            customerEmail,
            customerPhone,
            createdBy: user
        });
        
        // Create order items and update stock
        for (const orderItem of orderItems) {
            orderItem.order_ID = order.ID;
            await INSERT.into(MyOrderItems).entries(orderItem);
            
            // Update book stock
            await UPDATE(Books).where({ ID: orderItem.book_ID }).with({
                stock: { '-=': orderItem.quantity }
            });
        }
        
        return `Order ${orderNumber} created successfully with total amount $${finalAmount.toFixed(2)}${discountMessage}`;
    });
    
    // Action: Submit Review
    this.on('submitReview', async (req) => {
        const { bookId, rating, title, comment } = req.data;
        const user = req.user.id;
        
        if (!bookId || !rating) {
            req.error(400, 'Book ID and rating are required');
            return;
        }
        
        if (rating < 1 || rating > 5) {
            req.error(400, 'Rating must be between 1 and 5');
            return;
        }
        
        // Check if book exists
        const book = await SELECT.one.from(Books).where({ ID: bookId });
        if (!book) {
            req.error(404, `Book with ID ${bookId} not found`);
            return;
        }
        
        // Check if user has already reviewed this book
        const existingReview = await SELECT.from(MyReviews)
            .where({ book_ID: bookId, createdBy: user });
        
        if (existingReview.length > 0) {
            req.error(400, 'You have already reviewed this book');
            return;
        }
        
        // Check if user has purchased this book (verified purchase)
        const hasPurchased = await SELECT.from(MyOrderItems)
            .columns('ID')
            .where({ 
                book_ID: bookId,
                'order.createdBy': user,
                'order.status': { in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'] }
            });
        
        // Create review
        await INSERT.into(MyReviews).entries({
            book_ID: bookId,
            rating,
            title,
            comment,
            isVerifiedPurchase: hasPurchased.length > 0,
            createdBy: user
        });
        
        return `Review submitted successfully for "${book.title}"`;
    });
    
    // Action: Request Return
    this.on('requestReturn', async (req) => {
        const { orderId, bookId, quantity, reason } = req.data;
        const user = req.user.id;
        
        if (!orderId || !bookId || !quantity || !reason) {
            req.error(400, 'Order ID, Book ID, quantity, and reason are required');
        }
        
        // Verify order belongs to user and find the order item
        const orderItem = await SELECT.from(MyOrderItems)
            .where({ 
                order_ID: orderId,
                book_ID: bookId,
                'order.createdBy': user
            });
        
        if (orderItem.length === 0) {
            req.error(404, 'Order item not found or does not belong to you');
            return;
        }
        
        const item = orderItem[0];
        
        if (quantity > item.quantity) {
            req.error(400, `Cannot return more items than purchased. Purchased: ${item.quantity}, Requested: ${quantity}`);
            return;
        }
        
        // Check if order is eligible for return
        const order = await SELECT.one.from(MyOrders).where({ ID: orderId });
        if (!['DELIVERED'].includes(order.status)) {
            req.error(400, 'Order must be delivered before requesting a return');
            return;
        }
        
        // Check return timeframe (30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        if (new Date(order.orderDate) < thirtyDaysAgo) {
            req.error(400, 'Return request must be made within 30 days of order date');
            return;
        }
        
        // Generate return number
        const returnNumber = `RET-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        
        // Calculate refund amount
        const refundAmount = item.unitPrice * quantity;
        
        // Create return request
        await INSERT.into(MyReturns).entries({
            returnNumber,
            order_ID: orderId,
            book_ID: bookId,
            quantity,
            reason,
            status: 'REQUESTED',
            requestDate: new Date(),
            refundAmount,
            createdBy: user
        });
        
        return `Return request ${returnNumber} submitted successfully. Refund amount: ${refundAmount}`;
    });
    
    // Action: Validate Discount Code
    this.on('validateDiscountCode', async (req) => {



        const { discountCode, orderTotal } = req.data;
        
        if (!discountCode || orderTotal === undefined) {
            return {
                isValid: false,
                discountAmount: 0,
                finalAmount: orderTotal || 0,
                message: 'Discount code and order total are required'
            };
        }
        
        // Find the discount code (case-sensitive)
        const discount = await SELECT.one.from(DiscountCodes)
            .where({ code: discountCode });
        
        if (!discount) {
            return {
                isValid: false,
                discountAmount: 0,
                finalAmount: orderTotal,
                message: 'Invalid discount code'
            };
        }
        
        // Check if discount is active
        if (!discount.isActive) {
            return {
                isValid: false,
                discountAmount: 0,
                finalAmount: orderTotal,
                message: 'Discount code is inactive'
            };
        }
        
        // Check date validity
        const now = new Date();
        const validFrom = new Date(discount.validFrom);
        const validTo = new Date(discount.validTo);
        
        if (now < validFrom || now > validTo) {
            return {
                isValid: false,
                discountAmount: 0,
                finalAmount: orderTotal,
                message: 'Discount code has expired'
            };
        }
        
        // Check minimum order amount
        if (orderTotal < discount.minOrderAmount) {
            return {
                isValid: false,
                discountAmount: 0,
                finalAmount: orderTotal,
                message: `Minimum order amount of $${discount.minOrderAmount.toFixed(2)} required for this discount code`
            };
        }
        
        // Check usage limit
        if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
            return {
                isValid: false,
                discountAmount: 0,
                finalAmount: orderTotal,
                message: 'Discount code usage limit exceeded'
            };
        }
        
        // Calculate discount amount
        let discountAmount = 0;
        
        if (discount.discountType === 'PERCENTAGE') {
            discountAmount = (orderTotal * discount.discountValue) / 100;
            
            // Apply maximum discount cap if specified
            if (discount.maxDiscount && discountAmount > discount.maxDiscount) {
                discountAmount = discount.maxDiscount;
            }
        } else if (discount.discountType === 'FIXED_AMOUNT') {
            discountAmount = discount.discountValue;
            
            // Ensure discount doesn't exceed order total
            if (discountAmount > orderTotal) {
                discountAmount = orderTotal;
            }
        }
        
        // Round to 2 decimal places
        discountAmount = Math.round(discountAmount * 100) / 100;
        const finalAmount = orderTotal - discountAmount;
        
        return {
            isValid: true,
            discountType: discount.discountType,
            discountValue: discount.discountValue,
            discountAmount,
            finalAmount,
            message: 'Discount code is valid'
        };
    });
    
    // Action: Calculate Order Total
    this.on('calculateOrderTotal', async (req) => {
        const { items, discountCode } = req.data;
        
        if (!items || items.length === 0) {
            return {
                originalAmount: 0,
                discountAmount: 0,
                totalAmount: 0,
                isValidDiscount: false
            };
        }
        
        // Calculate original total
        let originalAmount = 0;
        
        for (const item of items) {
            const book = await SELECT.one.from(Books).where({ ID: item.bookId });
            if (!book) {
                continue; // Skip non-existent books
            }
            
            originalAmount += book.price * item.quantity;
        }
        
        // Round to 2 decimal places
        originalAmount = Math.round(originalAmount * 100) / 100;
        
        // If no discount code provided, return original amounts
        if (!discountCode) {
            return {
                originalAmount,
                discountAmount: 0,
                totalAmount: originalAmount,
                isValidDiscount: false
            };
        }
        
        // Validate discount code
        const discountValidation = await this.send('validateDiscountCode', {
            discountCode, 
            orderTotal: originalAmount
        });
        
        if (discountValidation.isValid) {
            return {
                originalAmount,
                discountAmount: discountValidation.discountAmount,
                totalAmount: discountValidation.finalAmount,
                isValidDiscount: true
            };
        } else {
            return {
                originalAmount,
                discountAmount: 0,
                totalAmount: originalAmount,
                isValidDiscount: false
            };
        }
    });
    
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

    // SHOPPING CART ACTIONS
    // Note: addToCart handler moved to CartHandlers.js and registered above

    // Action: Update Cart Item (bound to MyShoppingCartItems)
    this.on('updateCartItem', 'MyShoppingCartItems', async (req) => {
        const { quantity } = req.data;
        const itemId = req.params[1].ID; // The cart item ID comes from the nested path
        const user = req.user.id;
        
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
    });

    // Action: Remove from Cart (bound to MyShoppingCartItems)
    this.on('removeFromCart', 'MyShoppingCartItems', async (req) => {
        const itemId = req.params[1].ID; // The cart item ID comes from the nested path
        const user = req.user.id;

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
    });

    // Action: Clear Cart (bound to MyShoppingCart)
    this.on('clearCart', 'MyShoppingCart', async (req) => {
        const cartId = req.params[0].ID; // The cart ID comes from the entity context
        const user = req.user.id;
        
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
    });

    // Action: Get Cart Summary (bound to MyShoppingCart)
    this.on('getCartSummary', 'MyShoppingCart', async (req) => {
        const cartId = req.params[0].ID; // The cart ID comes from the entity context
        const user = req.user.id;
        
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
