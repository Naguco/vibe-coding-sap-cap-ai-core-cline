const cds = require('@sap/cds');

describe('Book-Supplier Relationship Integration', () => {
  const { GET, POST, PATCH, DELETE } = cds.test(__dirname + '/..');
  
  // Mock admin user for authentication
  const adminAuth = { auth: { username: 'alice' } };

  describe('Phase 2: Data Model Extension', () => {
    describe('BookSuppliers Entity', () => {
      test('should have BookSuppliers entity available', async () => {
        // Test will fail initially - entity not created yet
        const response = await GET('/odata/v4/admin/$metadata', adminAuth);
        expect(response.status).toBe(200);
        expect(response.data).toContain('BookSuppliers');
      });

      test('should support CRUD operations on BookSuppliers', async () => {
        // Test will fail initially - entity not exposed yet
        const response = await GET('/odata/v4/admin/BookSuppliers', adminAuth);
        expect(response.status).toBe(200);
        expect(response.data.value).toBeInstanceOf(Array);
      });
    });

    describe('Books with Suppliers', () => {
      test('should support Books with suppliers expansion', async () => {
        // Test will initially pass but structure should be ready
        const response = await GET('/odata/v4/admin/Books?$expand=suppliers', adminAuth);
        expect(response.status).toBe(200);
        expect(response.data.value).toBeInstanceOf(Array);
      });

      test('should not break existing Books operations', async () => {
        // Ensure Books entity still works with extensions
        const response = await GET('/odata/v4/admin/Books', adminAuth);
        expect(response.status).toBe(200);
        expect(response.data.value).toBeInstanceOf(Array);
      });
    });
  });

  describe('Phase 2: CRUD Validation', () => {
    test('should maintain Books draft functionality', async () => {
      // Test that draft functionality still works after extension
      const createResponse = await POST('/odata/v4/admin/Books', {
        title: 'Test Book for Supplier Integration',
        stock: 10,
        price: 29.99
      }, adminAuth);
      
      expect(createResponse.status).toBe(201);
      expect(createResponse.data.title).toBe('Test Book for Supplier Integration');
      
      // Clean up - handle draft keys properly
      try {
        if (createResponse.data.ID && createResponse.data.IsActiveEntity !== undefined) {
          const keyParams = `ID=${createResponse.data.ID},IsActiveEntity=${createResponse.data.IsActiveEntity}`;
          await DELETE(`/odata/v4/admin/Books(${keyParams})`, adminAuth);
        }
      } catch (error) {
        // Cleanup error is not critical for this test
        console.log('Cleanup warning:', error.message);
      }
    });

    test('should maintain existing functionality', async () => {
      // Verify that existing functionality still works
      const response = await GET('/odata/v4/admin/Authors', adminAuth);
      expect(response.status).toBe(200);
      expect(response.data.value).toBeInstanceOf(Array);
    });
  });
});
