const cds = require('@sap/cds');

describe('AdminService', () => {
  const { GET, POST, PATCH, DELETE } = cds.test(__dirname + '/..');
  
  // Mock admin user for authentication
  const adminAuth = { auth: { username: 'alice' } };

  describe('Books Management', () => {
    describe('CREATE Books', () => {
      test('should create a new book with valid data', async () => {
        const newBook = {
          title: 'Test Book',
          isbn: '9781234567890',
          description: 'A test book for unit testing',
          price: 29.99,
          stock: 100,
          publisher: 'Test Publisher',
          pages: 350,
          author_ID: '550e8400-e29b-41d4-a716-446655440001' // J.K. Rowling from sample data
        };

        const response = await POST('/odata/v4/admin/Books', newBook, adminAuth);
        
        expect(response.status).toBe(201);
        expect(response.data).toMatchObject({
          title: newBook.title,
          isbn: newBook.isbn,
          price: newBook.price,
          stock: newBook.stock
        });
        expect(response.data.ID).toBeDefined();
      });

      test('should fail to create book without required title', async () => {
        const invalidBook = {
          isbn: '9781234567891',
          price: 19.99,
          stock: 50
        };

        try {
          await POST('/odata/v4/admin/Books', invalidBook, adminAuth);
          fail('Expected request to fail');
        } catch (error) {
          expect(error.response.status).toBe(400);
          expect(error.message).toContain('Title is required');
        }
      });

      test('should fail to create book without required price', async () => {
        const invalidBook = {
          title: 'Invalid Book',
          isbn: '9781234567892',
          stock: 25
        };

        try {
          await POST('/odata/v4/admin/Books', invalidBook, adminAuth);
          fail('Expected request to fail');
        } catch (error) {
          expect(error.response.status).toBe(400);
          expect(error.message).toContain('Price is required');
        }
      });
    });

    describe('READ Books', () => {
      test('should get all books', async () => {
        const response = await GET('/odata/v4/admin/Books', adminAuth);
        
        expect(response.status).toBe(200);
        expect(response.data.value).toBeInstanceOf(Array);
        expect(response.data.value.length).toBeGreaterThan(0);
      });

      test('should get a specific book by ID', async () => {
        const bookId = '550e8400-e29b-41d4-a716-446655442001'; // Harry Potter from sample data
        
        const response = await GET(`/odata/v4/admin/Books(${bookId})`, adminAuth);
        
        expect(response.status).toBe(200);
        expect(response.data.ID).toBe(bookId);
        expect(response.data.title).toBe('Harry Potter and the Philosopher\'s Stone');
      });

      test('should return 404 for non-existent book', async () => {
        const nonExistentId = '00000000-0000-0000-0000-000000000000';
        
        try {
          await GET(`/odata/v4/admin/Books(${nonExistentId})`, adminAuth);
          fail('Expected request to fail with 404');
        } catch (error) {
          expect(error.response.status).toBe(404);
        }
      });
    });

    describe('UPDATE Books', () => {
      test('should update book price and stock', async () => {
        const bookId = '550e8400-e29b-41d4-a716-446655442001';
        const updates = {
          price: 24.99,
          stock: 75
        };

        const response = await PATCH(`/odata/v4/admin/Books(${bookId})`, updates, adminAuth);
        
        expect(response.status).toBe(200);
        expect(response.data.price).toBe(updates.price);
        expect(response.data.stock).toBe(updates.stock);
      });

      test('should update book description', async () => {
        const bookId = '550e8400-e29b-41d4-a716-446655442002';
        const updates = {
          description: 'Updated description for testing purposes'
        };

        const response = await PATCH(`/odata/v4/admin/Books(${bookId})`, updates, adminAuth);
        
        expect(response.status).toBe(200);
        expect(response.data.description).toBe(updates.description);
      });

      test('should fail to update with invalid price', async () => {
        const bookId = '550e8400-e29b-41d4-a716-446655442003';
        const invalidUpdates = {
          price: -5.00 // Negative price should be invalid
        };

        try {
          await PATCH(`/odata/v4/admin/Books(${bookId})`, invalidUpdates, adminAuth);
          fail('Expected request to fail with 400');
        } catch (error) {
          expect(error.response.status).toBe(400);
        }
      });
    });

    describe('DELETE Books', () => {
      test('should delete a book', async () => {
        // First create a book to delete
        const newBook = {
          title: 'Book to Delete',
          price: 15.99,
          stock: 10
        };

        const createResponse = await POST('/odata/v4/admin/Books', newBook, adminAuth);
        expect(createResponse.status).toBe(201);
        
        const bookId = createResponse.data.ID;

        // Now delete the book
        const deleteResponse = await DELETE(`/odata/v4/admin/Books(${bookId})`, adminAuth);
        expect(deleteResponse.status).toBe(204);

        // Verify book is deleted
        try {
          await GET(`/odata/v4/admin/Books(${bookId})`, adminAuth);
          fail('Expected book to be deleted (404)');
        } catch (error) {
          expect(error.response.status).toBe(404);
        }
      });

      test('should return 404 when deleting non-existent book', async () => {
        const nonExistentId = '00000000-0000-0000-0000-000000000000';
        
        try {
          await DELETE(`/odata/v4/admin/Books(${nonExistentId})`, adminAuth);
          fail('Expected request to fail with 404');
        } catch (error) {
          expect(error.response.status).toBe(404);
        }
      });
    });
  });

  describe('Authors Management', () => {
    describe('CREATE Authors', () => {
      test('should create a new author with valid data', async () => {
        const newAuthor = {
          name: 'Test Author',
          biography: 'A test author for unit testing',
          birthDate: '1980-01-01',
          nationality: 'American',
          website: 'https://testauthor.com'
        };

        const response = await POST('/odata/v4/admin/Authors', newAuthor, adminAuth);
        
        expect(response.status).toBe(201);
        expect(response.data).toMatchObject({
          name: newAuthor.name,
          biography: newAuthor.biography,
          nationality: newAuthor.nationality
        });
        expect(response.data.ID).toBeDefined();
      });

      test('should fail to create author without required name', async () => {
        const invalidAuthor = {
          biography: 'Author without name',
          nationality: 'Unknown'
        };

        try {
          await POST('/odata/v4/admin/Authors', invalidAuthor, adminAuth);
          fail('Expected request to fail');
        } catch (error) {
          expect(error.response.status).toBe(400);
          expect(error.message).toContain('Author name is required');
        }
      });
    });

    describe('READ Authors', () => {
      test('should get all authors', async () => {
        const response = await GET('/odata/v4/admin/Authors', adminAuth);
        
        expect(response.status).toBe(200);
        expect(response.data.value).toBeInstanceOf(Array);
        expect(response.data.value.length).toBeGreaterThan(0);
      });

      test('should get a specific author by ID', async () => {
        const authorId = '550e8400-e29b-41d4-a716-446655440001'; // J.K. Rowling from sample data
        
        const response = await GET(`/odata/v4/admin/Authors(${authorId})`, adminAuth);
        
        expect(response.status).toBe(200);
        expect(response.data.ID).toBe(authorId);
        expect(response.data.name).toBe('J.K. Rowling');
      });
    });

    describe('UPDATE Authors', () => {
      test('should update author biography', async () => {
        const authorId = '550e8400-e29b-41d4-a716-446655440002';
        const updates = {
          biography: 'Updated biography for George Orwell'
        };

        const response = await PATCH(`/odata/v4/admin/Authors(${authorId})`, updates, adminAuth);
        
        expect(response.status).toBe(200);
        expect(response.data.biography).toBe(updates.biography);
      });
    });

    describe('DELETE Authors', () => {
      test('should delete an author', async () => {
        // First create an author to delete
        const newAuthor = {
          name: 'Author to Delete',
          nationality: 'Test'
        };

        const createResponse = await POST('/odata/v4/admin/Authors', newAuthor, adminAuth);
        expect(createResponse.status).toBe(201);
        
        const authorId = createResponse.data.ID;

        // Delete the author
        const deleteResponse = await DELETE(`/odata/v4/admin/Authors(${authorId})`, adminAuth);
        expect(deleteResponse.status).toBe(204);

        // Verify author is deleted
        try {
          await GET(`/odata/v4/admin/Authors(${authorId})`, adminAuth);
          fail('Expected author to be deleted (404)');
        } catch (error) {
          expect(error.response.status).toBe(404);
        }
      });
    });
  });

  describe('Categories Management', () => {
    describe('CREATE Categories', () => {
      test('should create a new category with valid data', async () => {
        const newCategory = {
          name: 'Test Category',
          description: 'A test category for unit testing'
        };

        const response = await POST('/odata/v4/admin/Categories', newCategory, adminAuth);
        
        expect(response.status).toBe(201);
        expect(response.data).toMatchObject({
          name: newCategory.name,
          description: newCategory.description
        });
        expect(response.data.ID).toBeDefined();
      });

      test('should create a subcategory with parent reference', async () => {
        const parentId = '550e8400-e29b-41d4-a716-446655441001'; // Fiction category
        const newSubcategory = {
          name: 'Test Subcategory',
          description: 'A test subcategory',
          parentCategory_ID: parentId
        };

        const response = await POST('/odata/v4/admin/Categories', newSubcategory, adminAuth);
        
        expect(response.status).toBe(201);
        expect(response.data.name).toBe(newSubcategory.name);
        expect(response.data.parentCategory_ID).toBe(parentId);
      });

      test('should fail to create category without required name', async () => {
        const invalidCategory = {
          description: 'Category without name'
        };

        try {
          await POST('/odata/v4/admin/Categories', invalidCategory, adminAuth);
          fail('Expected request to fail');
        } catch (error) {
          expect(error.response.status).toBe(400);
          expect(error.message).toContain('Category name is required');
        }
      });
    });

    describe('READ Categories', () => {
      test('should get all categories', async () => {
        const response = await GET('/odata/v4/admin/Categories', adminAuth);
        
        expect(response.status).toBe(200);
        expect(response.data.value).toBeInstanceOf(Array);
        expect(response.data.value.length).toBeGreaterThan(0);
      });

      test('should get a specific category by ID', async () => {
        const categoryId = '550e8400-e29b-41d4-a716-446655441001'; // Fiction from sample data
        
        const response = await GET(`/odata/v4/admin/Categories(${categoryId})`, adminAuth);
        
        expect(response.status).toBe(200);
        expect(response.data.ID).toBe(categoryId);
        expect(response.data.name).toBe('Fiction');
      });
    });

    describe('UPDATE Categories', () => {
      test('should update category description', async () => {
        const categoryId = '550e8400-e29b-41d4-a716-446655441006';
        const updates = {
          description: 'Updated description for Non-Fiction category'
        };

        const response = await PATCH(`/odata/v4/admin/Categories(${categoryId})`, updates, adminAuth);
        
        expect(response.status).toBe(200);
        expect(response.data.description).toBe(updates.description);
      });
    });

    describe('DELETE Categories', () => {
      test('should delete a category', async () => {
        // First create a category to delete
        const newCategory = {
          name: 'Category to Delete',
          description: 'This will be deleted'
        };

        const createResponse = await POST('/odata/v4/admin/Categories', newCategory, adminAuth);
        expect(createResponse.status).toBe(201);
        
        const categoryId = createResponse.data.ID;

        // Delete the category
        const deleteResponse = await DELETE(`/odata/v4/admin/Categories(${categoryId})`, adminAuth);
        expect(deleteResponse.status).toBe(204);

        // Verify category is deleted
        try {
          await GET(`/odata/v4/admin/Categories(${categoryId})`, adminAuth);
          fail('Expected category to be deleted (404)');
        } catch (error) {
          expect(error.response.status).toBe(404);
        }
      });
    });
  });

  describe('Orders Management', () => {
    describe('READ Orders', () => {
      test('should get all orders', async () => {
        const response = await GET('/odata/v4/admin/Orders', adminAuth);
        
        expect(response.status).toBe(200);
        expect(response.data.value).toBeInstanceOf(Array);
      });
    });

    describe('UPDATE Order Status', () => {
      test('should update order status from PENDING to DELIVERED', async () => {
        // First create an order to update
        const newOrder = {
          orderNumber: 'TEST-001',
          originalAmount: 39.98,
          discountAmount: 0,
          totalAmount: 39.98,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          customerEmail: 'test@example.com'
        };

        const createResponse = await POST('/odata/v4/admin/Orders', newOrder, adminAuth);
        expect(createResponse.status).toBe(201);
        
        const orderId = createResponse.data.ID;

        // Update to delivered
        const updates = {
          status: 'DELIVERED'
        };

        const response = await PATCH(`/odata/v4/admin/Orders(${orderId})`, updates, adminAuth);
        
        expect(response.status).toBe(200);
        expect(response.data.status).toBe('DELIVERED');
      });

      test('should cancel an order', async () => {
        // Create order
        const newOrder = {
          orderNumber: 'TEST-004',
          originalAmount: 15.99,
          discountAmount: 0,
          totalAmount: 15.99,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          customerEmail: 'test4@example.com'
        };

        const createResponse = await POST('/odata/v4/admin/Orders', newOrder, adminAuth);
        expect(createResponse.status).toBe(201);
        
        const orderId = createResponse.data.ID;

        // Cancel the order
        const updates = {
          status: 'CANCELLED'
        };

        const response = await PATCH(`/odata/v4/admin/Orders(${orderId})`, updates, adminAuth);
        
        expect(response.status).toBe(200);
        expect(response.data.status).toBe('CANCELLED');
      });
    });
  });

  describe('Returns Management', () => {
    describe('READ Returns', () => {
      test('should get all returns', async () => {
        const response = await GET('/odata/v4/admin/Returns', adminAuth);
        
        expect(response.status).toBe(200);
        expect(response.data.value).toBeInstanceOf(Array);
      });
    });

    describe('UPDATE Return Status', () => {
      test('should update return status from REQUESTED to APPROVED', async () => {
        // First create a return to update
        const newReturn = {
          returnNumber: 'RET-001',
          quantity: 1,
          reason: 'Damaged item',
          status: 'REQUESTED',
          refundAmount: 19.99
        };

        const createResponse = await POST('/odata/v4/admin/Returns', newReturn, adminAuth);
        expect(createResponse.status).toBe(201);
        
        const returnId = createResponse.data.ID;

        // Update return status
        const updates = {
          status: 'APPROVED',
          processedDate: new Date().toISOString()
        };

        const response = await PATCH(`/odata/v4/admin/Returns(${returnId})`, updates, adminAuth);
        
        expect(response.status).toBe(200);
        expect(response.data.status).toBe('APPROVED');
        expect(response.data.processedDate).toBeDefined();
      });

      test('should reject a return request', async () => {
        // Create return
        const newReturn = {
          returnNumber: 'RET-002',
          quantity: 1,
          reason: 'Changed mind',
          status: 'REQUESTED',
          refundAmount: 29.99
        };

        const createResponse = await POST('/odata/v4/admin/Returns', newReturn, adminAuth);
        expect(createResponse.status).toBe(201);
        
        const returnId = createResponse.data.ID;

        // Reject the return
        const updates = {
          status: 'REJECTED',
          processedDate: new Date().toISOString(),
          notes: 'Return window expired'
        };

        const response = await PATCH(`/odata/v4/admin/Returns(${returnId})`, updates, adminAuth);
        
        expect(response.status).toBe(200);
        expect(response.data.status).toBe('REJECTED');
        expect(response.data.notes).toBe('Return window expired');
      });

      test('should process an approved return', async () => {
        // Create return
        const newReturn = {
          returnNumber: 'RET-003',
          quantity: 2,
          reason: 'Defective products',
          status: 'APPROVED',
          refundAmount: 39.98
        };

        const createResponse = await POST('/odata/v4/admin/Returns', newReturn, adminAuth);
        expect(createResponse.status).toBe(201);
        
        const returnId = createResponse.data.ID;

        // Process the return
        const updates = {
          status: 'PROCESSED',
          processedDate: new Date().toISOString(),
          notes: 'Refund issued to original payment method'
        };

        const response = await PATCH(`/odata/v4/admin/Returns(${returnId})`, updates, adminAuth);
        
        expect(response.status).toBe(200);
        expect(response.data.status).toBe('PROCESSED');
        expect(response.data.notes).toContain('Refund issued');
      });
    });
  });

  describe('Discount Codes Management', () => {
    describe('CREATE DiscountCodes', () => {
      test('should create a percentage discount code with valid data', async () => {
        const newDiscount = {
          code: 'SAVE20',
          description: '20% off on all books',
          discountType: 'PERCENTAGE',
          discountValue: 20.00,
          minOrderAmount: 50.00,
          maxDiscount: 100.00,
          validFrom: new Date().toISOString(),
          validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          isActive: true,
          usageLimit: 100,
          usedCount: 0
        };

        const response = await POST('/odata/v4/admin/DiscountCodes', newDiscount, adminAuth);
        
        expect(response.status).toBe(201);
        expect(response.data).toMatchObject({
          code: newDiscount.code,
          description: newDiscount.description,
          discountType: newDiscount.discountType,
          discountValue: newDiscount.discountValue,
          minOrderAmount: newDiscount.minOrderAmount,
          isActive: newDiscount.isActive
        });
        expect(response.data.ID).toBeDefined();
      });

      test('should create a fixed amount discount code with valid data', async () => {
        const newDiscount = {
          code: 'FLAT10',
          description: '$10 off your order',
          discountType: 'FIXED_AMOUNT',
          discountValue: 10.00,
          minOrderAmount: 25.00,
          validFrom: new Date().toISOString(),
          validTo: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          isActive: true,
          usageLimit: null, // unlimited usage
          usedCount: 0
        };

        const response = await POST('/odata/v4/admin/DiscountCodes', newDiscount, adminAuth);
        
        expect(response.status).toBe(201);
        expect(response.data).toMatchObject({
          code: newDiscount.code,
          description: newDiscount.description,
          discountType: newDiscount.discountType,
          discountValue: newDiscount.discountValue,
          minOrderAmount: newDiscount.minOrderAmount
        });
        expect(response.data.ID).toBeDefined();
      });

      test('should fail to create discount code without required code', async () => {
        const invalidDiscount = {
          description: 'Discount without code',
          discountType: 'PERCENTAGE',
          discountValue: 15.00,
          validFrom: new Date().toISOString(),
          validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        };

        try {
          await POST('/odata/v4/admin/DiscountCodes', invalidDiscount, adminAuth);
          fail('Expected request to fail');
        } catch (error) {
          expect(error.response.status).toBe(400);
        }
      });

      test('should fail to create discount code without required discountType', async () => {
        const invalidDiscount = {
          code: 'INVALID01',
          description: 'Discount without type',
          discountValue: 15.00,
          validFrom: new Date().toISOString(),
          validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        };

        try {
          await POST('/odata/v4/admin/DiscountCodes', invalidDiscount, adminAuth);
          fail('Expected request to fail');
        } catch (error) {
          expect(error.response.status).toBe(400);
        }
      });

      test('should fail to create discount code with invalid discountType', async () => {
        const invalidDiscount = {
          code: 'INVALID02',
          description: 'Discount with invalid type',
          discountType: 'INVALID_TYPE',
          discountValue: 15.00,
          validFrom: new Date().toISOString(),
          validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        };

        try {
          await POST('/odata/v4/admin/DiscountCodes', invalidDiscount, adminAuth);
          fail('Expected request to fail');
        } catch (error) {
          expect(error.response.status).toBe(400);
        }
      });

      test('should fail to create discount code with duplicate code', async () => {
        const discount1 = {
          code: 'DUPLICATE',
          description: 'First discount',
          discountType: 'PERCENTAGE',
          discountValue: 10.00,
          validFrom: new Date().toISOString(),
          validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        };

        const discount2 = {
          code: 'DUPLICATE',
          description: 'Second discount with same code',
          discountType: 'FIXED_AMOUNT',
          discountValue: 5.00,
          validFrom: new Date().toISOString(),
          validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        };

        // First one should succeed
        const response1 = await POST('/odata/v4/admin/DiscountCodes', discount1, adminAuth);
        expect(response1.status).toBe(201);

        // Second one should fail
        try {
          await POST('/odata/v4/admin/DiscountCodes', discount2, adminAuth);
          fail('Expected request to fail due to duplicate code');
        } catch (error) {
          expect(error.response.status).toBe(400);
        }
      });
    });

    describe('READ DiscountCodes', () => {
      test('should get all discount codes', async () => {
        const response = await GET('/odata/v4/admin/DiscountCodes', adminAuth);
        
        expect(response.status).toBe(200);
        expect(response.data.value).toBeInstanceOf(Array);
      });

      test('should get a specific discount code by ID', async () => {
        // First create a discount code
        const newDiscount = {
          code: 'TESTREAD',
          description: 'Test discount for reading',
          discountType: 'PERCENTAGE',
          discountValue: 25.00,
          validFrom: new Date().toISOString(),
          validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        };

        const createResponse = await POST('/odata/v4/admin/DiscountCodes', newDiscount, adminAuth);
        expect(createResponse.status).toBe(201);
        
        const discountId = createResponse.data.ID;

        // Now read it
        const response = await GET(`/odata/v4/admin/DiscountCodes(${discountId})`, adminAuth);
        
        expect(response.status).toBe(200);
        expect(response.data.ID).toBe(discountId);
        expect(response.data.code).toBe('TESTREAD');
      });

      test('should return 404 for non-existent discount code', async () => {
        const nonExistentId = '00000000-0000-0000-0000-000000000000';
        
        try {
          await GET(`/odata/v4/admin/DiscountCodes(${nonExistentId})`, adminAuth);
          fail('Expected request to fail with 404');
        } catch (error) {
          expect(error.response.status).toBe(404);
        }
      });
    });

    describe('UPDATE DiscountCodes', () => {
      test('should update discount code description and value', async () => {
        // Create discount code first
        const newDiscount = {
          code: 'TESTUPDATE',
          description: 'Original description',
          discountType: 'PERCENTAGE',
          discountValue: 15.00,
          validFrom: new Date().toISOString(),
          validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        };

        const createResponse = await POST('/odata/v4/admin/DiscountCodes', newDiscount, adminAuth);
        expect(createResponse.status).toBe(201);
        
        const discountId = createResponse.data.ID;

        // Update description and value
        const updates = {
          description: 'Updated description',
          discountValue: 20.00
        };

        const response = await PATCH(`/odata/v4/admin/DiscountCodes(${discountId})`, updates, adminAuth);
        
        expect(response.status).toBe(200);
        expect(response.data.description).toBe(updates.description);
        expect(response.data.discountValue).toBe(updates.discountValue);
      });

      test('should deactivate a discount code', async () => {
        // Create active discount code first
        const newDiscount = {
          code: 'DEACTIVATE',
          description: 'Discount to deactivate',
          discountType: 'FIXED_AMOUNT',
          discountValue: 5.00,
          validFrom: new Date().toISOString(),
          validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          isActive: true
        };

        const createResponse = await POST('/odata/v4/admin/DiscountCodes', newDiscount, adminAuth);
        expect(createResponse.status).toBe(201);
        
        const discountId = createResponse.data.ID;

        // Deactivate the discount
        const updates = {
          isActive: false
        };

        const response = await PATCH(`/odata/v4/admin/DiscountCodes(${discountId})`, updates, adminAuth);
        
        expect(response.status).toBe(200);
        expect(response.data.isActive).toBe(false);
      });
    });

    describe('DELETE DiscountCodes', () => {
      test('should delete a discount code', async () => {
        // First create a discount code to delete
        const newDiscount = {
          code: 'DELETE_ME',
          description: 'Discount code to be deleted',
          discountType: 'PERCENTAGE',
          discountValue: 10.00,
          validFrom: new Date().toISOString(),
          validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        };

        const createResponse = await POST('/odata/v4/admin/DiscountCodes', newDiscount, adminAuth);
        expect(createResponse.status).toBe(201);
        
        const discountId = createResponse.data.ID;

        // Now delete the discount code
        const deleteResponse = await DELETE(`/odata/v4/admin/DiscountCodes(${discountId})`, adminAuth);
        expect(deleteResponse.status).toBe(204);

        // Verify discount code is deleted
        try {
          await GET(`/odata/v4/admin/DiscountCodes(${discountId})`, adminAuth);
          fail('Expected discount code to be deleted (404)');
        } catch (error) {
          expect(error.response.status).toBe(404);
        }
      });

      test('should return 404 when deleting non-existent discount code', async () => {
        const nonExistentId = '00000000-0000-0000-0000-000000000000';
        
        try {
          await DELETE(`/odata/v4/admin/DiscountCodes(${nonExistentId})`, adminAuth);
          fail('Expected request to fail with 404');
        } catch (error) {
          expect(error.response.status).toBe(404);
        }
      });
    });

    describe('Admin Actions', () => {
      test('should activate a discount code', async () => {
        // Create inactive discount code first
        const newDiscount = {
          code: 'ACTIVATE_ME',
          description: 'Discount to activate',
          discountType: 'PERCENTAGE',
          discountValue: 15.00,
          validFrom: new Date().toISOString(),
          validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          isActive: false
        };

        const createResponse = await POST('/odata/v4/admin/DiscountCodes', newDiscount, adminAuth);
        expect(createResponse.status).toBe(201);
        
        const discountId = createResponse.data.ID;

        // Activate the discount using admin action
        const response = await POST(`/odata/v4/admin/activateDiscount`, { discountId }, adminAuth);
        
        expect(response.status).toBe(200);
        expect(response.data.value).toContain('activated successfully');

        // Verify discount is now active
        const getResponse = await GET(`/odata/v4/admin/DiscountCodes(${discountId})`, adminAuth);
        expect(getResponse.data.isActive).toBe(true);
      });

      test('should deactivate a discount code', async () => {
        // Create active discount code first
        const newDiscount = {
          code: 'DEACTIVATE_ACTION',
          description: 'Discount to deactivate via action',
          discountType: 'FIXED_AMOUNT',
          discountValue: 8.00,
          validFrom: new Date().toISOString(),
          validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          isActive: true
        };

        const createResponse = await POST('/odata/v4/admin/DiscountCodes', newDiscount, adminAuth);
        expect(createResponse.status).toBe(201);
        
        const discountId = createResponse.data.ID;

        // Deactivate the discount using admin action
        const response = await POST(`/odata/v4/admin/deactivateDiscount`, { discountId }, adminAuth);
        
        expect(response.status).toBe(200);
        expect(response.data.value).toContain('deactivated successfully');

        // Verify discount is now inactive
        const getResponse = await GET(`/odata/v4/admin/DiscountCodes(${discountId})`, adminAuth);
        expect(getResponse.data.isActive).toBe(false);
      });

      test('should fail to activate non-existent discount code', async () => {
        const nonExistentId = '00000000-0000-0000-0000-000000000000';

        try {
          await POST(`/odata/v4/admin/activateDiscount`, { discountId: nonExistentId }, adminAuth);
          fail('Expected request to fail');
        } catch (error) {
          expect(error.response.status).toBe(404);
        }
      });

      test('should fail to deactivate non-existent discount code', async () => {
        const nonExistentId = '00000000-0000-0000-0000-000000000000';

        try {
          await POST(`/odata/v4/admin/deactivateDiscount`, { discountId: nonExistentId }, adminAuth);
          fail('Expected request to fail');
        } catch (error) {
          expect(error.response.status).toBe(404);
        }
      });
    });
  });

  describe('Orders with Discount Integration', () => {
    describe('CREATE Orders with Discount', () => {
      test('should create order with applied discount code', async () => {
        // First create a discount code
        const newDiscount = {
          code: 'ORDER_TEST',
          description: 'Test discount for orders',
          discountType: 'PERCENTAGE',
          discountValue: 10.00,
          minOrderAmount: 20.00,
          validFrom: new Date().toISOString(),
          validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          isActive: true
        };

        const discountResponse = await POST('/odata/v4/admin/DiscountCodes', newDiscount, adminAuth);
        expect(discountResponse.status).toBe(201);

        // Create order with discount
        const newOrder = {
          orderNumber: 'DISCOUNT-001',
          originalAmount: 50.00,
          discountAmount: 5.00,
          totalAmount: 45.00,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          customerEmail: 'discount@example.com',
          appliedDiscountCode_ID: discountResponse.data.ID
        };

        const orderResponse = await POST('/odata/v4/admin/Orders', newOrder, adminAuth);
        
        expect(orderResponse.status).toBe(201);
        expect(orderResponse.data).toMatchObject({
          orderNumber: newOrder.orderNumber,
          originalAmount: newOrder.originalAmount,
          discountAmount: newOrder.discountAmount,
          totalAmount: newOrder.totalAmount,
          appliedDiscountCode_ID: newOrder.appliedDiscountCode_ID
        });
      });

      test('should create order without discount', async () => {
        const newOrder = {
          orderNumber: 'NO-DISCOUNT-001',
          originalAmount: 30.00,
          discountAmount: 0,
          totalAmount: 30.00,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          customerEmail: 'nodiscount@example.com'
        };

        const orderResponse = await POST('/odata/v4/admin/Orders', newOrder, adminAuth);
        
        expect(orderResponse.status).toBe(201);
        expect(orderResponse.data.discountAmount).toBe(0);
        expect(orderResponse.data.originalAmount).toBe(orderResponse.data.totalAmount);
        expect(orderResponse.data.appliedDiscountCode_ID).toBeNull();
      });
    });

    describe('READ Orders with Discount', () => {
      test('should read order with expanded discount code information', async () => {
        // First create a discount code and order
        const newDiscount = {
          code: 'EXPAND_TEST',
          description: 'Test discount for expansion',
          discountType: 'FIXED_AMOUNT',
          discountValue: 7.50,
          validFrom: new Date().toISOString(),
          validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          isActive: true
        };

        const discountResponse = await POST('/odata/v4/admin/DiscountCodes', newDiscount, adminAuth);
        const newOrder = {
          orderNumber: 'EXPAND-001',
          originalAmount: 40.00,
          discountAmount: 7.50,
          totalAmount: 32.50,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          customerEmail: 'expand@example.com',
          appliedDiscountCode_ID: discountResponse.data.ID
        };

        const orderResponse = await POST('/odata/v4/admin/Orders', newOrder, adminAuth);
        const orderId = orderResponse.data.ID;

        // Read order with expanded discount code
        const expandResponse = await GET(`/odata/v4/admin/Orders(${orderId})?$expand=appliedDiscountCode`, adminAuth);
        
        expect(expandResponse.status).toBe(200);
        expect(expandResponse.data.appliedDiscountCode).toBeDefined();
        expect(expandResponse.data.appliedDiscountCode.code).toBe('EXPAND_TEST');
        expect(expandResponse.data.appliedDiscountCode.discountValue).toBe(7.50);
      });
    });
  });
});
