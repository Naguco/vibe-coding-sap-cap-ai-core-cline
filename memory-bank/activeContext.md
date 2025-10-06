# Active Context: CAP Bookstore Development

## Current Work Focus
**Phase**: Discount System Implementation - Phase 1 Complete
**Status**: Admin discount management complete, customer discount application pending
**Priority**: High - Implement customer-facing discount functionality

## Recent Actions Completed (Discount System)
1. ✅ **Data Model Extended**: Added DiscountCodes entity with proper fields and relationships
2. ✅ **Orders Schema Enhanced**: Added `originalAmount`, `discountAmount`, `appliedDiscountCode` fields
3. ✅ **Admin Service Extended**: Full CRUD operations for DiscountCodes with validation
4. ✅ **Admin Actions Implemented**: `activateDiscount` and `deactivateDiscount` functions
5. ✅ **Test Suite Updated**: Comprehensive failing tests created following TDD approach
6. ✅ **Schema Migration Fixed**: Updated existing order creation to include new required fields
7. ✅ **All Admin Tests Passing**: AdminService discount functionality fully tested and working

## Critical Issues Resolved
- **SQL Syntax Error**: Fixed query syntax using proper CAP CQN patterns (`discountId.ID`)
- **Breaking Schema Changes**: Updated both AdminService and CustomerService order creation
- **NOT NULL Constraints**: Ensured all order creation includes `originalAmount` and `discountAmount`

## **IMMEDIATE NEXT STEPS (Customer Discount Application)**

### Phase 3: Customer Discount Application (PENDING)
The following functionality needs to be implemented for customers to use discount codes:

#### 3.1 **Core Business Functions** (High Priority)
```javascript
// In customer-service.js - these functions are MISSING:

// Function: Calculate Order Total with Discount
this.on('calculateOrderTotal', async (req) => {
  // Input: { items: [...], discountCode?: string }
  // Logic: 
  //   1. Calculate original total from items
  //   2. If discountCode provided, validate and apply discount
  //   3. Return: { originalAmount, discountAmount, totalAmount, isValidDiscount }
});

// Function: Validate Discount Code
this.on('validateDiscountCode', async (req) => {
  // Input: { discountCode: string, orderTotal: number }
  // Logic:
  //   1. Check if code exists and is active
  //   2. Validate date range (validFrom <= now <= validTo)
  //   3. Check minimum order amount
  //   4. Check usage limits
  //   5. Return validation result with discount info
});
```

#### 3.2 **Enhanced Purchase Books Action** (High Priority)
```javascript
// Update existing purchaseBooks action to:
// 1. Accept optional discountCode parameter
// 2. Use calculateOrderTotal function to apply discount
// 3. Update discount usage counter
// 4. Link applied discount to order
```

#### 3.3 **Missing Test Cases** (High Priority)
The following tests need to be written following TDD (RED-GREEN-REFACTOR):

```javascript
// In test/customer-service.test.js:

describe('Discount Application', () => {
  // calculateOrderTotal function tests
  test('should calculate order total without discount');
  test('should apply percentage discount correctly');
  test('should apply fixed amount discount correctly');
  test('should respect minimum order amount');
  test('should not exceed maximum discount amount');
  
  // validateDiscountCode function tests  
  test('should validate active discount code');
  test('should reject expired discount code');
  test('should reject inactive discount code');
  test('should reject code below minimum order amount');
  test('should reject code that exceeds usage limit');
  
  // Enhanced purchaseBooks tests
  test('should purchase books with valid discount code');
  test('should purchase books with invalid discount code');
  test('should update discount usage counter after purchase');
});
```

#### 3.4 **Data Validation Requirements**
- Discount codes must be validated for:
  - Active status (`isActive = true`)
  - Valid date range (`validFrom <= now <= validTo`)
  - Minimum order amount (`orderTotal >= minOrderAmount`)
  - Usage limits (`usedCount < usageLimit` or `usageLimit IS NULL`)
  - Code existence and case sensitivity

#### 3.5 **Business Logic Rules**
- **Percentage Discounts**: Apply percentage to original amount, respect `maxDiscount` cap
- **Fixed Amount Discounts**: Subtract fixed amount, cannot exceed original amount
- **Usage Tracking**: Increment `usedCount` only after successful order creation
- **Error Handling**: Clear error messages for invalid codes, UI-friendly responses

