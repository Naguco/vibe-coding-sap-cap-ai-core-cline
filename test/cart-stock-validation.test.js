const cds = require('@sap/cds');

describe('Cart Stock Validation Bug', () => {
    const { GET, POST, DELETE } = cds.test(__dirname + '/..');
    
    // Mock customer user for authentication
    const customerAuth = { auth: { username: 'customer1' } };
    
    beforeEach(async () => {
        // Clear cart before each test
        try {
            const cartResponse = await GET('/odata/v4/customer/MyShoppingCart', customerAuth);
            if (cartResponse.data.value.length > 0) {
                const cartId = cartResponse.data.value[0].ID;
                await POST(`/odata/v4/customer/MyShoppingCart(${cartId})/clearCart`, {}, customerAuth);
            }
        } catch (error) {
            // Ignore errors - cart might not exist yet
        }
    });

    describe('Stock Validation Bug - Adding to Cart', () => {
        test('should fail when total cart quantity would exceed stock', async () => {
            // Assuming Harry Potter has limited stock (let's say 5 copies)
            const bookId = '550e8400-e29b-41d4-a716-446655442001';
            
            // First, check the actual stock
            const bookResponse = await GET(`/odata/v4/customer/Books(${bookId})`, customerAuth);
            const book = bookResponse.data;
            const availableStock = book.stock;
            
            // Add items to cart that fill most of the stock
            const firstQuantity = Math.max(1, availableStock - 1);
            await POST(`/odata/v4/customer/Books(${bookId})/addToCart`, {
                quantity: firstQuantity
            }, customerAuth);
            
            // Now try to add more items than remaining stock
            const secondQuantity = 2; // This should exceed remaining stock
            
            try {
                await POST(`/odata/v4/customer/Books(${bookId})/addToCart`, {
                    quantity: secondQuantity
                }, customerAuth);
                
                // If we reach here, the bug exists - we should have failed
                // Check if total cart quantity exceeds stock
                const cartResponse = await GET('/odata/v4/customer/MyShoppingCartItems?$expand=book', customerAuth);
                const cartItem = cartResponse.data.value.find(item => item.book.ID === bookId);
                
                if (cartItem && cartItem.quantity > availableStock) {
                    throw new Error(`BUG DETECTED: Cart contains ${cartItem.quantity} items but stock is only ${availableStock}`);
                }
                
            } catch (error) {
                if (error.message.includes('BUG DETECTED')) {
                    throw error;
                }
                // Expected behavior - should fail with stock validation error
                expect(error.response.status).toBe(400);
                expect(error.response.data.error.message).toContain('exceed available stock');
            }
        });

        test('should correctly validate stock when updating existing cart item to exceed stock', async () => {
            const bookId = '550e8400-e29b-41d4-a716-446655442001';
            
            // Get book stock
            const bookResponse = await GET(`/odata/v4/customer/Books(${bookId})`, customerAuth);
            const availableStock = bookResponse.data.stock;
            
            // Add 1 item to cart
            await POST(`/odata/v4/customer/Books(${bookId})/addToCart`, {
                quantity: 1
            }, customerAuth);
            
            // Try to add more items that would exceed total stock
            const excessQuantity = availableStock; // This plus the existing 1 should exceed stock
            
            try {
                await POST(`/odata/v4/customer/Books(${bookId})/addToCart`, {
                    quantity: excessQuantity
                }, customerAuth);
                
                // Check if total exceeds stock (bug detection)
                const cartResponse = await GET('/odata/v4/customer/MyShoppingCartItems?$expand=book', customerAuth);
                const cartItem = cartResponse.data.value.find(item => item.book.ID === bookId);
                
                if (cartItem && cartItem.quantity > availableStock) {
                    throw new Error(`BUG DETECTED: Cart contains ${cartItem.quantity} items but stock is only ${availableStock}`);
                }
                
            } catch (error) {
                if (error.message.includes('BUG DETECTED')) {
                    throw error;
                }
                // Expected - should fail with proper error
                expect(error.response.status).toBe(400);
                expect(error.response.data.error.message).toContain('exceed available stock');
            }
        });

        test('should allow adding items when total would not exceed stock', async () => {
            const bookId = '550e8400-e29b-41d4-a716-446655442001';
            
            // Get book stock
            const bookResponse = await GET(`/odata/v4/customer/Books(${bookId})`, customerAuth);
            const availableStock = bookResponse.data.stock;
            
            if (availableStock < 2) {
                // Skip test if not enough stock for valid test
                return;
            }
            
            // Add 1 item to cart
            const response1 = await POST(`/odata/v4/customer/Books(${bookId})/addToCart`, {
                quantity: 1
            }, customerAuth);
            
            expect(response1.status).toBe(200);
            expect(response1.data.success).toBe(true);
            
            // Add 1 more item (total 2, should be within stock)
            const response2 = await POST(`/odata/v4/customer/Books(${bookId})/addToCart`, {
                quantity: 1
            }, customerAuth);
            
            expect(response2.status).toBe(200);
            expect(response2.data.success).toBe(true);
            expect(response2.data.message).toContain('updated');
            
            // Verify final quantity is correct
            const cartResponse = await GET('/odata/v4/customer/MyShoppingCartItems?$expand=book', customerAuth);
            const cartItem = cartResponse.data.value.find(item => item.book.ID === bookId);
            
            expect(cartItem.quantity).toBe(2);
            expect(cartItem.quantity).toBeLessThanOrEqual(availableStock);
        });

        test('should prevent cart manipulation to exceed stock through updateCartItem', async () => {
            const bookId = '550e8400-e29b-41d4-a716-446655442001';
            
            // Get book stock
            const bookResponse = await GET(`/odata/v4/customer/Books(${bookId})`, customerAuth);
            const availableStock = bookResponse.data.stock;
            
            // Add 1 item to cart
            await POST(`/odata/v4/customer/Books(${bookId})/addToCart`, {
                quantity: 1
            }, customerAuth);
            
            // Get cart item ID
            const cartResponse = await GET('/odata/v4/customer/MyShoppingCart?$expand=items', customerAuth);
            const cartId = cartResponse.data.value[0].ID;
            const cartItemId = cartResponse.data.value[0].items[0].ID;
            
            // Try to update quantity to exceed stock
            const excessQuantity = availableStock + 1;
            
            try {
                await POST(`/odata/v4/customer/MyShoppingCart(${cartId})/items(${cartItemId})/CustomerService.updateCartItem`, {
                    quantity: excessQuantity
                }, customerAuth);
                fail('Expected request to fail due to insufficient stock');
            } catch (error) {
                expect(error.response.status).toBe(400);
                expect(error.response.data.error.message).toContain('Insufficient stock');
            }
        });
    });
});
