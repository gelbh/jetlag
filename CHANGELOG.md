# Changelog

## 0.1.0 — 2026-07-07

### Fixes

- Photo uploads: clearer permission errors and hider role checks before upload
- Matching wizard: category dropdown selection works reliably on mobile
- Metric sessions: radar defaults to 1 km; tentacle copy and distance labels use session units
- Question send: answer timer starts only after the question fully syncs
- Sea level measuring: send blocked until elevation region is ready

### Improvements

- Map pan hides tool panels without clearing your in-progress draft
- Drag tool panel handle down to minimize; tap the pill to expand again
- Wizard steps start with anchor / location before question options
- End game moved to More tools menu
- Single question timer in the top status bar (removed map duplicate)
- Reworked GPS anchor button and compact Home feedback link
- PWA update toast when a new version is available
- Create session: square, circle, or polygon play-area shapes with a clearer map boundary
- Create session and presets: fullscreen map for framing the game area
- Presets: save a framed game area from the editor
- Presets: search for a place when setting the play area
- Fullscreen play-area map: searched places show exact boundaries like the game map

### Technical

- Spatial Voronoi and geodesic buffers for more accurate elimination zones (matching & tentacles)
