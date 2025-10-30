const cds = require('@sap/cds');

module.exports = cds.service.impl(async function() {
  const { Books, Authors, Categories, Orders, Returns, DiscountCodes, Suppliers, SupplierDetails } = this.entities;
  
  // Connect to the external Business Partner service
  const bupa = await cds.connect.to('API_BUSINESS_PARTNER');
  
  // Delegate READ requests for Suppliers to the external service
  this.on('READ', 'Suppliers', req => {
    return bupa.run(req.query);
  });
  
  // Delegate READ requests for SupplierDetails to the external service
  this.on('READ', 'SupplierDetails', req => {
    return bupa.run(req.query);
  });

  // Books management with validation
  this.before('CREATE', 'Books', async (req) => {
    const book = req.data;
    
    // Validate required fields
    if (!book.title) {
      req.error(400, 'Title is required');
    }
    if (book.price === undefined || book.price === null) {
      req.error(400, 'Price is required');
    }
    if (book.price <= 0) {
      req.error(400, 'Price must be a positive number');
    }
    
    // Set default values
    book.stock = book.stock || 0;
    book.availableStock = book.stock;
  });

  this.before('UPDATE', 'Books', async (req) => {
    const updates = req.data;
    
    // Validate price if being updated
    if (updates.price !== undefined) {
      if (updates.price <= 0) {
        req.error(400, 'Price must be a positive number');
      }
    }
    
    // Update availableStock if stock is being updated
    if (updates.stock !== undefined) {
      updates.availableStock = updates.stock;
    }
  });

  // Authors management with validation
  this.before('CREATE', 'Authors', async (req) => {
    const author = req.data;
    
    // Validate required fields
    if (!author.name) {
      req.error(400, 'Author name is required');
    }
  });

  // Categories management with validation
  this.before('CREATE', 'Categories', async (req) => {
    const category = req.data;
    
    // Validate required fields
    if (!category.name) {
      req.error(400, 'Category name is required');
    }
  });

  // Orders management
  this.before('UPDATE', 'Orders', async (req) => {
    const updates = req.data;
    
    // Set timestamps for status changes
    if (updates.status) {
      if (updates.status === 'DELIVERED') {
        updates.deliveredDate = new Date().toISOString();
      } else if (updates.status === 'CANCELLED') {
        updates.cancelledDate = new Date().toISOString();
      }
    }
  });

  // Returns management
  this.before('UPDATE', 'Returns', async (req) => {
    const updates = req.data;
    
    // Set processed date for status changes
    if (updates.status && ['APPROVED', 'REJECTED', 'PROCESSED'].includes(updates.status)) {
      if (!updates.processedDate) {
        updates.processedDate = new Date().toISOString();
      }
    }
  });

  // Discount Codes management with validation
  this.before('CREATE', 'DiscountCodes', async (req) => {
    const discount = req.data;
    
    // Validate required fields
    if (!discount.code) {
      req.error(400, 'Discount code is required');
    }
    if (!discount.discountType) {
      req.error(400, 'Discount type is required');
    }
    if (!discount.discountValue) {
      req.error(400, 'Discount value is required');
    }
    if (!discount.validFrom) {
      req.error(400, 'Valid from date is required');
    }
    if (!discount.validTo) {
      req.error(400, 'Valid to date is required');
    }
    
    // Validate discount type
    if (!['PERCENTAGE', 'FIXED_AMOUNT'].includes(discount.discountType)) {
      req.error(400, 'Invalid discount type. Must be PERCENTAGE or FIXED_AMOUNT');
    }
    
    // Validate discount value
    if (discount.discountValue <= 0) {
      req.error(400, 'Discount value must be greater than 0');
    }
    
    // Validate percentage discount
    if (discount.discountType === 'PERCENTAGE' && discount.discountValue > 100) {
      req.error(400, 'Percentage discount cannot exceed 100%');
    }
    
    // Validate date range
    const validFrom = new Date(discount.validFrom);
    const validTo = new Date(discount.validTo);
    if (validFrom >= validTo) {
      req.error(400, 'Valid from date must be before valid to date');
    }
    
    // Set default values
    discount.isActive = discount.isActive !== undefined ? discount.isActive : true;
    discount.usedCount = discount.usedCount || 0;
    discount.minOrderAmount = discount.minOrderAmount || 0;
    
    // Check for duplicate codes
    const existingDiscount = await SELECT.one.from(DiscountCodes).where({ code: discount.code });
    if (existingDiscount) {
      req.error(400, `Discount code '${discount.code}' already exists`);
    }
  });

  this.before('UPDATE', 'DiscountCodes', async (req) => {
    const updates = req.data;
    const discountId = req.params[0];
    
    // Validate discount value if being updated
    if (updates.discountValue !== undefined) {
      if (updates.discountValue <= 0) {
        req.error(400, 'Discount value must be greater than 0');
      }
      
      // Get current discount to check type
      const currentDiscount = await SELECT.one.from(DiscountCodes).where({ ID: discountId.ID });
      if (currentDiscount && currentDiscount.discountType === 'PERCENTAGE' && updates.discountValue > 100) {
        req.error(400, 'Percentage discount cannot exceed 100%');
      }
    }
    
    // Validate date range if being updated
    if (updates.validFrom || updates.validTo) {
      const currentDiscount = await SELECT.one.from(DiscountCodes).where({ ID: discountId.ID });
      const validFrom = new Date(updates.validFrom || currentDiscount.validFrom);
      const validTo = new Date(updates.validTo || currentDiscount.validTo);
      
      if (validFrom >= validTo) {
        req.error(400, 'Valid from date must be before valid to date');
      }
    }
    
    // Prevent updating code to avoid duplicates
    if (updates.code) {
      const existingDiscount = await SELECT.one.from(DiscountCodes).where({ code: updates.code });
      if (existingDiscount && existingDiscount.ID !== discountId) {
        req.error(400, `Discount code '${updates.code}' already exists`);
      }
    }
  });

  // Admin action: Activate discount code
  this.on('activateDiscount', async (req) => {
    const { discountId } = req.data;
    
    if (!discountId) {
      req.error(400, 'Discount ID is required');
      return;
    }
    
    // Check if discount exists
    const discount = await SELECT.one.from(DiscountCodes).where({ ID: discountId });
    if (!discount) {
      req.error(404, 'Discount code not found');
      return;
    }
    
    // Update discount to active
    await UPDATE(DiscountCodes).set({ isActive: true }).where({ ID: discountId });
    
    return `Discount code '${discount.code}' activated successfully`;
  });

  // Admin action: Deactivate discount code
  this.on('deactivateDiscount', async (req) => {
    const { discountId } = req.data;
    
    if (!discountId) {
      req.error(400, 'Discount ID is required');
      return;
    }
    
    // Check if discount exists
    const discount = await SELECT.one.from(DiscountCodes).where({ ID: discountId });
    if (!discount) {
      req.error(404, 'Discount code not found');
      return;
    }
    
    // Update discount to inactive
    await UPDATE(DiscountCodes).set({ isActive: false }).where({ ID: discountId });
    
    return `Discount code '${discount.code}' deactivated successfully`;
  });
});
