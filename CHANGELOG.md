# Changelog

## 0.2.1 - 2026-07-09

### Fixes

- App: fix blank screen on load from update banner outside the router
- Time traps: hiders can place traps without permission errors
- Photo uploads: heal session membership on storage denial with stronger retry
- Map: dock safe-area fix removes gap below the tool bar
- Home: safe-area background no longer shows a blue bar on notched devices

### Improvements

- Join: new players must match the session app version; existing members can continue after updating
- Presets: older saved presets migrate on load; unmigratable presets show a review banner
- Map nav: fixed top-left home and back links; sync and preload status as compact beacons
- Time trap panel: map pan and zoom work while the panel is open
- Preset list: card-style rows with expansion badges and clearer actions
- Advanced settings: collapsible sections with expansion and custom pack detail panels
- Create session: preset picker above game size; tentacle radius labels use your distance unit

## 0.2.0 - 2026-07-09

### Fixes

- Feedback: bug and idea links use GitHub Mobile-friendly issue templates

### Improvements

- Expansion Pack Vol. 1: host toggle, time trap placement on valid transit stations, and searchable curse reference (30 curses, rules text only)
- Advanced settings: custom question pack (7-Eleven, letter zone, major city, etc.), custom LineString/Polygon measuring geometry import, and optional question preview before send
- Map tools: copy anchor coordinates in matching and measuring wizards; default catalogs stay official base-game only unless hosts opt in
- Hider map: expansion actions grouped in one menu; time trap search has labeled field and empty-state guidance
- Copy coordinates: larger tap target with copy failure feedback
- Advanced settings: expansion toggles grouped in a fieldset

## 0.1.7 - 2026-07-09

### Fixes

- Feedback: GitHub bug and idea links open the structured templates

### Improvements

- Feedback: separate bug reports and improvement ideas; browse existing threads before posting

## 0.1.6 - 2026-07-09

### Fixes

- Timer: host leave pauses Firestore timer; guests see "Syncing timer…" while the session timer loads
- Photo uploads: wait for role sync; retry once on storage denial; clearer error copy
- Tentacles: committed out-of-reach answers shade the full search disk on the map

### Improvements

- End game: hiders can decline; seekers and hosts can cancel; clear map and reset board disabled during end game
- Radar: pick a distance before sending; multiplayer sends on the distance step
- Question tools: open in preview while another question is pending
- Sync rail: link-lamp on the map top-right; tap opens a compact sync status popover
- Chat: unread count on the dock badge; system game events count as unread
- Hider map: banner when GPS shows you outside your hiding zone after the hiding period
- Settings: leave session navigates home instead of the create flow; leave locally without ending the game for others; create session back link to home
- Preload: cancels background jobs when the app is hidden

## 0.1.5 - 2026-07-08

### Improvements

- Sheets: swipe down or scrim tap to dismiss; exit animations on map and home overlays
- Tool panel: drag handle with live feedback; dock highlight follows the active question tool
- Home → Map: view transition on session code when motion is enabled
- Map load: HUD skeleton instead of plain loading text
- Low power mode and reduced motion: instant transitions, no drag springs

## 0.1.4 - 2026-07-08

### Improvements

- Web analytics: optional GA4 page views in production

### Technical

- Functions: Firestore-backed rate limits on Overpass, transit, and vehicle proxies
- Functions: grantAccess failure throttling survives cold starts
- Release tooling: Changesets versions package.json and syncs in-app changelog

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
