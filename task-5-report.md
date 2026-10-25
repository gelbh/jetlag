# Task 5 report

Status: complete

Changes:

- Capped the seeker strip to enabled primary question tools.
- Added a labeled More control and SheetHost menu for enabled overflow questions.
- Kept Undo and Redo adjacent to the question strip.
- Switched the seeker active wash to `flag` and `flag-soft`.
- Preserved rule filtering, inactive handling, ask-first behavior, and menu dismissal.

Tests: `ToolDock.test.tsx`, 21 passed.

Typecheck: blocked by existing `src/domain/map/mapTools.test.ts` union narrowing errors involving `QUESTION_DOCK_TOOL_IDS`, `QUESTION_DOCK_PRIMARY_IDS`, and `QUESTION_DOCK_OVERFLOW_IDS`.

Concerns: ask-first intentionally hides the dock while an ask-owned tool is active, so overflow selection remains available before activation and through the More sheet.

Commit: `feat(map): distill seeker ask dock into more menu`
