---
"jetlag": patch
---

Session actions that need signal (join, leave, end, role codes, rematch) now say "Needs a connection" right away instead of hanging, and retry safe ones automatically on a flaky network.
