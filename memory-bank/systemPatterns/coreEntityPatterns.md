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
