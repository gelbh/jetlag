Status: done

Summary:
- Wired `useLiveLocation` to await `restoreLocationAccessIfPersisted()` before the prompt early return.
- Kept the existing no-flag prompt test and added coverage for restored access skipping the prompt.
- Added the optional persisted-confirmation write-back after the granted path succeeds.

Tests:
- `npx vitest run src/hooks/location/useLiveLocation.test.ts`

Concerns:
- None.
