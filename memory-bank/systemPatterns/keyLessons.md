## Key Lessons for CAP Development

### Bound Action Parameter Access
- Nested entity actions use `req.params[1].ID` for the nested entity
- Parent entity ID is available at `req.params[0].ID`
- URL structure determines parameter indexing

### Authorization in Related Entities
- Check authorization through entity relationships, not direct fields
- Use proper column selection to include relationship fields
- Always verify user ownership through the correct path

### Fiori Elements UI Integration
- Use `req.info()` for user-visible messages
- Add `@Common.SideEffects` for automatic UI refresh
- Structure action returns for API consistency

### Virtual Field Calculations
- Implement in after-read handlers for automatic calculation
- Handle both single results and arrays
- Perform calculations server-side for accuracy
