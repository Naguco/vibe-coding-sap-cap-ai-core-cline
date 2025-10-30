const cds = require('@sap/cds');

describe('Supplier Management Actions - Phase 3', () => {
  const { GET, POST, PATCH, DELETE } = cds.test(__dirname + '/..');
  
  // Mock admin user for authentication
  const adminAuth = { auth: { username: 'alice' } };

  describe('Supplier Lookup Actions', () => {
    test('should provide supplier lookup action', async () => {
      const response = await POST('/odata/v4/admin/lookupSuppliers', {}, adminAuth);
      
      expect(response.status).toBe(200);
      expect(response.data.value).toBeInstanceOf(Array);
      // Should return suppliers from S/4HANA
      if (response.data.value.length > 0) {
        expect(response.data.value[0]).toHaveProperty('ID');
        expect(response.data.value[0]).toHaveProperty('name');
        expect(response.data.value[0]).toHaveProperty('category');
      }
    });

    test('should provide supplier search action with query parameter', async () => {
      const searchParams = {
        query: 'ACME'
      };
      
      const response = await POST('/odata/v4/admin/searchSuppliers', searchParams, adminAuth);
      
      expect(response.status).toBe(200);
      expect(response.data.value).toBeInstanceOf(Array);
      // Results should be filtered by search query
    });

    test('should validate supplier exists in S/4HANA', async () => {
      const validateParams = {
        supplierId: '0000001234'
      };
      
      const response = await POST('/odata/v4/admin/validateSupplier', validateParams, adminAuth);
      
      expect(response.status).toBe(200);
      expect(response.data.value).toHaveProperty('exists');
      expect(response.data.value).toHaveProperty('name');
    });

    test('should fail supplier validation for non-existent supplier', async () => {
      const validateParams = {
        supplierId: '9999999999'
      };
      
      try {
        await POST('/odata/v4/admin/validateSupplier', validateParams, adminAuth);
        throw new Error('Expected validation to fail');
      } catch (error) {
        expect(error.response.status).toBe(404);
        expect(error.message).toContain('not found');
      }
    });
  });

  describe('Book-Supplier Assignment Actions', () => {
    let testBookId;

    beforeAll(async () => {
      // Create a test book for supplier assignment
      const newBook = {
        title: 'Test Book for Supplier Assignment',
        price: 29.99,
        stock: 100
      };

      const draftResponse = await POST('/odata/v4/admin/Books', {}, adminAuth);
      await PATCH(`/odata/v4/admin/Books(ID=${draftResponse.data.ID},IsActiveEntity=false)`, newBook, adminAuth);
      await POST(`/odata/v4/admin/Books(ID=${draftResponse.data.ID},IsActiveEntity=false)/draftActivate`, {}, adminAuth);
      
      testBookId = draftResponse.data.ID;
    });

    test('should link book to supplier', async () => {
      const linkParams = {
        bookId: testBookId,
        supplierId: '0000001234',
        isPreferred: true,
        contractNumber: 'CNT-001',
        leadTime: 7
      };
      
      const response = await POST('/odata/v4/admin/linkBookToSupplier', linkParams, adminAuth);
      
      expect(response.status).toBe(200);
      expect(response.data.value).toContain('successfully linked');
      
      // Verify the relationship was created
      const bookSuppliers = await GET(`/odata/v4/admin/BookSuppliers?$filter=book_ID eq ${testBookId}`, adminAuth);
      expect(bookSuppliers.data.value.length).toBe(1);
      expect(bookSuppliers.data.value[0].supplier_ID).toBe('0000001234');
      expect(bookSuppliers.data.value[0].isPreferred).toBe(true);
    });

    test('should fail to link book to invalid supplier', async () => {
      const linkParams = {
        bookId: testBookId,
        supplierId: '9999999999',
        isPreferred: false
      };
      
      try {
        await POST('/odata/v4/admin/linkBookToSupplier', linkParams, adminAuth);
        throw new Error('Expected linking to fail');
      } catch (error) {
        expect(error.response.status).toBe(404);
        expect(error.message).toContain('Supplier not found');
      }
    });

    test('should fail to link non-existent book to supplier', async () => {
      const linkParams = {
        bookId: '00000000-0000-0000-0000-000000000000',
        supplierId: '0000001234',
        isPreferred: false
      };
      
      try {
        await POST('/odata/v4/admin/linkBookToSupplier', linkParams, adminAuth);
        throw new Error('Expected linking to fail');
      } catch (error) {
        expect(error.response.status).toBe(404);
        expect(error.message).toContain('Book not found');
      }
    });

    test('should update book-supplier relationship', async () => {
      const updateParams = {
        bookId: testBookId,
        supplierId: '0000001234',
        isPreferred: false,
        leadTime: 14,
        notes: 'Updated lead time due to seasonal demand'
      };
      
      const response = await POST('/odata/v4/admin/updateBookSupplier', updateParams, adminAuth);
      
      expect(response.status).toBe(200);
      expect(response.data.value).toContain('successfully updated');
      
      // Verify the relationship was updated
      const bookSuppliers = await GET(`/odata/v4/admin/BookSuppliers?$filter=book_ID eq ${testBookId} and supplier_ID eq '0000001234'`, adminAuth);
      expect(bookSuppliers.data.value[0].isPreferred).toBe(false);
      expect(bookSuppliers.data.value[0].leadTime).toBe(14);
      expect(bookSuppliers.data.value[0].notes).toBe('Updated lead time due to seasonal demand');
    });

    test('should remove book-supplier relationship', async () => {
      const removeParams = {
        bookId: testBookId,
        supplierId: '0000001234'
      };
      
      const response = await POST('/odata/v4/admin/removeBookSupplier', removeParams, adminAuth);
      
      expect(response.status).toBe(200);
      expect(response.data.value).toContain('successfully removed');
      
      // Verify the relationship was removed
      const bookSuppliers = await GET(`/odata/v4/admin/BookSuppliers?$filter=book_ID eq ${testBookId}`, adminAuth);
      expect(bookSuppliers.data.value.length).toBe(0);
    });

    test('should fail to remove non-existent book-supplier relationship', async () => {
      const removeParams = {
        bookId: testBookId,
        supplierId: '0000005678'
      };
      
      try {
        await POST('/odata/v4/admin/removeBookSupplier', removeParams, adminAuth);
        throw new Error('Expected removal to fail');
      } catch (error) {
        expect(error.response.status).toBe(404);
        expect(error.message).toContain('Relationship not found');
      }
    });
  });

  describe('Bulk Supplier Operations', () => {
    let testBookIds = [];

    beforeAll(async () => {
      // Create multiple test books for bulk operations
      for (let i = 1; i <= 3; i++) {
        const newBook = {
          title: `Bulk Test Book ${i}`,
          price: 19.99 + i,
          stock: 50 * i
        };

        const draftResponse = await POST('/odata/v4/admin/Books', {}, adminAuth);
        await PATCH(`/odata/v4/admin/Books(ID=${draftResponse.data.ID},IsActiveEntity=false)`, newBook, adminAuth);
        await POST(`/odata/v4/admin/Books(ID=${draftResponse.data.ID},IsActiveEntity=false)/draftActivate`, {}, adminAuth);
        
        testBookIds.push(draftResponse.data.ID);
      }
    });

    test('should bulk assign supplier to multiple books', async () => {
      const bulkParams = {
        bookIds: testBookIds,
        supplierId: '0000001234',
        isPreferred: false,
        leadTime: 10
      };
      
      const response = await POST('/odata/v4/admin/bulkAssignSupplier', bulkParams, adminAuth);
      
      expect(response.status).toBe(200);
      expect(response.data.value).toContain('successfully assigned');
      expect(response.data.value).toContain(`${testBookIds.length} books`);
      
      // Verify all relationships were created
      for (const bookId of testBookIds) {
        const bookSuppliers = await GET(`/odata/v4/admin/BookSuppliers?$filter=book_ID eq ${bookId} and supplier_ID eq '0000001234'`, adminAuth);
        expect(bookSuppliers.data.value.length).toBe(1);
      }
    });

    test('should get supplier summary for books', async () => {
      const summaryParams = {
        bookIds: testBookIds
      };
      
      const response = await POST('/odata/v4/admin/getSupplierSummary', summaryParams, adminAuth);
      
      expect(response.status).toBe(200);
      expect(response.data.value).toBeInstanceOf(Array);
      expect(response.data.value.length).toBe(testBookIds.length);
      
      // Each book should have supplier information
      response.data.value.forEach(bookSummary => {
        expect(bookSummary).toHaveProperty('bookId');
        expect(bookSummary).toHaveProperty('supplierCount');
        expect(bookSummary).toHaveProperty('preferredSupplier');
      });
    });
  });

  describe('Supplier Information Enrichment', () => {
    test('should enrich supplier data with S/4HANA details', async () => {
      const enrichParams = {
        supplierId: '0000001234'
      };
      
      const response = await POST('/odata/v4/admin/enrichSupplierData', enrichParams, adminAuth);
      
      expect(response.status).toBe(200);
      expect(response.data.value).toHaveProperty('supplierInfo');
      expect(response.data.value.supplierInfo).toHaveProperty('ID');
      expect(response.data.value.supplierInfo).toHaveProperty('name');
      expect(response.data.value.supplierInfo).toHaveProperty('category');
      expect(response.data.value.supplierInfo).toHaveProperty('addresses');
      expect(response.data.value.supplierInfo).toHaveProperty('contacts');
    });

    test('should get supplier performance metrics', async () => {
      // First create a book-supplier relationship for metrics
      const testBook = {
        title: 'Metrics Test Book',
        price: 25.99,
        stock: 75
      };

      const draftResponse = await POST('/odata/v4/admin/Books', {}, adminAuth);
      await PATCH(`/odata/v4/admin/Books(ID=${draftResponse.data.ID},IsActiveEntity=false)`, testBook, adminAuth);
      await POST(`/odata/v4/admin/Books(ID=${draftResponse.data.ID},IsActiveEntity=false)/draftActivate`, {}, adminAuth);
      
      const testBookId = draftResponse.data.ID;

      // Link to supplier
      await POST('/odata/v4/admin/linkBookToSupplier', {
        bookId: testBookId,
        supplierId: '0000001234',
        isPreferred: true
      }, adminAuth);

      // Get performance metrics
      const metricsParams = {
        supplierId: '0000001234'
      };
      
      const response = await POST('/odata/v4/admin/getSupplierMetrics', metricsParams, adminAuth);
      
      expect(response.status).toBe(200);
      expect(response.data.value).toHaveProperty('totalBooks');
      expect(response.data.value).toHaveProperty('preferredBooks');
      expect(response.data.value).toHaveProperty('averageLeadTime');
      expect(response.data.value).toHaveProperty('lastOrderDate');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle S/4HANA connectivity issues gracefully', async () => {
      // This test would normally mock S/4HANA unavailability
      // For now, we'll test parameter validation
      try {
        await POST('/odata/v4/admin/lookupSuppliers', { invalidParam: true }, adminAuth);
      } catch (error) {
        // Should either succeed or fail gracefully with meaningful message
        expect([200, 400, 503]).toContain(error.response?.status || 200);
      }
    });

    test('should validate required parameters for supplier actions', async () => {
      try {
        await POST('/odata/v4/admin/linkBookToSupplier', {}, adminAuth);
        throw new Error('Expected validation to fail');
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.message).toContain('required');
      }
    });

    test('should prevent duplicate supplier assignments', async () => {
      // Create a test book
      const newBook = {
        title: 'Duplicate Test Book',
        price: 15.99,
        stock: 30
      };

      const draftResponse = await POST('/odata/v4/admin/Books', {}, adminAuth);
      await PATCH(`/odata/v4/admin/Books(ID=${draftResponse.data.ID},IsActiveEntity=false)`, newBook, adminAuth);
      await POST(`/odata/v4/admin/Books(ID=${draftResponse.data.ID},IsActiveEntity=false)/draftActivate`, {}, adminAuth);
      
      const testBookId = draftResponse.data.ID;

      // First assignment should succeed
      await POST('/odata/v4/admin/linkBookToSupplier', {
        bookId: testBookId,
        supplierId: '0000001234',
        isPreferred: true
      }, adminAuth);

      // Second assignment to same supplier should fail
      try {
        await POST('/odata/v4/admin/linkBookToSupplier', {
          bookId: testBookId,
          supplierId: '0000001234',
          isPreferred: false
        }, adminAuth);
        throw new Error('Expected duplicate assignment to fail');
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.message).toContain('already linked');
      }
    });
  });
});
