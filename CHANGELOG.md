# Changelog

## 0.5.12 - 2026-07-13

### Fixes

- Map: elimination shading worker runs again under enforced CSP.
- Map: location and question tools load map data again (Overpass proxy + App Check under CSP).
- Firebase: App Check reCAPTCHA loads under content security policy.
- Premium: Google sign-in works again under enforced content security policy.
- Premium: Google sign-in falls back to full-page redirect when the popup is blocked.
- Premium: sign out from Premium, Create session, and Admin sign-in gates.
- Sentry: error reports use a first-party tunnel so browser blockers are less likely to drop them.
- Sentry: tunnel POST requests reach the Worker instead of the static asset handler.
- Map sync: Retry on the sync rail replays queued map pins after a failed upload.
- Map sync: avoid update-depth loop when leaving a session.
- Motion: leaving or ending a session from the map no longer leaves the map in back history.
- Motion: edge swipe back works with Reduce Motion enabled (instant navigation, no transition).
- Presets: saving from Create session keeps region-pack boundaries and transit metro when reloaded.

### Improvements

- Admin map: mission-control layout on tablet and desktop with a collapsible side rail for diagnostics, sync, stats, map debug, log, chat, and moderation.
- Motion: unified sheet and panel drag physics, iOS-calibrated motion tokens, and expanded tap feedback with Vibration API fallback on web.
- Motion: iOS-style route push/pop transitions, global edge-swipe back, and unified session exit so map teardown runs after the home transition.
- Motion: retuned mobile sheets, wizard steps, and map panel snap to iOS-calibrated timing on the critical path.
- Map sync: queue map pins when the connection is unstable, not only when the browser says offline.
- Map sync: clearer offline and unstable connection copy with working Retry guidance.
- Map: warn when Firestore offline cache is unavailable on this device.
- Create and join: preload game-area map data even when the connection flickers, using cached boundaries when live fetch fails.
- Map: cache bundled geo JSON in the service worker after first load for flaky connections.

### Technical

- Offline write queue schema now tags annotation entries for future write kinds.
- Sentry: filter Leaflet teardown, App Check invalid-session, and dev HMR refresh noise.

## 0.5.11 - 2026-07-12

### Fixes

- Map: elimination shading worker runs again under enforced CSP.
- Map: location and question tools load map data again (Overpass proxy + App Check under CSP).
- Firebase: App Check reCAPTCHA loads under content security policy.
- Premium: Google sign-in works again under enforced content security policy.
- Map sync: Retry on the sync rail replays queued map pins after a failed upload.

### Improvements

- Map sync: queue map pins when the connection is unstable, not only when the browser says offline.
- Map sync: clearer offline and unstable connection copy with working Retry guidance.
- Map: warn when Firestore offline cache is unavailable on this device.
- Create and join: preload game-area map data even when the connection flickers, using cached boundaries when live fetch fails.
- Map: cache bundled geo JSON in the service worker after first load for flaky connections.

### Technical

- Offline write queue schema now tags annotation entries for future write kinds.

## 0.5.10 - 2026-07-12

### Improvements

- Presets: star favourites in browse and the create-session picker.
- Map: centered question panel titles, smoother panel snap and tool dock selection, tentacle search preview before category pick.
- PWA: clearer update notice on phone — waits until your game ends, refresh button only when safe.
- Settings: trim duplicate rules summary when editing game rules in the map settings sheet.

## 0.5.9 - 2026-07-12

### Improvements

- Sessions: inactive games auto-end after 24 hours with no map activity; session codes become reusable sooner.
- Admin: desktop monitor pane shows the live map beside the session list on wide screens.
- Admin: monitor map includes force end, reset board, cleanup code, and session diagnostics.

## 0.5.8 - 2026-07-12

### Technical

- Worker typecheck via `tsconfig.worker.json`; CI validates bundles with `wrangler deploy --dry-run`
- CSP header is enforcing (was Report-Only); disable public `workers.dev` URL; enable Worker observability

