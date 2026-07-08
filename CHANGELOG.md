# Changelog

## 0.1.3 - 2026-07-08

### Fixes

- Create session: panning after place search keeps the searched boundary
- Photo answers: upload re-checks server role; clearer denial messages
- Questions: timers start and block new questions until the current one finishes
- Thermometer: GPS track completes without Firestore errors
- Sea level measuring: preview no longer shades the full play area at highest elevation
- Tentacle: choose a category before map preview loads
- Tentacle: Next works on anchor step before you pick a category
- Thermometer: manual pins send one answer prompt in multiplayer

### Improvements

- End game: hiders accept before the hiding zone reveal applies
- PWA updates: clearer reload banner
- Transit map: distinct stop icons per mode
- Hiding zone confirm no longer posts to seeker chat
- Thermometer wizard: movement-neutral copy and clearer distance step layout

### Technical

- Firestore: allow answerableAt patch on pending questions; end-game request and accept rules

## 0.1.2 - 2026-07-08

### Fixes

- Map screen: fix render loop that blocked session create and the tool dock
- Photo answers: hider can submit photo and cannot-answer replies in game chat
- PWA updates: skip broken service worker refresh on iOS Safari
- Map sync: stop reporting expected permission errors to Sentry

### Technical

- E2E: refresh visual baselines and align smoke session timeouts

## 0.1.1 - 2026-07-07

### Fixes

- Seeker map: pan and zoom no longer snap back on every sync
- Thermometer: distance step comes first; Start walk works after picking a distance
- Thermometer: Start walk shows errors in the panel and works in solo sessions
- Matching and measuring: map previews stay blank until you pick a category
- Tool dock: More menu closes an open question panel
- Status bar: game timer sits on the right after the round starts

### Improvements

- Error reporting: Sentry captures map crashes
- Config validation: startup checks catch incomplete Firebase or proxy env settings
- Session data: Firestore session, annotation, and question payloads validated on read
- Security: content security policy runs in report-only mode before enforcement

### Technical

- Timer display: shared date-fns clock formatting helpers
- E2E: Playwright visual baselines for home and join screens
- Functions: Zod validation on transit and Overpass proxy inputs

## 0.1.0 - 2026-07-07

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
