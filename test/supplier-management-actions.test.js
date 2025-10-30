const cds = require('@sap/cds');

describe('Supplier Management - Standard OData Operations', () => {
  const { GET, POST, PATCH, DELETE } = cds.test(__dirname + '/..', '--with-mocks');

  // Mock admin user for authentication
  const adminAuth = { auth: { username: 'alice' } };

  describe('Supplier Entity Access', () => {
    test('should access Suppliers entity through standard OData', async () => {
      // Since we're connecting to external S/4HANA service, this may fail in dev
      // but we want to ensure the entity is exposed properly
      try {
        const response = await GET('/odata/v4/admin/Suppliers', adminAuth);
        expect(response.status).toBe(200);
        expect(response.data.value).toBeInstanceOf(Array);
      } catch (error) {
        // Expected in development environment without S/4HANA connection
        expect(error.response.status).toBe(502); // Bad Gateway
      }
    });

    test('should have Suppliers entity in metadata', async () => {
      const response = await GET('/odata/v4/admin/$metadata', adminAuth);
      expect(response.status).toBe(200);
      expect(response.data).toContain('Suppliers');
    });
  });

  describe('BookSuppliers CRUD Operations', () => {
    let testBookId;

    beforeAll(async () => {
      // Create a test book for supplier relationships
      const newBook = {
        title: 'Test Book for Supplier Management',
        price: 29.99,
        stock: 100
      };

      const draftResponse = await POST('/odata/v4/admin/Books', {}, adminAuth);
      await PATCH(`/odata/v4/admin/Books(ID=${draftResponse.data.ID},IsActiveEntity=false)`, newBook, adminAuth);
      await POST(`/odata/v4/admin/Books(ID=${draftResponse.data.ID},IsActiveEntity=false)/draftActivate`, {}, adminAuth);

      testBookId = draftResponse.data.ID;
    });

    test('should create BookSupplier relationship through standard OData', async () => {
      const supplierRelationship = {
        supplier: { ID: '0000001234' },
        isPreferred: true,
        contractNumber: 'CNT-001',
        leadTime: 7
      };

      await POST(`/odata/v4/admin/Books(ID=${testBookId},IsActiveEntity=true)/AdminService.draftEdit`, {}, adminAuth);
      const response = await POST(
        `/odata/v4/admin/Books(ID=${testBookId},IsActiveEntity=false)/suppliers`,
        supplierRelationship,
        adminAuth
      );
      await POST(
        `/odata/v4/admin/Books(ID=${testBookId},IsActiveEntity=false)/AdminService.draftActivate`,
        supplierRelationship,
        adminAuth
      );

      expect(response.status).toBe(201);
      expect(response.data.book_ID).toBe(testBookId);
      expect(response.data.supplier_ID).toBe('0000001234');
      expect(response.data.isPreferred).toBe(true);
    });

    test('should read BookSupplier relationships', async () => {

      const supplierRelationship = {
        supplier: { ID: '0000001235' },
        isPreferred: true,
        contractNumber: 'CNT-001',
        leadTime: 7
      };

      await POST(`/odata/v4/admin/Books(ID=${testBookId},IsActiveEntity=true)/AdminService.draftEdit`, {}, adminAuth);
      await POST(
        `/odata/v4/admin/Books(ID=${testBookId},IsActiveEntity=false)/suppliers`,
        supplierRelationship,
        adminAuth
      );

      const response = await GET(`/odata/v4/admin/BookSuppliers?$filter=book_ID eq ${testBookId}`, adminAuth);

      expect(response.status).toBe(200);
      expect(response.data.value).toBeInstanceOf(Array);
      expect(response.data.value.length).toBeGreaterThan(0);
      expect(response.data.value[0].supplier_ID).toBe('0000001234');
    });

    test('should update BookSupplier relationship', async () => {
      const bookPayload = {
        ID: cds.utils.uuid(), // Generate a NEW ID just for this test
        title: 'Book for Update Test',
        price: 100,
        stock: 100
      };

      // Create the draft book
      await POST('/odata/v4/admin/Books', bookPayload, adminAuth);
      // Activate it
      const activeBookResponse = await POST(
        `/odata/v4/admin/Books(ID=${bookPayload.ID},IsActiveEntity=false)/AdminService.draftActivate`,
        {},
        adminAuth
      );
      const newBookId = activeBookResponse.data.ID; // Use this new ID

      // --- 2. SETUP: Create an ACTIVE Supplier Relationship for that book ---
      const supplierPayload = {
        supplier_ID: '0000012345',
        isPreferred: true,
        leadTime: 5
      };

      // Start edit draft
      await POST(`/odata/v4/admin/Books(ID=${newBookId},IsActiveEntity=true)/AdminService.draftEdit`, {}, adminAuth);
      // POST the new supplier to the draft
      const supplierResponse = await POST(
        `/odata/v4/admin/Books(ID=${newBookId},IsActiveEntity=false)/suppliers`,
        supplierPayload,
        adminAuth
      );
      const newSupplierRelationshipID = supplierResponse.data.ID; // Get the ID of the child

      // Activate the book to save the new supplier
      await POST(`/odata/v4/admin/Books(ID=${newBookId},IsActiveEntity=false)/AdminService.draftActivate`, {}, adminAuth);

      // --- 3. TEST: Now, we can finally test the UPDATE ---

      // Start a NEW draft session to perform the update
      await POST(`/odata/v4/admin/Books(ID=${newBookId},IsActiveEntity=true)/AdminService.draftEdit`, {}, adminAuth);

      const updates = {
        isPreferred: false,
        leadTime: 14,
        notes: 'Updated lead time'
      };

      // ✅ CORRECT: PATCH the DRAFT entity, using the correct parent and child IDs
      const response = await PATCH(
        `/odata/v4/admin/Books(ID=${newBookId},IsActiveEntity=false)/suppliers(ID=${newSupplierRelationshipID})`,
        updates,
        adminAuth
      );

      // --- 4. ASSERT: Check the response from the PATCH ---
      expect(response.status).toBe(200);
      expect(response.data.isPreferred).toBe(false);
      expect(response.data.leadTime).toBe(14);
      expect(response.data.notes).toBe('Updated lead time');
    });

    test('should delete BookSupplier relationship', async () => {
      // Get the relationship to delete
      // --- 1. SETUP: Create a new ACTIVE Book ---
      const bookPayload = {
        ID: cds.utils.uuid(), // Generate a NEW ID just for this test
        title: 'Book for Delete Test',
        price: 100,
        stock: 100
      };
      await POST('/odata/v4/admin/Books', bookPayload, adminAuth); // Create draft
      const activeBookResponse = await POST(
        `/odata/v4/admin/Books(ID=${bookPayload.ID},IsActiveEntity=false)/AdminService.draftActivate`,
        {}, adminAuth
      );
      const newBookId = activeBookResponse.data.ID;

      // --- 2. SETUP: Create an ACTIVE Supplier Relationship for that book ---
      const supplierPayload = {
        supplier_ID: '0000012345',
        isPreferred: true
      };
      await POST(`/odata/v4/admin/Books(ID=${newBookId},IsActiveEntity=true)/AdminService.draftEdit`, {}, adminAuth);
      const supplierResponse = await POST(
        `/odata/v4/admin/Books(ID=${newBookId},IsActiveEntity=false)/suppliers`,
        supplierPayload, adminAuth
      );
      const newSupplierRelationshipID = supplierResponse.data.ID; // Get the ID of the child
      await POST(`/odata/v4/admin/Books(ID=${newBookId},IsActiveEntity=false)/AdminService.draftActivate`, {}, adminAuth); // Activate

      // --- 3. TEST: Now, we can test the DELETE ---

      // Start a NEW draft session to perform the delete
      await POST(`/odata/v4/admin/Books(ID=${newBookId},IsActiveEntity=true)/AdminService.draftEdit`, {}, adminAuth);

      // ✅ CORRECT: DELETE from the DRAFT entity, using the correct parent/child path
      const response = await DELETE(
        `/odata/v4/admin/Books(ID=${newBookId},IsActiveEntity=false)/suppliers(ID=${newSupplierRelationshipID})`,
        adminAuth
      );

      // --- 4. ASSERT: Check the DELETE response ---
      expect(response.status).toBe(204); // 204 No Content is success for DELETE

      await POST(
        `/odata/v4/admin/Books(ID=${newBookId},IsActiveEntity=false)/AdminService.draftActivate`,
        {},
        adminAuth
      );

      // --- 5. VERIFY: Check that the supplier is gone from the DRAFT ---
      try {
        await GET(
          `/odata/v4/admin/Books(ID=${newBookId},IsActiveEntity=false)?$expand=suppliers`,
          adminAuth
        );
        // If the GET succeeds, the test should fail.
        // We can force it to fail by throwing our own error.
        throw new Error('Test failed: The GET request for the draft entity should have returned a 404, but it succeeded.');
      } catch (error) {
        // This is the expected path
        errorStatus = error.response?.status;
      }

      // Assert that we caught the expected 404 error
      expect(errorStatus).toBe(404);
    });
  });

  describe('Books with Suppliers Expansion', () => {
    test('should expand Books with suppliers', async () => {
      const response = await GET('/odata/v4/admin/Books?$expand=suppliers', adminAuth);

      expect(response.status).toBe(200);
      expect(response.data.value).toBeInstanceOf(Array);
      // Each book should have a suppliers property (even if empty)
      if (response.data.value.length > 0) {
        expect(response.data.value[0]).toHaveProperty('suppliers');
      }
    });
  });

  describe('Integration Validation', () => {
    test('should maintain existing service functionality', async () => {
      const response = await GET('/odata/v4/admin/Books', adminAuth);
      expect(response.status).toBe(200);
      expect(response.data.value).toBeInstanceOf(Array);
    });

    test('should maintain existing Authors functionality', async () => {
      const response = await GET('/odata/v4/admin/Authors', adminAuth);
      expect(response.status).toBe(200);
      expect(response.data.value).toBeInstanceOf(Array);
    });
  });
});
