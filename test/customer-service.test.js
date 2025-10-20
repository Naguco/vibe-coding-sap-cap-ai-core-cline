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

    describe('Discount Code Functionality', () => {
        // Create fresh discount codes before running discount tests
        beforeAll(async () => {
            const adminAuth = { auth: { username: 'alice' } };
            
            // Create test discount codes with current dates
            const currentDate = new Date();
            const validFrom = new Date(currentDate.getFullYear(), 0, 1); // January 1st of current year
            const validTo = new Date(currentDate.getFullYear(), 11, 31); // December 31st of current year
            
            const testDiscountCodes = [
                {
                    ID: '550e8400-e29b-41d4-a716-446655440001',
                    code: 'SAVE10-NEW',
                    description: '10% off your order',
                    discountType: 'PERCENTAGE',
                    discountValue: 10.00,
                    minOrderAmount: 25.00,
                    maxDiscount: 50.00,
                    validFrom: validFrom.toISOString(),
                    validTo: validTo.toISOString(),
                    isActive: true,
                    usageLimit: 500,
                    usedCount: 15
                },
                {
                    ID: '550e8400-e29b-41d4-a716-446655440002',
                    code: 'WELCOME20-NEW',
                    description: 'Welcome discount - 20% off',
                    discountType: 'PERCENTAGE',
                    discountValue: 20.00,
                    minOrderAmount: 50.00,
                    maxDiscount: 100.00,
                    validFrom: validFrom.toISOString(),
                    validTo: validTo.toISOString(),
                    isActive: true,
                    usageLimit: 1000,
                    usedCount: 87
                },
                {
                    ID: '550e8400-e29b-41d4-a716-446655440003',
                    code: 'FLAT5-NEW',
                    description: '$5 off any order',
                    discountType: 'FIXED_AMOUNT',
                    discountValue: 5.00,
                    minOrderAmount: 20.00,
                    maxDiscount: null,
                    validFrom: validFrom.toISOString(),
                    validTo: validTo.toISOString(),
                    isActive: true,
                    usageLimit: null,
                    usedCount: 32
                },
                {
                    ID: '550e8400-e29b-41d4-a716-446655440004',
                    code: 'STUDENT15-NEW',
                    description: 'Student discount - 15% off',
                    discountType: 'PERCENTAGE',
                    discountValue: 15.00,
                    minOrderAmount: 30.00,
                    maxDiscount: 75.00,
                    validFrom: validFrom.toISOString(),
                    validTo: validTo.toISOString(),
                    isActive: true,
                    usageLimit: 200,
                    usedCount: 45
                },
                {
                    ID: '550e8400-e29b-41d4-a716-446655440005',
                    code: 'EXPIRED10-NEW',
                    description: 'Expired 10% discount code',
                    discountType: 'PERCENTAGE',
                    discountValue: 10.00,
                    minOrderAmount: 25.00,
                    maxDiscount: 50.00,
                    validFrom: new Date(currentDate.getFullYear() - 2, 0, 1).toISOString(), // 2 years ago
                    validTo: new Date(currentDate.getFullYear() - 1, 11, 31).toISOString(), // Last year
                    isActive: true,
                    usageLimit: 100,
                    usedCount: 89
                }
            ];
            
            // Delete existing test discount codes and create new ones
            for (const discountCode of testDiscountCodes) {
                try {
                    // Try to delete existing code first (ignore if it doesn't exist)
                    await DELETE(`/odata/v4/admin/DiscountCodes(${discountCode.ID})`, adminAuth);
                } catch (error) {
                    // Ignore delete errors - code might not exist
                }
                
                // Create the new discount code
                await POST('/odata/v4/admin/DiscountCodes', discountCode, adminAuth);
            }
        });
        
        describe('validateDiscountCode Action', () => {
            test('should validate active discount code SAVE10', async () => {
                const discountData = {
                    discountCode: 'SAVE10-NEW',
                    orderTotal: 30.00
                };

                const response = await POST('/odata/v4/customer/validateDiscountCode', discountData, customerAuth);
                
                expect(response.status).toBe(200);

                expect(response.data).toEqual({
                    "@odata.context": "$metadata#CustomerService.return_CustomerService_validateDiscountCode",
                    isValid: true,
                    discountType: 'PERCENTAGE',
                    discountValue: 10.00,
                    discountAmount: 3.00,
                    finalAmount: 27.00,
                    message: 'Discount code is valid'
                });
            });

            test('should validate fixed amount discount code FLAT5', async () => {
                const discountData = {
                    discountCode: 'FLAT5-NEW',
                    orderTotal: 25.00
                };

                const response = await POST('/odata/v4/customer/validateDiscountCode', discountData, customerAuth);
                
                expect(response.status).toBe(200);
                expect(response.data).toEqual({
                    "@odata.context": "$metadata#CustomerService.return_CustomerService_validateDiscountCode",
                    isValid: true,
                    discountType: 'FIXED_AMOUNT',
                    discountValue: 5.00,
                    discountAmount: 5.00,
                    finalAmount: 20.00,
                    message: 'Discount code is valid'
                });
            });

            test('should reject expired discount code EXPIRED10', async () => {
                const discountData = {
                    discountCode: 'EXPIRED10-NEW',
                    orderTotal: 30.00
                };

                const response = await POST('/odata/v4/customer/validateDiscountCode', discountData, customerAuth);
                
                expect(response.status).toBe(200);
                expect(response.data).toEqual({
                    "@odata.context": "$metadata#CustomerService.return_CustomerService_validateDiscountCode",
                    isValid: false,
                    discountAmount: 0,
                    finalAmount: 30.00,
                    message: 'Discount code has expired'
                });
            });

            test('should reject discount code below minimum order amount', async () => {
                const discountData = {
                    discountCode: 'SAVE10-NEW', // min order: $25
                    orderTotal: 20.00
                };

                const response = await POST('/odata/v4/customer/validateDiscountCode', discountData, customerAuth);
                
                expect(response.status).toBe(200);
                expect(response.data).toEqual({
                    "@odata.context": "$metadata#CustomerService.return_CustomerService_validateDiscountCode",
                    isValid: false,
                    discountAmount: 0,
                    finalAmount: 20.00,
                    message: 'Minimum order amount of $25.00 required for this discount code'
                });
            });

            test('should reject non-existent discount code', async () => {
                const discountData = {
                    discountCode: 'INVALID123',
                    orderTotal: 30.00
                };

                const response = await POST('/odata/v4/customer/validateDiscountCode', discountData, customerAuth);
                
                expect(response.status).toBe(200);
                expect(response.data).toEqual({
                    "@odata.context": "$metadata#CustomerService.return_CustomerService_validateDiscountCode",
                    isValid: false,
                    discountAmount: 0,
                    finalAmount: 30.00,
                    message: 'Invalid discount code'
                });
            });

            test('should respect maximum discount amount for percentage discounts', async () => {
                const discountData = {
                    discountCode: 'WELCOME20-NEW', // 20% off, max $100
                    orderTotal: 600.00 // 20% would be $120, but max is $100
                };

                const response = await POST('/odata/v4/customer/validateDiscountCode', discountData, customerAuth);
                
                expect(response.status).toBe(200);
                expect(response.data).toEqual({
                    "@odata.context": "$metadata#CustomerService.return_CustomerService_validateDiscountCode",
                    isValid: true,
                    discountType: 'PERCENTAGE',
                    discountValue: 20.00,
                    discountAmount: 100.00, // Capped at maxDiscount
                    finalAmount: 500.00,
                    message: 'Discount code is valid'
                });
            });
        });

        describe('calculateOrderTotal Action', () => {
            test('should calculate order total without discount', async () => {
                const orderData = {
                    items: [
                        { bookId: '550e8400-e29b-41d4-a716-446655442001', quantity: 1 } // Harry Potter $19.99
                    ]
                };

                const response = await POST('/odata/v4/customer/calculateOrderTotal', orderData, customerAuth);
                
                expect(response.status).toBe(200);
                expect(response.data).toEqual({
                    "@odata.context": "$metadata#CustomerService.return_CustomerService_calculateOrderTotal",
                    originalAmount: 19.99,
                    discountAmount: 0.00,
                    totalAmount: 19.99,
                    isValidDiscount: false
                });
            });

            test('should calculate order total with valid percentage discount', async () => {
                const orderData = {
                    items: [
                        { bookId: '550e8400-e29b-41d4-a716-446655442009', quantity: 1 } // Harry Potter $29.99
                    ],
                    discountCode: 'SAVE10-NEW'
                };

                const response = await POST('/odata/v4/customer/calculateOrderTotal', orderData, customerAuth);
                
                expect(response.status).toBe(200);
                expect(response.data).toEqual({
                    "@odata.context": "$metadata#CustomerService.return_CustomerService_calculateOrderTotal",
                    originalAmount: 29.99,
                    discountAmount: 3.00, // 10% of $29.99, rounded
                    totalAmount: 26.99,
                    isValidDiscount: true
                });
            });

            test('should calculate order total with valid fixed amount discount', async () => {
                const orderData = {
                    items: [
                        { bookId: '550e8400-e29b-41d4-a716-446655442009', quantity: 1 } // Harry Potter $29.99
                    ],
                    discountCode: 'FLAT5-NEW'
                };

                const response = await POST('/odata/v4/customer/calculateOrderTotal', orderData, customerAuth);
                
                expect(response.status).toBe(200);
                expect(response.data).toEqual({
                    "@odata.context": "$metadata#CustomerService.return_CustomerService_calculateOrderTotal",
                    originalAmount: 29.99,
                    discountAmount: 5.00,
                    totalAmount: 24.99,
                    isValidDiscount: true
                });
            });

            test('should handle invalid discount code gracefully', async () => {
                const orderData = {
                    items: [
                        { bookId: '550e8400-e29b-41d4-a716-446655442009', quantity: 1 }
                    ],
                    discountCode: 'INVALID123'
                };

                const response = await POST('/odata/v4/customer/calculateOrderTotal', orderData, customerAuth);
                
                expect(response.status).toBe(200);
                expect(response.data).toEqual({
                    "@odata.context": "$metadata#CustomerService.return_CustomerService_calculateOrderTotal",
                    originalAmount: 29.99,
                    discountAmount: 0.00,
                    totalAmount: 29.99,
                    isValidDiscount: false
                });
            });
        });

        describe('Enhanced Purchase Books with Discount', () => {
            test('should successfully purchase books with valid discount code', async () => {
                const purchaseData = {
                    items: [
                        { bookId: '550e8400-e29b-41d4-a716-446655442009', quantity: 1 }
                    ],
                    discountCode: 'SAVE10-NEW',
                    shippingAddress: '123 Test St, Test City',
                    billingAddress: '123 Test St, Test City',
                    customerEmail: 'test@example.com',
                    customerPhone: '+1234567890'
                };

                const response = await POST('/odata/v4/customer/purchaseBooks', purchaseData, customerAuth);
                
                expect(response.status).toBe(200);
                expect(response.data.value).toContain('Order');
                expect(response.data.value).toContain('created successfully');
                expect(response.data.value).toContain('discount applied');
            });

            test('should purchase books with invalid discount code (ignoring discount)', async () => {
                const purchaseData = {
                    items: [
                        { bookId: '550e8400-e29b-41d4-a716-446655442009', quantity: 1 }
                    ],
                    discountCode: 'INVALID123',
                    shippingAddress: '123 Test St, Test City',
                    billingAddress: '123 Test St, Test City',
                    customerEmail: 'test@example.com',
                    customerPhone: '+1234567890'
                };

                const response = await POST('/odata/v4/customer/purchaseBooks', purchaseData, customerAuth);
                
                expect(response.status).toBe(200);
                expect(response.data.value).toContain('Order');
                expect(response.data.value).toContain('created successfully');
                expect(response.data.value).not.toContain('discount applied');
            });

            test('should update discount usage counter after successful purchase', async () => {
                // First get the current usage count for FLAT5
                const beforeResponse = await GET('/odata/v4/admin/DiscountCodes?$filter=code eq \'FLAT5-NEW\'', { auth: { username: 'alice' } });
                const beforeUsage = beforeResponse.data.value[0].usedCount;

                const purchaseData = {
                    items: [
                        { bookId: '550e8400-e29b-41d4-a716-446655442009', quantity: 1 }
                    ],
                    discountCode: 'FLAT5-NEW',
                    shippingAddress: '123 Test St, Test City',
                    billingAddress: '123 Test St, Test City',
                    customerEmail: 'test@example.com',
                    customerPhone: '+1234567890'
                };

                await POST('/odata/v4/customer/purchaseBooks', purchaseData, customerAuth);

                // Check that usage count increased
                const afterResponse = await GET('/odata/v4/admin/DiscountCodes?$filter=code eq \'FLAT5-NEW\'', { auth: { username: 'alice' } });
                const afterUsage = afterResponse.data.value[0].usedCount;

                expect(afterUsage).toBe(beforeUsage + 1);
            });
        });
    });

    describe('Shopping Cart Functionality', () => {
        // Test shopping cart entity access
        describe('Shopping Cart Entity Access', () => {
            test('should allow customers to access their shopping cart', async () => {
                const response = await GET('/odata/v4/customer/MyShoppingCart', customerAuth);
                
                expect(response.status).toBe(200);
                expect(response.data.value).toBeInstanceOf(Array);
                // Customer should only see their own cart
            });

            test('should allow customers to access their shopping cart items', async () => {
                const response = await GET('/odata/v4/customer/MyShoppingCartItems', customerAuth);
                
                expect(response.status).toBe(200);
                expect(response.data.value).toBeInstanceOf(Array);
                // Customer should only see their own cart items
            });

            test('should prevent unauthorized access to shopping cart without authentication', async () => {
                try {
                    await GET('/odata/v4/customer/MyShoppingCart');
                    fail('Expected request to fail');
                } catch (error) {
                    expect(error.response.status).toBe(401);
                }
            });
        });

        describe('addToCart Action', () => {
            test('should successfully add book to cart', async () => {
                const cartData = {
                    quantity: 2
                };

                const response = await POST('/odata/v4/customer/Books(550e8400-e29b-41d4-a716-446655442001)/addToCart', cartData, customerAuth);
                
                expect(response.status).toBe(200);
                expect(response.data).toEqual({
                    "@odata.context": "../$metadata#CustomerService.return_CustomerService_Books_addToCart",
                    success: true,
                    message: 'Book added to cart successfully',
                    cartItemCount: expect.any(Number),
                    cartTotal: expect.any(Number)
                });
                expect(response.data.cartItemCount).toBeGreaterThan(0);
                expect(response.data.cartTotal).toBeGreaterThan(0);
            });

            test('should update quantity when adding same book again', async () => {
                const cartData = {
                    quantity: 1
                };

                // Add book first time
                await POST('/odata/v4/customer/Books(550e8400-e29b-41d4-a716-446655442001)/addToCart', cartData, customerAuth);
                
                // Add same book again
                const response = await POST('/odata/v4/customer/Books(550e8400-e29b-41d4-a716-446655442001)/addToCart', cartData, customerAuth);
                
                expect(response.status).toBe(200);
                expect(response.data.success).toBe(true);
                expect(response.data.message).toContain('updated');
            });

            test('should fail when adding non-existent book', async () => {
                const cartData = {
                    bookId: '00000000-0000-0000-0000-000000000000',
                    quantity: 1
                };

                try {
                    await POST('/odata/v4/customer/addToCart', cartData, customerAuth);
                    fail('Expected request to fail');
                } catch (error) {
                    expect(error.response.status).toBe(404);
                }
            });

            test('should fail when quantity is invalid', async () => {
                const cartData = {
                    quantity: 0
                };

                try {
                    await POST('/odata/v4/customer/Books(550e8400-e29b-41d4-a716-446655442001)/addToCart', cartData, customerAuth);
                    fail('Expected request to fail');
                } catch (error) {
                    expect(error.response.status).toBe(400);
                }
            });

            test('should fail when quantity exceeds stock', async () => {
                const cartData = {
                    quantity: 1000 // Assuming this exceeds available stock
                };

                try {
                    await POST('/odata/v4/customer/Books(550e8400-e29b-41d4-a716-446655442001)/addToCart', cartData, customerAuth);
                    fail('Expected request to fail');
                } catch (error) {
                    expect(error.response.status).toBe(400);
                }
            });

            test('should fail when required fields are missing', async () => {
                const cartData = {
                    quantity: 1
                    // Missing bookId
                };

                try {
                    await POST('/odata/v4/customer/Books/addToCart', cartData, customerAuth);
                    fail('Expected request to fail');
                } catch (error) {
                    expect(error.response.status).toBe(400);
                }
            });
        });

        describe('updateCartItem Action', () => {
            let cartItemId;

            beforeEach(async () => {
                // Add a book to cart first
                const cartData = {
                    quantity: 1
                };
                await POST('/odata/v4/customer/Books(550e8400-e29b-41d4-a716-446655442001)/addToCart', cartData, customerAuth);
                
                // Get the cart item ID
                const cartResponse = await GET('/odata/v4/customer/MyShoppingCartItems', customerAuth);
                if (cartResponse.data.value.length > 0) {
                    cartItemId = cartResponse.data.value[0].ID;
                }
            });

            test('should successfully update cart item quantity', async () => {
                const updateData = {
                    itemId: cartItemId,
                    quantity: 3
                };

                const response = await POST('/odata/v4/customer/updateCartItem', updateData, customerAuth);
                
                expect(response.status).toBe(200);
                expect(response.data).toEqual({
                    "@odata.context": "$metadata#CustomerService.return_CustomerService_updateCartItem",
                    success: true,
                    message: 'Cart item updated successfully',
                    cartItemCount: expect.any(Number),
                    cartTotal: expect.any(Number)
                });
            });

            test('should fail when updating non-existent cart item', async () => {
                const updateData = {
                    itemId: '00000000-0000-0000-0000-000000000000',
                    quantity: 2
                };

                try {
                    await POST('/odata/v4/customer/updateCartItem', updateData, customerAuth);
                    fail('Expected request to fail');
                } catch (error) {
                    expect(error.response.status).toBe(404);
                }
            });

            test('should fail when quantity is invalid', async () => {
                const updateData = {
                    itemId: cartItemId,
                    quantity: 0
                };

                try {
                    await POST('/odata/v4/customer/updateCartItem', updateData, customerAuth);
                    fail('Expected request to fail');
                } catch (error) {
                    expect(error.response.status).toBe(400);
                }
            });
        });

        describe('removeFromCart Action', () => {
            let cartItemId;

            beforeEach(async () => {
                // Add a book to cart first
                const cartData = {
                    quantity: 1
                };
                await POST('/odata/v4/customer/Books(550e8400-e29b-41d4-a716-446655442001)/addToCart', cartData, customerAuth);
                
                // Get the cart item ID
                const cartResponse = await GET('/odata/v4/customer/MyShoppingCartItems', customerAuth);
                if (cartResponse.data.value.length > 0) {
                    cartItemId = cartResponse.data.value[0].ID;
                }
            });

            test('should successfully remove item from cart', async () => {
                const removeData = {
                    itemId: cartItemId
                };

                const response = await POST('/odata/v4/customer/removeFromCart', removeData, customerAuth);
                
                expect(response.status).toBe(200);
                expect(response.data).toEqual({
                    "@odata.context": "$metadata#CustomerService.return_CustomerService_removeFromCart",
                    success: true,
                    message: 'Item removed from cart successfully',
                    cartItemCount: expect.any(Number),
                    cartTotal: expect.any(Number)
                });
            });

            test('should fail when removing non-existent cart item', async () => {
                const removeData = {
                    itemId: '00000000-0000-0000-0000-000000000000'
                };

                try {
                    await POST('/odata/v4/customer/removeFromCart', removeData, customerAuth);
                    fail('Expected request to fail');
                } catch (error) {
                    expect(error.response.status).toBe(404);
                }
            });

            test('should fail when itemId is missing', async () => {
                const removeData = {};

                try {
                    await POST('/odata/v4/customer/removeFromCart', removeData, customerAuth);
                    fail('Expected request to fail');
                } catch (error) {
                    expect(error.response.status).toBe(400);
                }
            });
        });

        describe('clearCart Action', () => {
            beforeEach(async () => {
                // Add some books to cart first
                const cartData1 = {
                    quantity: 1
                };
                const cartData2 = {
                    quantity: 2
                };
                
                await POST('/odata/v4/customer/Books(550e8400-e29b-41d4-a716-446655442001)/addToCart', cartData1, customerAuth);
                await POST('/odata/v4/customer/Books(550e8400-e29b-41d4-a716-446655442009)/addToCart', cartData2, customerAuth);
            });

            test('should successfully clear all items from cart', async () => {
                const response = await POST('/odata/v4/customer/clearCart', {}, customerAuth);
                
                expect(response.status).toBe(200);
                expect(response.data).toEqual({
                    "@odata.context": "$metadata#CustomerService.return_CustomerService_clearCart",
                    success: true,
                    message: 'Cart cleared successfully'
                });

                // Verify cart is empty
                const cartResponse = await GET('/odata/v4/customer/MyShoppingCartItems', customerAuth);
                expect(cartResponse.data.value).toHaveLength(0);
            });

            test('should succeed even when cart is already empty', async () => {
                // Clear cart first
                await POST('/odata/v4/customer/clearCart', {}, customerAuth);
                
                // Clear again
                const response = await POST('/odata/v4/customer/clearCart', {}, customerAuth);
                
                expect(response.status).toBe(200);
                expect(response.data.success).toBe(true);
            });
        });

        describe('getCartSummary Action', () => {
            beforeEach(async () => {
                // Clear cart and add known items
                await POST('/odata/v4/customer/clearCart', {}, customerAuth);
                
                const cartData1 = {
                    quantity: 1
                };
                const cartData2 = {
                    quantity: 2
                };
                
                await POST('/odata/v4/customer/Books(550e8400-e29b-41d4-a716-446655442001)/addToCart', cartData1, customerAuth);
                await POST('/odata/v4/customer/Books(550e8400-e29b-41d4-a716-446655442009)/addToCart', cartData2, customerAuth);
            });

            test('should return complete cart summary', async () => {
                const response = await POST('/odata/v4/customer/getCartSummary', {}, customerAuth);
                
                expect(response.status).toBe(200);
                expect(response.data['@odata.context']).toBeDefined()
                expect(response.data.items).toBeInstanceOf(Array);
                expect(response.data.items).toHaveLength(2);
                expect(response.data.totalItems).toBe(3); // 1 + 2
                expect(response.data.totalAmount).toBeGreaterThan(0);

                // Check item structure
                const item = response.data.items[0];
                expect(item).toHaveProperty('itemId');
                expect(item).toHaveProperty('bookId');
                expect(item).toHaveProperty('bookTitle');
                expect(item).toHaveProperty('bookAuthor');
                expect(item).toHaveProperty('quantity');
                expect(item).toHaveProperty('unitPrice');
                expect(item).toHaveProperty('subtotal');
            });

            test('should return empty summary for empty cart', async () => {
                // Clear cart first
                await POST('/odata/v4/customer/clearCart', {}, customerAuth);
                
                const response = await POST('/odata/v4/customer/getCartSummary', {}, customerAuth);
                
                expect(response.status).toBe(200);
                expect(response.data.items).toHaveLength(0);
                expect(response.data.totalItems).toBe(0);
                expect(response.data.totalAmount).toBe(0);
            });
        });

        describe('purchaseFromCart Action', () => {
            beforeEach(async () => {
                // Clear cart and add known items
                await POST('/odata/v4/customer/clearCart', {}, customerAuth);
                
                const cartData = {
                    quantity: 1
                };
                
                await POST('/odata/v4/customer/Books(550e8400-e29b-41d4-a716-446655442001)/addToCart', cartData, customerAuth);
            });

            test('should successfully purchase all items from cart', async () => {
                const purchaseData = {
                    shippingAddress: '123 Test St, Test City',
                    billingAddress: '123 Test St, Test City',
                    customerEmail: 'test@example.com',
                    customerPhone: '+1234567890'
                };

                const response = await POST('/odata/v4/customer/purchaseFromCart', purchaseData, customerAuth);
                
                expect(response.status).toBe(200);
                expect(response.data.value).toContain('Order');
                expect(response.data.value).toContain('created successfully');
                expect(response.data.value).toContain('from cart');

                // Verify cart is cleared after purchase
                const cartResponse = await GET('/odata/v4/customer/MyShoppingCartItems', customerAuth);
                expect(cartResponse.data.value).toHaveLength(0);
            });

            test('should successfully purchase from cart with discount code', async () => {
                const purchaseData = {
                    discountCode: 'SAVE10-NEW',
                    shippingAddress: '123 Test St, Test City',
                    billingAddress: '123 Test St, Test City',
                    customerEmail: 'test@example.com',
                    customerPhone: '+1234567890'
                };

                const response = await POST('/odata/v4/customer/purchaseFromCart', purchaseData, customerAuth);
                
                expect(response.status).toBe(200);
                expect(response.data.value).toContain('Order');
                expect(response.data.value).toContain('created successfully');
                expect(response.data.value).toContain('from cart');
            });

            test('should fail when cart is empty', async () => {
                // Clear cart first
                await POST('/odata/v4/customer/clearCart', {}, customerAuth);
                
                const purchaseData = {
                    shippingAddress: '123 Test St, Test City',
                    billingAddress: '123 Test St, Test City',
                    customerEmail: 'test@example.com',
                    customerPhone: '+1234567890'
                };

                try {
                    await POST('/odata/v4/customer/purchaseFromCart', purchaseData, customerAuth);
                    fail('Expected request to fail');
                } catch (error) {
                    expect(error.response.status).toBe(400);
                }
            });

            test('should fail when required fields are missing', async () => {
                const purchaseData = {
                    // Missing required address fields
                    customerEmail: 'test@example.com',
                    customerPhone: '+1234567890'
                };

                try {
                    await POST('/odata/v4/customer/purchaseFromCart', purchaseData, customerAuth);
                    fail('Expected request to fail');
                } catch (error) {
                    expect(error.response.status).toBe(400);
                }
            });
        });

        describe('Virtual Fields and Calculated Values', () => {
            beforeEach(async () => {
                // Clear cart and add known items
                await POST('/odata/v4/customer/clearCart', {}, customerAuth);
                
                const cartData = {
                    quantity: 2
                };
                
                await POST('/odata/v4/customer/Books(550e8400-e29b-41d4-a716-446655442001)/addToCart', cartData, customerAuth);
            });

            test('should calculate virtual fields for cart items', async () => {
                const response = await GET('/odata/v4/customer/MyShoppingCartItems?$expand=book', customerAuth);
                
                expect(response.status).toBe(200);
                expect(response.data.value).toHaveLength(1);
                
                const item = response.data.value[0];
                expect(item.unitPrice).toBe(item.book.price);
                expect(item.subtotal).toBe(item.book.price * item.quantity);
            });

            test('should calculate virtual fields for shopping cart', async () => {
                const response = await GET('/odata/v4/customer/MyShoppingCart?$expand=items($expand=book)', customerAuth);
                
                expect(response.status).toBe(200);
                expect(response.data.value).toHaveLength(1);
                
                const cart = response.data.value[0];
                expect(cart.totalItems).toBe(2);
                expect(cart.totalAmount).toBeGreaterThan(0);
                
                // Verify total matches sum of item subtotals
                const expectedTotal = cart.items.reduce((sum, item) => sum + (item.book.price * item.quantity), 0);
                expect(cart.totalAmount).toBe(expectedTotal);
            });
        });

        describe('User Isolation and Security', () => {
            const customer2Auth = { auth: { username: 'customer2' } };

            test('should isolate cart data between different users', async () => {
                // Add item to cart as customer1
                const cartData = {
                    quantity: 1
                };
                await POST('/odata/v4/customer/Books(550e8400-e29b-41d4-a716-446655442001)/addToCart', cartData, customerAuth);
                
                // Check that customer2 cannot see customer1's cart
                const customer2Response = await GET('/odata/v4/customer/MyShoppingCartItems', customer2Auth);
                expect(customer2Response.status).toBe(200);
                expect(customer2Response.data.value).toHaveLength(0);
                
                // Check that customer1 can see their own cart
                const customer1Response = await GET('/odata/v4/customer/MyShoppingCartItems', customerAuth);
                expect(customer1Response.status).toBe(200);
                expect(customer1Response.data.value.length).toBeGreaterThan(0);
            });

            test('should prevent customers from accessing other users cart items directly', async () => {
                // This test would require knowing another user's cart item ID
                // In practice, the authorization should prevent access
                const nonExistentItemId = '00000000-0000-0000-0000-000000000000';
                
                try {
                    await GET(`/odata/v4/customer/MyShoppingCartItems(${nonExistentItemId})`, customerAuth);
                    fail('Expected request to fail');
                } catch (error) {
                    expect(error.response.status).toBe(404);
                }
            });
        });
    });
});
