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
