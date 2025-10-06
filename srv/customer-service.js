const cds = require('@sap/cds');

module.exports = cds.service.impl(async function() {
    
    const { Books, MyOrders, MyOrderItems, MyReviews, MyReturns } = this.entities;
    
    // Action: Purchase Books
    this.on('purchaseBooks', async (req) => {
        const { items, shippingAddress, billingAddress, customerEmail, customerPhone } = req.data;
        const user = req.user.id;
        
        if (!items || items.length === 0) {
            req.error(400, 'No items provided for purchase');
            return;
        }
        
        let totalAmount = 0;
        const orderItems = [];
        
        // Validate items and calculate total
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
            totalAmount += itemTotal;
            
            orderItems.push({
                book_ID: item.bookId,
                quantity: item.quantity,
                unitPrice: book.price,
                totalPrice: itemTotal
            });
        }
        
        // Generate order number
        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        
        // Create order
        const order = await INSERT.into(MyOrders).entries({
            orderNumber,
            orderDate: new Date(),
            status: 'PENDING',
            paymentStatus: 'PENDING',
            originalAmount: totalAmount,    // New required field
            discountAmount: 0,              // New field - no discount for now
            totalAmount,                    // Final amount after discount
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
        
        return `Order ${orderNumber} created successfully with total amount ${totalAmount}`;
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
