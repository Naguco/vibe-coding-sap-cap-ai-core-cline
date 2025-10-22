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
