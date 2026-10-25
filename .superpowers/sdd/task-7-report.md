# Task 7 report

Status: complete

## Changes

- Classic Join now shows only Hider and Seeker initially.
- More roles reveals Observer without changing the existing `playerRole` values or stepped join flow.
- Castle Siege continues to use `CastleSiegeSeatPicker` unchanged.
- Added a player-visible patch changeset.

## Tests

- `npm test -- --run src/routes/JoinSession.test.tsx`: passed, 6 tests.
- `npx biome check src/routes/JoinSession.tsx src/routes/JoinSession.test.tsx .changeset/classic-observer-disclosure.md`: passed.
- `npm run typecheck`: blocked by pre-existing errors in `src/domain/map/mapTools.test.ts` involving incompatible tool unions.

## Commit

`feat(join): progressive-disclose classic observer`
