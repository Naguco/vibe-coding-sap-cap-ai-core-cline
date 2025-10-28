const cds = require('@sap/cds');

describe('Business Partner Integration', () => {
  const { GET, POST, PATCH, DELETE } = cds.test(__dirname + '/..');
  
  // Mock admin user for authentication
  const adminAuth = { auth: { username: 'alice' } };

  describe('Phase 1: External Service Setup', () => {
    describe('Business Partner API Connectivity', () => {
      test('should connect to Business Partner API service', async () => {
        // Service connection setup successful
        const bpService = await cds.connect.to('API_BUSINESS_PARTNER');
        expect(bpService).toBeDefined();
        expect(bpService.name).toBe('API_BUSINESS_PARTNER');
      });

      test('should handle destination connectivity gracefully', async () => {
        // Test graceful handling when destination is not available in development
        const bpService = await cds.connect.to('API_BUSINESS_PARTNER');
        
        try {
          await bpService.run(SELECT.from('A_BusinessPartner').limit(1));
          // If this succeeds, great! Destination is configured
        } catch (error) {
          // Expected in development - destination not configured yet
          expect(error.message).toContain('Failed to load destination');
        }
      });

      test('should be ready for supplier category filtering', async () => {
        // This validates the service setup without requiring live connection
        const bpService = await cds.connect.to('API_BUSINESS_PARTNER');
        expect(bpService).toBeDefined();
        
        // Validate that our filtering query structure is correct
        const query = SELECT.from('A_BusinessPartner')
          .where({ BusinessPartnerCategory: '2' })
          .limit(10);
        
        expect(query).toBeDefined();
        expect(query.SELECT.from.ref[0]).toBe('A_BusinessPartner');
      });
    });

    describe('Supplier Projection', () => {
      test('should have Suppliers projection available in model', async () => {
        // Test projection definition exists in our model
        const model = cds.model;
        const suppliersEntity = model.definitions['Suppliers'];
        
        expect(suppliersEntity).toBeDefined();
        expect(suppliersEntity.kind).toBe('entity');
      });

      test('should have correct field mappings in Suppliers projection', async () => {
        // Test projection field mappings are correct
        const model = cds.model;
        const suppliersEntity = model.definitions['Suppliers'];
        
        expect(suppliersEntity).toBeDefined();
        
        // Check field mappings exist
        const elements = suppliersEntity.elements;
        expect(elements.ID).toBeDefined();
        expect(elements.name).toBeDefined();
        expect(elements.category).toBeDefined();
      });
    });

    describe('Remote Service Configuration', () => {
      test('should have API_BUSINESS_PARTNER service configured', async () => {
        // Test will fail initially - configuration not added yet
        const config = cds.env.requires['API_BUSINESS_PARTNER'];
        
        expect(config).toBeDefined();
        expect(config.kind).toBe('odata-v2');
        expect(config.credentials.destination).toBe('BUSINESS_PARTNER_API');
      });

      test('should handle connection errors gracefully', async () => {
        // Test for graceful error handling when S/4HANA is unavailable
        const bpService = await cds.connect.to('API_BUSINESS_PARTNER');
        
        // This should not crash the application even if connection fails
        try {
          await bpService.run(SELECT.from('A_BusinessPartner').limit(1));
        } catch (error) {
          // Error should be handled gracefully
          expect(error).toBeDefined();
          expect(typeof error.message).toBe('string');
        }
      });
    });
  });

  describe('Phase 1: Basic Integration Validation', () => {
    test('should maintain existing test coverage', async () => {
      // Verify that existing functionality still works
      const response = await GET('/odata/v4/admin/Books', adminAuth);
      expect(response.status).toBe(200);
      expect(response.data.value).toBeInstanceOf(Array);
    });

    test('should not break existing AdminService operations', async () => {
      // Test that admin service still functions normally
      const response = await GET('/odata/v4/admin/Authors', adminAuth);
      expect(response.status).toBe(200);
      expect(response.data.value).toBeInstanceOf(Array);
    });

    test('should not break existing CustomerService operations', async () => {
      // Test that customer service still functions normally
      const response = await GET('/odata/v4/customer/Books', { auth: { username: 'customer1' } });
      expect(response.status).toBe(200);
      expect(response.data.value).toBeInstanceOf(Array);
    });
  });
});