## 0.5.7 - 2026-07-12

### Fixes

- Error screens: keep router context so Back home works after a crash
- Session reset: reliable host progress reset and stale pending-question guard
- Observer map: admin observe frames the session play area instead of 0,0
- Map sync: subscription errors no longer thrash Firestore listeners

### Improvements

- PWA: stale route chunks activate the latest app version before reload
- PWA: deferred chunk reload runs when you leave the map after an update
- PWA: asset requests no longer fall back to the app shell via the service worker
- Hider settings: hide clear map when unavailable
- Admin: live sessions list scales with bounded concurrency and pagination

### Technical

- Sentry: Web Vitals tracing, session replay, and Firestore permission breadcrumbs enabled in production
- Deploy: correct wrangler action command and rename worker deploy script
- Firebase: connect Functions emulator in local dev
- Motion: decorative animations respect low-power mode independently of essential motion

## 0.5.6 - 2026-07-12

### Fixes

- Question wizards: repair panel flex layout so Send to hiders and answer actions stay visible on live map

### Improvements

- Observer map: admin observers see live seeker and hider GPS pins on the session map
- Admin: live sessions list sorts by recent activity so active games surface first
- PWA: stale route chunks wait until you leave the map screen before reloading
- PWA: app updates apply automatically after a session ends on all platforms
- Join: newer app versions can join sessions created on older builds
- Join: returning players rejoin the same code without a spurious version mismatch
- Join: version mismatch messages say whether you need an update or the host should start a new session
- Boot: tutorial route loads on demand instead of on first paint
- Boot: Firebase storage and callable functions load when first needed, shrinking the opening bundle
- Live map: GPS marker keys stay stable across location updates to cut map flicker
- Live map: elimination shading runs in a background worker so the map stays responsive during heavy annotation load

### Technical

- Deploy: frontend static assets now deploy to Cloudflare Workers instead of Pages

## 0.5.5 - 2026-07-12

### Fixes

- Radar: pin Send to hiders on the distance step so it stays visible in the wizard panel
- Matching: pin Send to hiders on the resolve step so it stays visible in the wizard panel
- Thermometer: pin Send to hiders on the placement step so it stays visible in the wizard panel
- Tentacle: pin Send to hiders on the locations step so it stays visible in the wizard panel
- Home: logo, title, and version clear the top gradient accent on PWA safe-area insets

## 0.5.4 - 2026-07-12

### Fixes

- Home: tutorial, admin, and version controls render above the top gradient accent
- Observer map: thermometer walk distance uses session units
- Hider chat: station truth works when hiding zone is already set, including after rejoin

### Improvements

- Live map: nearby seeker and hider GPS markers merge into one pin with a count tooltip
- Live map: hiders and observers see live hider GPS; seekers still see seeker pins only
- Thermometer walk map overlay: HUD-styled progress pill, markers, and axis line

## 0.5.3 - 2026-07-12

### Fixes

- Boot: home screen loads before Firebase auth finishes instead of a blank navy screen
- Boot: Firebase auth falls back when IndexedDB is unavailable on iOS Safari
- PWA: stale JavaScript chunks reload once instead of serving HTML for asset requests
- PWA: iOS home-screen installs auto-reload for waiting updates outside an active map session

## 0.5.2 - 2026-07-12

### Fixes

- Tentacle answer step scrolls with many POI options
- PWA update banner on iOS; Reload without force-close
- Satellite toggle matches basemap under low power mode
- Tutorial split cards equal height; interactive step fits one screen

### Improvements

- Admin: filter live sessions by code, area, or phase; session cards show play area location
- Admin observe: join live sessions regardless of app version mismatch
- Create session: Premium tier pre-selected for subscription and trial hosts

## 0.5.1 - 2026-07-12

### Fixes

