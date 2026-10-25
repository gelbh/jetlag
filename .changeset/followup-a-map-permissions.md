---
"jetlag": patch
---

fix: Wait for session membership before opening live map listeners so mid-join permission storms stop
tech: Tag unexpected Firestore listen and write failures with firestore_op for Error Tracking
