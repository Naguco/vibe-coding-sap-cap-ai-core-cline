const cds = require('@sap/cds');

/**
 * Order Processing Action Handlers
 * Extracted handlers for order-related operations
 */
class OrderHandlers {
    
    /**
     * Register all order handlers with the service
     * @param {Object} service - CAP service instance
     */
    static register(service) {
        // Register order processing handlers
        service.on('purchaseBooks', OrderHandlers.purchaseBooks.bind(service));
        service.on('submitReview', OrderHandlers.submitReview.bind(service));
        service.on('requestReturn', OrderHandlers.requestReturn.bind(service));
        service.on('validateDiscountCode', OrderHandlers.validateDiscountCode.bind(service));
        service.on('calculateOrderTotal', OrderHandlers.calculateOrderTotal.bind(service));
    }
    
    /**
     * Purchase Books Action Handler
     * Handles direct book purchases with discount code support
     */
    static async purchaseBooks(req) {
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
            const book = await SELECT.one.from(this.entities.Books).where({ ID: item.bookId });
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
                
                // Get the underlying database service to access DiscountCodes
                const db = await cds.connect.to('db');
                const { DiscountCodes } = db.entities('bookstore');
                
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
        const order = await INSERT.into(this.entities.MyOrders).entries({
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
            await INSERT.into(this.entities.MyOrderItems).entries(orderItem);
            
            // Update book stock
            await UPDATE(this.entities.Books).where({ ID: orderItem.book_ID }).with({
                stock: { '-=': orderItem.quantity }
            });
        }
        
        return `Order ${orderNumber} created successfully with total amount $${finalAmount.toFixed(2)}${discountMessage}`;
    }
    
    /**
     * Submit Review Action Handler
     * Handles book review submissions with verified purchase checking
     */
    static async submitReview(req) {
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
        const book = await SELECT.one.from(this.entities.Books).where({ ID: bookId });
        if (!book) {
            req.error(404, `Book with ID ${bookId} not found`);
            return;
        }
        
        // Check if user has already reviewed this book
        const existingReview = await SELECT.from(this.entities.MyReviews)
            .where({ book_ID: bookId, createdBy: user });
        
        if (existingReview.length > 0) {
            req.error(400, 'You have already reviewed this book');
            return;
        }
        
        // Check if user has purchased this book (verified purchase)
        const hasPurchased = await SELECT.from(this.entities.MyOrderItems)
            .columns('ID')
            .where({ 
                book_ID: bookId,
                'order.createdBy': user,
                'order.status': { in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'] }
            });
        
        // Create review
        await INSERT.into(this.entities.MyReviews).entries({
            book_ID: bookId,
            rating,
            title,
            comment,
            isVerifiedPurchase: hasPurchased.length > 0,
            createdBy: user
        });
        
        return `Review submitted successfully for "${book.title}"`;
    }
    
    /**
     * Request Return Action Handler
     * Handles return requests for delivered orders within 30-day window
     */
    static async requestReturn(req) {
        const { orderId, bookId, quantity, reason } = req.data;
        const user = req.user.id;
        
        if (!orderId || !bookId || !quantity || !reason) {
            req.error(400, 'Order ID, Book ID, quantity, and reason are required');
        }
        
        // Verify order belongs to user and find the order item
        const orderItem = await SELECT.from(this.entities.MyOrderItems)
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
        const order = await SELECT.one.from(this.entities.MyOrders).where({ ID: orderId });
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
        await INSERT.into(this.entities.MyReturns).entries({
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
    }
    
    /**
     * Validate Discount Code Action Handler
     * Validates discount codes and calculates discount amounts
     */
    static async validateDiscountCode(req) {
        const { discountCode, orderTotal } = req.data;
        
        if (!discountCode || orderTotal === undefined) {
            return {
                isValid: false,
                discountAmount: 0,
                finalAmount: orderTotal || 0,
                message: 'Discount code and order total are required'
            };
        }
        
        // Get the underlying database service to access DiscountCodes
        const db = await cds.connect.to('db');
        const { DiscountCodes } = db.entities('bookstore');
        
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
    }
    
    /**
     * Calculate Order Total Action Handler
     * Calculates order totals with optional discount code validation
     */
    static async calculateOrderTotal(req) {
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
            const book = await SELECT.one.from(this.entities.Books).where({ ID: item.bookId });
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
    }
}

module.exports = OrderHandlers;