## Immediate Next Steps
1. **Customer Discount Functions**: Implement `calculateOrderTotal` and `validateDiscountCode`
2. **Enhanced Purchase Flow**: Update `purchaseBooks` to handle discount codes
3. **TDD Implementation**: Write failing tests first, then implement functionality
4. **Integration Testing**: Test complete discount workflow end-to-end
5. **UI Integration**: Add discount code input fields to purchase flow

## Key Decisions Made

### Architecture Decisions
- **Multi-Service Approach**: Separate AdminService and CustomerService for clear role separation
- **Entity-Rich Model**: Comprehensive data model supporting all business requirements
- **Fiori Elements UI**: Standard SAP Fiori patterns for consistent user experience
- **Role-Based Security**: Fine-grained authorization at service and entity level

### Technology Choices
- **CAP Framework**: Node.js runtime with CDS modeling
- **SQLite Development**: Local development database
- **OData V4**: Service protocol for frontend integration
- **Fiori Elements**: UI generation with minimal custom code

## Current Development Environment
- **Working Directory**: `/Users/I569759/Documents/Presentations/Vibe Coding CAP/Demo/bookstore-app-ai`
- **Available Tools**: Node.js, npm, git, CAP CLI tools
- **Documentation Available**: CAP documentation in `cap-documentation/` directory

## Important Patterns and Preferences

### Service Design Preferences
- **Clear Separation**: Admin vs Customer services with distinct capabilities
- **Authorization First**: Security built into service definitions
- **Business Actions**: Custom actions for complex operations (purchase, return)
- **Audit Trail**: Temporal fields for all transactional entities

### UI Development Approach
- **Fiori Guidelines**: Strict adherence to SAP Fiori design principles
- **Object Pages**: Rich detail views for primary entities (Books)
- **List Reports**: Efficient browsing and filtering
- **Responsive Design**: Mobile-first approach

### Data Model Insights
- **Core Entities**: Books, Authors, Categories, Orders, OrderItems, Reviews, Returns
- **Key Relationships**: Author→Books (1:n), Order→OrderItems (1:n)
- **Business Rules**: Stock management, return policies, review restrictions
- **Audit Requirements**: Full tracking for orders and returns
- **User Management**: Handled externally via XSUAA/IAS integration

## Development Constraints and Considerations

### Business Rules to Implement
- **Stock Management**: Prevent overselling, track inventory levels
- **Return Policy**: Time limits, condition requirements, refund processing
- **Review System**: One review per customer per book, moderation capabilities
- **Purchase Process**: Cart management, payment validation, order confirmation

### Security Requirements
- **Role Isolation**: Customers cannot access admin functions via XSUAA roles
- **Data Privacy**: Customers only see their own orders/reviews using $user context
- **Admin Oversight**: Full visibility with proper audit trails
- **Authentication**: XSUAA integration with IAS for user lifecycle management
- **User Context**: Orders and Reviews linked to $user, not custom User entity

## Current Memory Bank Status
- **Project Brief**: ✅ Complete - Defines scope and requirements
- **Product Context**: ✅ Complete - User journeys and business value
- **System Patterns**: ✅ Complete - Architecture and design patterns
- **Technical Context**: ✅ Complete - Technology stack and setup
- **Active Context**: ✅ Complete - Current development state
- **Progress Tracking**: ⏳ Next - Implementation progress tracking

## Key Learnings and Project Insights

### CAP Best Practices
- **Service-First Design**: Define services before implementation
- **CDS Modeling**: Leverage CDS for both data and service definitions
- **Authorization Annotations**: Build security into the model
- **UI Annotations**: Generate UI with minimal custom code

### Bookstore Domain Knowledge
- **Inventory Management**: Critical for preventing overselling
- **Customer Experience**: Reviews and returns are key differentiators
- **Admin Efficiency**: Bulk operations and analytics are essential
- **Business Intelligence**: Sales trends and customer behavior insights

## Risks and Mitigation Strategies
- **Complexity Risk**: Mitigated by phased development approach
- **Authorization Risk**: Mitigated by early security implementation
- **UI Consistency Risk**: Mitigated by strict Fiori adherence
- **Data Integrity Risk**: Mitigated by proper validation and constraints
