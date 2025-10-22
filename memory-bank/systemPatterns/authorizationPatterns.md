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
