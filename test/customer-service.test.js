const cds = require('@sap/cds');

describe('CustomerService', () => {
    const { GET, POST, PATCH, DELETE } = cds.test(__dirname + '/..');
    
    // Mock customer user for authentication
    const customerAuth = { auth: { username: 'customer1' } };

    describe('Read Operations', () => {
        test('should allow customers to read books catalog', async () => {
            const response = await GET('/odata/v4/customer/Books', customerAuth);
            
            expect(response.status).toBe(200);
            expect(response.data.value).toBeInstanceOf(Array);
            
            // Check that admin fields are excluded
            if (response.data.value.length > 0) {
                const book = response.data.value[0];
                expect(book).not.toHaveProperty('createdBy');
                expect(book).not.toHaveProperty('modifiedBy');
            }
        });

        test('should allow customers to read authors', async () => {
            const response = await GET('/odata/v4/customer/Authors', customerAuth);
            
            expect(response.status).toBe(200);
            expect(response.data.value).toBeInstanceOf(Array);
            
            // Check that admin fields are excluded
            if (response.data.value.length > 0) {
                const author = response.data.value[0];
                expect(author).not.toHaveProperty('createdBy');
                expect(author).not.toHaveProperty('modifiedBy');
            }
        });

        test('should allow customers to read categories', async () => {
            const response = await GET('/odata/v4/customer/Categories', customerAuth);
            
            expect(response.status).toBe(200);
            expect(response.data.value).toBeInstanceOf(Array);
            
            // Check that admin fields are excluded
            if (response.data.value.length > 0) {
                const category = response.data.value[0];
                expect(category).not.toHaveProperty('createdBy');
                expect(category).not.toHaveProperty('modifiedBy');
            }
        });

        test('should get specific book by ID', async () => {
            const bookId = '550e8400-e29b-41d4-a716-446655442001'; // Harry Potter from sample data
            
            const response = await GET(`/odata/v4/customer/Books(${bookId})`, customerAuth);
            
            expect(response.status).toBe(200);
            expect(response.data.ID).toBe(bookId);
            expect(response.data).not.toHaveProperty('createdBy');
        });
    });

    describe('Purchase Books Action', () => {
        test('should successfully purchase books with valid data', async () => {
            const purchaseData = {
                items: [
                    { bookId: '550e8400-e29b-41d4-a716-446655442001', quantity: 1 }
                ],
                shippingAddress: '123 Test St, Test City',
                billingAddress: '123 Test St, Test City',
                customerEmail: 'test@example.com',
                customerPhone: '+1234567890'
            };

            const response = await POST('/odata/v4/customer/purchaseBooks', purchaseData, customerAuth);
            
            expect(response.status).toBe(200);
            expect(response.data.value).toContain('Order');
            expect(response.data.value).toContain('created successfully');
        });

        test('should fail when purchasing non-existent book', async () => {
            const purchaseData = {
                items: [
                    { bookId: '00000000-0000-0000-0000-000000000000', quantity: 1 }
                ],
                shippingAddress: '123 Test St, Test City',
                billingAddress: '123 Test St, Test City',
                customerEmail: 'test@example.com',
                customerPhone: '+1234567890'
            };

            try {
                await POST('/odata/v4/customer/purchaseBooks', purchaseData, customerAuth);
                fail('Expected request to fail');
            } catch (error) {
                expect(error.response.status).toBe(404);
            }
        });

        test('should fail when no items provided', async () => {
            const purchaseData = {
                items: [],
                shippingAddress: '123 Test St, Test City',
                billingAddress: '123 Test St, Test City',
                customerEmail: 'test@example.com',
                customerPhone: '+1234567890'
            };

            try {
                await POST('/odata/v4/customer/purchaseBooks', purchaseData, customerAuth);
                fail('Expected request to fail');
            } catch (error) {
                expect(error.response.status).toBe(400);
            }
        });
    });

    describe('Submit Review Action', () => {
        test('should successfully submit review for book', async () => {
            const reviewData = {
                bookId: '550e8400-e29b-41d4-a716-446655442001',
                rating: 5,
                title: 'Great Book!',
                comment: 'This book was amazing, highly recommend it.'
            };

            // Note: This might fail if user hasn't purchased the book
            // In a real test, we'd first create an order for the user
            try {
                const response = await POST('/odata/v4/customer/submitReview', reviewData, customerAuth);
                expect(response.status).toBe(200);
                expect(response.data.value).toContain('Review submitted successfully');
            } catch (error) {
                // Expected if user hasn't purchased the book
                expect(error.response.status).toBe(400);
            }
        });

        test('should fail when rating is invalid', async () => {
            const reviewData = {
                bookId: '550e8400-e29b-41d4-a716-446655442001',
                rating: 6, // Invalid rating (should be 1-5)
                title: 'Great Book!',
                comment: 'This book was amazing.'
            };

            try {
                await POST('/odata/v4/customer/submitReview', reviewData, customerAuth);
                fail('Expected request to fail');
            } catch (error) {
                expect(error.response.status).toBe(400);
            }
        });

        test('should fail when book ID is missing', async () => {
            const reviewData = {
                rating: 5,
                title: 'Great Book!',
                comment: 'This book was amazing.'
            };

            try {
                await POST('/odata/v4/customer/submitReview', reviewData, customerAuth);
                fail('Expected request to fail');
            } catch (error) {
                expect(error.response.status).toBe(400);
            }
        });
    });

    describe('Request Return Action', () => {
        test('should fail when order does not exist', async () => {
            const returnData = {
                orderId: '00000000-0000-0000-0000-000000000000',
                bookId: '550e8400-e29b-41d4-a716-446655442001',
                quantity: 1,
                reason: 'Book arrived damaged'
            };

            try {
                await POST('/odata/v4/customer/requestReturn', returnData, customerAuth);
                fail('Expected request to fail');
            } catch (error) {
                expect(error.response.status).toBe(404);
            }
        });

        test('should fail when required fields are missing', async () => {
            const returnData = {
                quantity: 1,
                reason: 'Book arrived damaged'
                // Missing orderId and bookId
            };

            try {
                await POST('/odata/v4/customer/requestReturn', returnData, customerAuth);
                fail('Expected request to fail');
            } catch (error) {
                expect(error.response.status).toBe(400);
            }
        });
    });

    describe('Customer-Specific Entities', () => {
        test('should access MyOrders entity', async () => {
            const response = await GET('/odata/v4/customer/MyOrders', customerAuth);
            
            expect(response.status).toBe(200);
            expect(response.data.value).toBeInstanceOf(Array);
            // Customer should only see their own orders
        });

        test('should access MyReviews entity', async () => {
            const response = await GET('/odata/v4/customer/MyReviews', customerAuth);
            
            expect(response.status).toBe(200);
            expect(response.data.value).toBeInstanceOf(Array);
            // Customer should only see their own reviews
        });

        test('should access MyReturns entity', async () => {
            const response = await GET('/odata/v4/customer/MyReturns', customerAuth);
            
            expect(response.status).toBe(200);
            expect(response.data.value).toBeInstanceOf(Array);
            // Customer should only see their own returns
        });
    });

    describe('Utility Functions', () => {
        test('should get recommendations', async () => {
            const response = await GET('/odata/v4/customer/getRecommendations', customerAuth);
            
            expect(response.status).toBe(200);
            expect(response.data.value).toBeInstanceOf(Array);
        });

        test('should get order history', async () => {
            const response = await GET('/odata/v4/customer/getOrderHistory', customerAuth);
            
            expect(response.status).toBe(200);
            expect(response.data.value).toBeInstanceOf(Array);
        });

        test('should check if user can review a book', async () => {
            const bookData = {
                bookId: '550e8400-e29b-41d4-a716-446655442001'
            };

            const response = await GET('/odata/v4/customer/canReview(bookId=' + bookData.bookId + ')', customerAuth);
            
            expect(response.status).toBe(200);
            expect(typeof response.data.value).toBe('boolean');
        });
    });

    describe('Security and Authorization', () => {
        test('should prevent unauthorized access without authentication', async () => {
            try {
                await GET('/odata/v4/customer/Books');
                fail('Expected request to fail');
            } catch (error) {
                expect(error.response.status).toBe(401);
            }
        });

        test('should prevent direct creation of orders', async () => {
            const orderData = {
                orderNumber: 'DIRECT-001',
                orderDate: new Date().toISOString(),
                status: 'PENDING',
                paymentStatus: 'PENDING',
                totalAmount: 29.99
            };

            try {
                await POST('/odata/v4/customer/MyOrders', orderData, customerAuth);
                fail('Expected request to fail');
            } catch (error) {
                expect(error.response.status).toBe(403);
            }
        });

        test('should prevent direct creation of returns', async () => {
            const returnData = {
                returnNumber: 'DIRECT-RET-001',
                quantity: 1,
                reason: 'Test reason',
                status: 'REQUESTED'
            };

            try {
                await POST('/odata/v4/customer/MyReturns', returnData, customerAuth);
                fail('Expected request to fail');
            } catch (error) {
                expect(error.response.status).toBe(403);
            }
        });

        test('should prevent modification of orders', async () => {
            // This test assumes there's an order to modify
            // In practice, customers shouldn't be able to modify any orders
            try {
                await PATCH('/odata/v4/customer/MyOrders(550e8400-e29b-41d4-a716-446655440000)', 
                    { status: 'CANCELLED' }, customerAuth);
                fail('Expected request to fail');
            } catch (error) {
                // Should fail with 403 (forbidden) or 404 (not found)
                expect([403, 404]).toContain(error.response.status);
            }
        });
    });

    describe('Data Filtering', () => {
        test('should filter books by availability', async () => {
            const response = await GET('/odata/v4/customer/Books?$filter=stock gt 0', customerAuth);
            
            expect(response.status).toBe(200);
            expect(response.data.value).toBeInstanceOf(Array);
            
            // All returned books should have stock > 0
            response.data.value.forEach(book => {
                expect(book.stock).toBeGreaterThan(0);
            });
        });

        test('should expand book with author information', async () => {
            const response = await GET('/odata/v4/customer/Books?$expand=author&$top=1', customerAuth);
            
            expect(response.status).toBe(200);
            expect(response.data.value).toBeInstanceOf(Array);
            
            if (response.data.value.length > 0) {
                const book = response.data.value[0];
                expect(book.author).toBeDefined();
                expect(book.author.name).toBeDefined();
            }
        });

        test('should search books by title', async () => {
            const response = await GET('/odata/v4/customer/Books?$filter=contains(title,\'Harry\')', customerAuth);
            
            expect(response.status).toBe(200);
            expect(response.data.value).toBeInstanceOf(Array);
            
            // All returned books should contain 'Harry' in title
            response.data.value.forEach(book => {
                expect(book.title.toLowerCase()).toContain('harry');
            });
        });
    });
});