- Admin: live sessions show a clear message when the backend is unavailable instead of INTERNAL
- Tentacle wizard: answer step scrolls with the commit button pinned at the bottom
- Tutorial hub: Markup, Hider, and Extras cards stack in one column
- Tutorial preview: committing a practice question locks the wizard and keeps map shading
- Tutorial walkthrough: back arrow on screenshot steps; progress counts three walkthrough steps, not the interactive try step
- Region presets: bundled park, hospital, museum, and airport lists drop clinics, squares, archives, and private strips

### Improvements

- Session settings: host can reset all session progress while keeping the same code and roster
- Home: entry screen locks to the viewport without phantom scroll under the top accent bar
- Premium: home and create session reuse cached entitlement state across navigation
- Motion: low power mode still shows sheet and panel enters; decorative motion stays off

### Fixes

- Map: leaving or ending a session clears active tools, annotation UI, and preload jobs
- Measuring: bundled park lists for region packs no longer include duplicate or non-park entries (Portland GIS cleanup and dedup across presets)

## 0.5.0 - 2026-07-12

### Improvements

- Motion: sheets, panels, and wizards use CSS animations only; low power mode and reduced motion still turn off decorative motion
- Map: elimination shading recomputes faster after each answer
- Tutorial: thermometer walkthrough uses live wizard, split panel, and map previews instead of PNGs
- Tutorial: interactive intro lets you try the wizard, then choose Got it or See walkthrough
- Tutorial: questions hub highlights the next question and shows a progress rail per type

## 0.4.8 - 2026-07-12

### Fixes

- Question wizards: panels stay open on launch; expand works after pan or drag minimize
- Question wizards: taller scrollable panels so thermometer and chip steps are not clipped
- Wizards: back and next controls sit beside the step dots instead of a full-width footer row
- Tutorial: screenshot borders hug images; cards use full phone height with spaced body copy
- Tutorial: questions hub is a single-column scrollable list with title, summary, and progress

## 0.4.7 - 2026-07-12

### Fixes

- Wizards: swipe between steps works on buttons, screenshots, and inputs; step nav stays visible
- Tutorial: back and next icon controls on every step; screenshots no longer push nav off screen

### Improvements

- Wizards: full-width step slide on capable devices; slimmer map panels with auto-peek on placement steps
- Tutorial: tighter hub and step layout that fits one screen without scrolling
- Map settings: distance unit and map style pickers use the same pill segment control as other settings tabs.
- Motion: smoother transitions on capable devices; app falls back to lightweight CSS animations when CPU, memory, network, or frame rate is constrained.
- Motion: sheet and panel drag gestures use Framer on capable devices; shared sheet titles and tool dock highlight animate on top-tier devices.
- Join and feedback screens: press feedback on primary actions and GitHub links.

### Technical

- Components: shared primitives for advanced settings, map alerts, OAuth sign-in, and tool wizards; split large tool panels, edit sheet, map chrome, and route screens.

## 0.4.6 - 2026-07-12

### Fixes

- Session join: block version-gate bypass when returning member UID is not locally persisted; members-only session reads
- Auth: premium and proxy paths wait for restored sign-in; game paths no longer mint anonymous users after auth timeout
- Stripe billing: clear subscription fields when replacing a stale test-mode customer after live cutover
- Session heal: one membership heal path removes ghost UIDs when auth drifts on resume
- Create session: keep the back button and logo below the status bar clock and battery

### Improvements

- Prince Rupert: ship real BC Transit GTFS bundle (109 stops, 8 routes)
- Map, create session, and measuring tool: split large route and hook files for maintainability

### Technical

- GTFS builds: strip UTF-8 BOM from BC Transit CSV exports before parsing

## 0.4.5 - 2026-07-11

### Fixes

- Premium checkout: fix billing error after switching to live Stripe; show a clear message when checkout fails
- Premium checkout: stay signed in after Stripe redirects back to the app
- App updates: keep Google and email sign-in after reload or PWA update

