Status: fixed
Commit: pending
Tests: `npm test -- src/components/session/status/LocationPermissionPrompt.test.tsx` passed, 6 tests

Summary:
- Hid `LocationPermissionPrompt` while persisted location access is being restored.
- Added coverage for the quiet restore path so the Allow banner stays hidden.

Concerns:
- None.
