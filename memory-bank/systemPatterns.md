# System Patterns: CAP Bookstore Architecture

## Overall Architecture

### Service-Oriented Design
The application follows CAP's service-oriented architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Fiori UI Layer                           │
├─────────────────────────────────────────────────────────────┤
│                    Service Layer                            │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐│
│  │   Admin Service     │  │    Customer Service             ││
│  │   - Full CRUD       │  │    - Read Books                 ││
│  │   - Analytics       │  │    - Purchase                   ││
│  │   - User Mgmt       │  │    - Reviews                    ││
│  └─────────────────────┘  │    - Returns                    ││
│                           └─────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│                    Data Model Layer                         │
│   Books | Authors | Categories | Orders | Reviews | Users   │
├─────────────────────────────────────────────────────────────┤
│                    Database Layer                           │
└─────────────────────────────────────────────────────────────┘
```

## Core Entity Patterns

### Domain Entities
- **Books**: Central entity with rich metadata
- **Authors**: Separate entity for author management
- **Categories**: Hierarchical categorization system
- **Orders**: Purchase transaction records
- **OrderItems**: Line items for each order
- **Reviews**: Customer feedback and ratings
- **Returns**: Return request management
- **User Management**: Handled via XSUAA/IAS (no custom User entity)

### Relationship Patterns
- **One-to-Many**: Author → Books, Category → Books
- **Many-to-Many**: Books ↔ Categories (through association)
- **Composition**: Order → OrderItems, Order → Returns
- **User Context**: Orders and Reviews linked via $user (XSUAA context)

## Service Design Patterns

### AdminService Pattern
```cds
service AdminService {
  // Full entity exposure with unrestricted access
  entity Books as projection on bookstore.Books;
  entity Authors as projection on bookstore.Authors;
  entity Categories as projection on bookstore.Categories;
  entity Orders as projection on bookstore.Orders;
  entity Reviews as projection on bookstore.Reviews;
  entity Returns as projection on bookstore.Returns;
  
  // Admin-specific views and analytics
  view SalesAnalytics as select from Orders;
  view InventoryReport as select from Books;
}
```

### CustomerService Pattern
```cds
service CustomerService {
  // Read-only catalog access
  @readonly entity Books as projection on bookstore.Books;
  @readonly entity Authors as projection on bookstore.Authors;
  @readonly entity Categories as projection on bookstore.Categories;
  
  // Customer-specific operations (filtered by XSUAA user context)
  entity MyOrders as projection on bookstore.Orders where createdBy = $user;
  entity MyReviews as projection on bookstore.Reviews where createdBy = $user;
  entity MyReturns as projection on bookstore.Returns where createdBy = $user;
  
  // Actions for business operations
  action purchaseBooks(items: array of PurchaseItem) returns Order;
  action returnBook(orderId: UUID, bookId: UUID) returns ReturnRequest;
}
```

## Authorization Patterns

### Role-Based Access Control
```cds
// Roles definition
annotate AdminService with @requires: 'admin';
annotate CustomerService with @requires: 'customer';

// Fine-grained restrictions
annotate CustomerService.Books with @restrict: [
  { grant: 'READ', to: 'customer' }
];

annotate CustomerService.MyOrders with @restrict: [
  { grant: ['READ', 'CREATE'], to: 'customer', where: 'createdBy = $user' }
];
```

### Data Privacy Patterns
- **Personal Data Isolation**: Customer can only access their own orders/reviews
- **Admin Oversight**: Administrators can view all data but with audit trails
- **Secure Transactions**: Purchase operations are atomic and logged

## UI Architecture Patterns

### Fiori Elements Integration
```
Customer App Structure:
├── BookCatalog (List Report)
├── BookDetails (Object Page)
├── MyPurchases (List Report)
├── PurchaseHistory (Object Page)
└── ReturnProcess (Form/Workflow)

Admin App Structure:
├── BookManagement (List Report + Object Page)
├── OrderManagement (List Report + Object Page)
├── CustomerManagement (List Report + Object Page)
├── Analytics Dashboard (Analytical List Page)
└── InventoryTracking (List Report)
```

### Navigation Patterns
- **Semantic Object-Based**: Books → BookDetails → Reviews
- **Cross-App Navigation**: From Customer to Admin context (role-dependent)
- **Deep Linking**: Direct access to specific books/orders via URL

## Data Model Patterns

### Temporal Data Pattern
```cds
entity Orders {
  // Audit fields for temporal tracking
  createdAt  : Timestamp @cds.on.insert: $now;
  createdBy  : String    @cds.on.insert: $user;
  modifiedAt : Timestamp @cds.on.insert: $now @cds.on.update: $now;
  modifiedBy : String    @cds.on.insert: $user @cds.on.update: $user;
}
```

### Business State Management
```cds
type OrderStatus : String enum {
  PENDING;
  CONFIRMED;
  SHIPPED;
  DELIVERED;
  RETURNED;
}

type ReturnStatus : String enum {
  REQUESTED;
  APPROVED;
  REJECTED;
  PROCESSED;
}
```

## Integration Patterns

### Event-Driven Architecture
- **Order Events**: Created, Updated, Shipped, Delivered
- **Inventory Events**: Stock Updated, Low Stock Alert
- **Customer Events**: Review Added, Return Requested

### External Service Integration
- **Payment Processing**: Integration pattern for payment gateways
- **Inventory Sync**: Real-time stock level management
- **Notification Service**: Email/SMS for order updates

## Error Handling Patterns

### Validation Patterns
- **Business Rules**: Stock availability, return policies
- **Data Integrity**: Required fields, format validation
- **Authorization**: Access control and user context validation

### Recovery Patterns
- **Transaction Rollback**: Failed purchase recovery
- **Compensation**: Return processing and refund handling
- **Audit Trail**: Complete operation logging for troubleshooting