### Improvements

- Recommended presets: add Prince Rupert, BC with neighbourhood boundaries, bundled POI, and BC Transit.

## 0.4.4 - 2026-07-11

### Fixes

- Home and map: resume rejoins automatically when sign-in changed but the session is still active
- Map HUD: sync, preload, and timer popovers open again while chat or settings is up
- Radar: block custom CHOOSE distances above the game-size preset cap at commit

### Improvements

- Recommended games: Portland, Maine with Greater Portland metro, five council districts, and GP Metro bus transit matching.
- Recommended games: Portland, Maine metro adds Cape Elizabeth, Scarborough, and Yarmouth; measuring and tentacles merge bundled park POI from city GIS.
- Play area outline: drop spurious interior rings after unioning bundled admin boundaries (Portland, Maine and other multi-municipality presets).
- Region-pack sessions: refresh bundled play area and matching categories when geo assets change instead of using stale Firestore copies.
- Tool panels: show the question name (Matching, Radar, Measuring, and others) in the panel header
- Radar: distance picker shows only presets allowed for the session game size
- Recommended games: derive game size from each preset play area instead of defaulting to medium
- Tutorial: hub and steps fit one screen without scrolling; screenshots fill the frame; tap to enlarge
- Wizards: swipe left or right between steps in question tools, hider zone, and tutorial
- App: pinch zoom no longer zooms menus and tutorial pages; map zoom unchanged

## 0.4.3 - 2026-07-11

### Fixes

- Join: honor the role you pick when joining, including a second hider in the same session
- Custom games: fix scrolling on the presets list when content exceeds the screen
- Premium recovery: require verified email before merging purchases from another account
- Preset games: show a map warning when bundled admin categories fail to load
- Premium sign-in: show an error when purchase recovery fails; note when credits move from a previous device
- Create session: disable Confirm while the premium sign-in gate is visible
- Premium trial: block start when your Stripe subscription payment is past due
- Map: radar and tentacle circles use stored answer radius when older questions lack radius metadata

### Improvements

- Tentacles: committed questions show the search radius circle on the map
- Tentacles: elimination shading matches the full search disk minus the answered location
- Tentacles: map preview circle waits until a category is chosen

### Technical

- CI: skip manual tutorial screenshot capture specs in default e2e runs
- Deploy: billing client changes trigger a functions deploy before the frontend ships

## 0.4.2 - 2026-07-11

### Fixes

- Tutorial: drop redundant answer wizard steps; solo vs hiders split covers the final panel
- Measuring tutorial: fix hiders split screenshot that showed a geo lookup error instead of Send to hiders
- Tutorial screenshots: each question type starts on a clean map instead of carrying over the previous question
- Question tutorials: add a full-map step after solo vs hiders and before the zoomed close-up
- Radar: show the committed range circle on the map, not just the center dot
- Tentacles: committed questions show the search radius circle on the map
- Tentacles: elimination shading matches the full search disk minus the answered location
- Tentacles: map preview circle waits until a category is chosen
- Question tutorials: photo map step waits for unread chat badge; radar hiders split shows Send to hiders; map close-ups include elimination fill
- Tutorial: cap screenshot width to phone size on desktop so images are not oversized
- Tutorial: replace On the map with a Questions hub; each question type has its own wizard and map walkthrough
- Tutorial: reviewing a completed section starts at step 1; last step offers the next section or hub
- Tutorial screenshots: show real map tiles instead of broken red placeholders
- Custom games: fix scrolling on the presets list when content exceeds the screen
- Settings panel: fix tab content showing through above the header while scrolling
- Create session: pin the back button in the setup sheet so it stays readable and content does not scroll behind it
- Entry screens: show the Jet Lag logo and back control together in a fixed top header on create, join, tutorial, feedback, premium, and custom games
- Create session: move the header above the map; back control is plain text without a chrome border
- Create session: shrink the preview map to about one third of the screen so the setup sheet has more room
- Hider dock: match icon sizes across all dock buttons
- Hiding zone wizard: method step no longer preselects Station
- Premium recovery: require verified email before merging purchases from another account
- Premium sign-in: sign in to your existing Google or email account when returning on a new device instead of showing credential-already-in-use
- Preset games: show a map warning when bundled admin categories fail to load

