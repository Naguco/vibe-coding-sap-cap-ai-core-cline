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