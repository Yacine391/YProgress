# YProgress V10 — Test Strategy

Automated tests cover static structure, feature-flag safety, sleep confidence/reconciliation, Autopilot limits, minimum-day safety, plateau behavior, recovery bounds and sleep-debt recommendations.

Before native integrations: test HealthKit permissions/data/background delivery, camera, notifications, persistence/offline sync on a real iPhone.

Before production: validate AI schemas, authentication/rate limits, privacy export/delete, malformed AI output, network failures, cost limits and App Store requirements.

No feature is considered complete until happy path, failure path, missing-data path and permission/offline paths are covered where relevant.