### Improvements

- Changelog: older releases collapse by default; tap Show to expand
- Tutorial: sectioned walkthrough from Home with screenshots for every map tool
- Hiding zone wizard: step-by-step flow for station vs map placement, larger station list, peek label and close on the panel
- Premium sign-in: show an error when purchase recovery fails; note when credits move from a previous device
- Create session: disable Confirm while the premium sign-in gate is visible
- Legal: Privacy Policy and Terms of Service pages with links from Home and Premium sign-in
- Home: Premium button shows your plan and renewal date when you have a subscription or lifetime access
- Home: Premium button uses blue styling when you have session pack credits but no subscription
- Premium page: session packs and unlimited hosting in tabs with a denser layout so less scrolling is needed
- Premium trial: one 7-day free trial with no Stripe checkout; unlimited hosting ends when the trial expires unless you buy packs or subscribe
- Premium session packs: credits stay on your account while a trial or subscription is active and return when unlimited hosting ends
- Create session: show the Premium tier only when you have a subscription, free trial, or lifetime access

### Technical

- Premium recovery: paginate Stripe customer lookup, rate-limit recovery calls, skip already-migrated accounts
- Map preload: resolve bundled matching areas once through session rules

## 0.4.1 - 2026-07-11

### Fixes

- Map: auto-reload once when a lazy route chunk fails to load after deploy
- Matching and Measuring: bundled preset games show local admin categories (borough, ward, LEA) again

### Improvements

- Premium purchases: sign in with email, Google, or Apple before checkout so credits follow your account across devices.
- Matching: transit_line uses full GTFS stop and route graphs for London, NYC, Dublin, SF, and Chicago
- Live transit: Chicago premium sessions load CTA bus and L train positions through the vehicles proxy
- Sea level measuring: USGS EPQS elevation for US play areas with Open-Meteo fallback elsewhere
- NYC region pack: bundled Wikidata POI lists for museums, parks, hospitals, and other measuring categories
- London and Dublin region packs: bundled Wikidata POI lists for measuring and tentacle categories
- Tentacles: merge bundled museum and hospital POIs when a region pack is set
- Premium sessions: Overpass proxy uses a priority queue and server-side warm preload when the game area is set

### Technical

- Cloud Functions: Sentry release tag reads version from functions package.json

## 0.4.0 - 2026-07-11

### Fixes

- PWA: poster background fills the home-indicator zone on entry screens
- Map: top safe-area uses solid app background instead of map tiles behind the status bar
- Map: map extends to the bottom of the screen; tool dock floats above the home indicator

### Improvements

- Premium billing: Stripe checkout for session packs, monthly and yearly unlimited, lifetime access, and a 7-day subscription trial
- Create session: paid hosts unlock premium without an access code; access codes still work for beta hosts
- Home: Premium page lists plans and shows your remaining sessions or subscription status

### Technical

- Cloud Functions: Stripe webhooks, checkout, billing portal, and paid premium session creation

## 0.3.0 - 2026-07-11

### Improvements

- Recommended games: Hide + Seek show metros for NYC, London, Tokyo, Osaka, Zürich, and Lucerne
- Bundled presets: borough and ward play areas with local admin matching for each metro
- Create session: recommended presets set game size, distance unit, expansion pack, and transit metro where supported

## 0.2.4 - 2026-07-11

### Fixes

