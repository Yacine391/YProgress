# YProgress V8 — Foundation Architecture

## Goal
Build the complete base first, then progressively fill providers and intelligence without rewriting the app.

### Layers
1. UI / features
2. domain rules
3. local storage
4. provider adapters
5. AI server
6. analytics/event log
7. native iOS capabilities

### Single source of truth
All daily state should eventually be derived from:
- profile
- targets
- health observations
- nutrition entries
- training sessions
- recovery
- schedule/context
- coach decisions

### Provider strategy
HealthKit is an adapter, not the domain model. This makes the app testable and keeps the core independent from iOS.

### AI strategy
The iPhone never stores the provider API key. The app calls the AI server. The server validates and normalizes model output before the app accepts it.

### Progressive rollout
Phase 0: foundation + mock data
Phase 1: local persistence
Phase 2: HealthKit
Phase 3: meal vision
Phase 4: coach
Phase 5: training progression
Phase 6: weekly learning/projections
Phase 7: widget/voice/live activity
Phase 8: production hardening