- Matching wizard: step stays put when you pan the map
- Tool panel: stays collapsed after pan if you minimized it first
- Map clicks: wizard anchor step only; no accidental reset mid-flow
- Dublin games: hide country and province admin borders in matching and measuring
- Dublin county: play area size uses the full county boundary, not the first polygon slice
- Dublin county: play area outline no longer draws internal council seams when admin borders are off
- Play area mask: stroke only outer rings; no hole or tint edge lines on complex boundaries
- Admin boundaries: Dublin games only load local authority and LEA reference lines
- Admin divisions: hide border options until play-area counts finish loading
- Photo tool: no stale finish-open-question warning when nothing is pending
- Measuring: drop duplicate coastline distance line in the preview
- Seeker map: your location dot renders above other markers with a You label
- Photo uploads: refresh auth token before upload; default JPEG type when the file has none
- PWA: fill safe-area band on Home and Join with the app background
- Custom measure geometry: fix crash when advanced settings list is missing

### Improvements

- Map settings: optional admin boundary reference layer (off by default)
- Admin boundaries: level-weighted strokes; readable on satellite basemap
- Tool previews: admin border overlays match standard and satellite basemap
- Chat badge: larger count pill with pulse on new messages
- Hider map: bottom dock matches seeker tool dock layout and safe-area
- Thermometer walk: start and live markers, distance label, satellite-aware line
- Map controls: zoom and basemap sit higher when the tool panel is minimized

### Technical

- Error reporting: filter QuotaExceededError noise

## 0.2.3 - 2026-07-10

### Fixes

- Map: tool dock safe-area band no longer adds a dark empty stripe below icons on iPhone
- Photo uploads: confirm hider access against the server before upload
- Photo uploads: clearer errors when sign-in and session membership diverge

### Improvements

- Custom games: search presets by name or place; results show in a flat list while you type

## 0.2.2 - 2026-07-10

### Fixes

- Map: compact tool dock height on iPhone no longer stacks icon row and safe-area padding
- Map: tool panel minimizes instantly when panning and stays pinned to the screen bottom while the dock hides
- Photo uploads: fix production Storage permissions so hiders can upload on mobile
- Photo uploads: accept gallery picks with missing file types; clearer unsupported format errors
- Photo uploads: remove orphaned files when saving the answer fails

### Improvements

- Dublin games: built-in presets with local authority and local electoral area matching
- Dublin presets: play areas use exact council boundaries instead of rectangular boxes
- Recommended games: browse bundled presets in a collapsible continent → country → region tree
- Matching and Measuring: admin division levels appear only when the play area has at least two divisions

### Technical

- Backend deploy: include Firebase Storage rules with Firestore and Functions

## 0.2.1 - 2026-07-09

### Fixes

- App: fix blank screen on load from update banner outside the router
- Time traps: hiders can place traps without permission errors
- Photo uploads: heal session membership on storage denial with stronger retry
- Map: dock safe-area fix removes gap below the tool bar
- Map: tool dock sits flush on iPhone home-screen installs without a double bottom bar
- Home: safe-area background no longer shows a blue bar on notched devices
- Map: sync and preload beacons sit flush below the status bar on notched iPhones and when two timers stack

### Improvements

- Join: new players must match the session app version; existing members can continue after updating
- Join: fix permission errors when joining a session as hider or seeker
- Presets: older saved presets migrate on load; unmigratable presets show a review banner
- Map nav: fixed top-left home and back links; sync and preload status as compact beacons
- Time trap panel: map pan and zoom work while the panel is open
- Preset list: card-style rows with expansion badges and clearer actions
- Advanced settings: collapsible sections with expansion and custom pack detail panels
- Create session: preset picker above game size; tentacle radius labels use your distance unit
- Map preload beacon: refresh icon matches HUD chrome and spins while map data loads
- Map preload panel: progress bar, broadcast title, and dismiss action aligned with sync status popover
- Map HUD: borderless home button stays centered as the status bar grows; preload refresh beacon matches sync size with solid icon

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
