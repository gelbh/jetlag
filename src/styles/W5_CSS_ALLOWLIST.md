# Wave 5 CSS allowlist (final / W5-E)

Source of truth for remaining global player chrome CSS after Waves 5-A…E.
Do not delete **geometry** or **bridge** rows without Cap/WebView proof (AC #10).
Thin **keep** residuals (ScreenNav / admin / wizard / banners) wait Wave 7 or on-touch migrate.

| Field | Value |
| --- | --- |
| Tip SHA (pre-W5-E prune) | `125dd2c7` (W5-D #583) |
| Baseline `wc -l src/styles/*.css` (pre `map-hud.css` delete) | **5053** |
| Baseline after orphan `map-hud.css` delete | **5052** |
| After W5-C panel kill | **~3782** |
| After W5-D dock band | **3206** |
| After W5-E prune (this band) | **3150** (−56 vs W5-D tip 3206; −1903 vs W5-A baseline 5053) |
| Band | W5-E (prune dead selectors; final allowlist) |

## Classes

| Class | Meaning |
| --- | --- |
| **keep** | Still referenced residual chrome; migrate later (Wave 7 / on-touch), not emptied. |
| **geometry** | MapLibre / left-stack / safe-area / hit-target CSS. Keep until proven replacement. |
| **bridge** | Env/safe-area vars, motion, scrollbars, tokens. Keep until Cap AC proven or theme fully owns. |
| **delete** | Removed in a prior band (or zero-consumer rules pruned in W5-E). |

## Final inventory (every remaining `src/styles/*.css`)

| File | Class | Notes |
| --- | --- | --- |
| `tokens.css` | bridge | Residual `@theme` color/radius; prefer `jetlagBrand` for new UI. |
| `base.css` | bridge | Fonts, dock/safe-area/z-index CSS vars (`env(safe-area-*)`). Theme mirrors via `jetlagBrand` / `--jl-*`. |
| `primitives.css` | keep | `hud-*` / `btn-*` / `field-*` / `screen-back-control` for ScreenNav, banners, admin, sheets. Map floating controls already `hudChromeStyles`. |
| `scrollbars.css` | bridge | Scrollbar skin until chrome kill. |
| `map-shell.css` | geometry (+ keep carve-out) | Container / dvh / safe-area / sync-preload **positioning**. Later: `.jl-status-*`, `.map-float-alert`, dock-waiting skins. |
| `map-tool-dock.css` | keep | Panel-above-dock geometry, wizard nav, unread pulse, route-fallback skeleton. Slot/menu chrome already Mantine. |
| `map-chrome-controls.css` | geometry (+ keep) | MapLibre canvas / touch / basemap filters / attrib hide; zoom/style inset positioning; interact/landscape distill; thermometer walk marker skins. |
| `map-compass-control.css` | geometry | Needle + tier bottom; optional later ActionIcon skin. |
| `map-bottom-chrome.css` | geometry | `--map-left-*` stack bases/tiers, safe-area insets, side-stack snap / drag glass. Island/ToolDeck already Mantine. |
| `map-attribution.css` | geometry | MapLibre attribution + ask/matching clearance. |
| `map-touch-gestures.css` | geometry | Imported from MapView (not `index.css`). Gesture pass-through + popup geometry. |
| `motion.css` | bridge | Keyframes / reduced-motion contracts (`map-attention-pulse`, `jl-unread-pulse`, …). |
| `route-transition.css` | bridge | Route transition motion. |
| `motion-utilities.css` | bridge | Enter/exit utility classes (`hud-sheet-*`, `jl-panel-*`, wizard steps, …). |

`index.css` imports every file above except `map-touch-gestures.css` (MapView).

## Deleted modules (prior bands)

| File | Band | Notes |
| --- | --- | --- |
| `map-hud.css` | W5-A | Orphan stub. |
| `home-entry.css` | W5-B | → `entryStyles` / entry shells. |
| `map-panels.css` | W5-C | → `HudDetailPanel` / beacon styles; geometry stays in `map-shell`. |
| `map-wizard-attention.css` | W5-C | → `MapAttentionRing`; pulse in `motion.css`. |
| `desktop-ops.css` | W5-D | → `desktopOpsShellStyle` / `contextualRailStyle`. |
| `ask-hud.css` | W5-D | → `jetlagBrand` / `--ask-hud-*` + Tailwind. |

## W5-E dead-rule prune (no whole-file delete)

Zero-consumer selectors removed (verified via `rg` against `src/` + `e2e/`, excluding CSS):

- `map-tool-dock.css`: `.jl-panel-hider-actions`, `.jl-thermometer-live-marker` pulse, `.jl-chat-keyboard-inset` transition, `.home-card-btn:active`
- `map-chrome-controls.css`: `.user-location-icon`, `.map-dot-icon` (MapLibre icons use `jl-icon-*` registry)
- `base.css`: `--hider-panel-bottom` (only consumer was deleted rule)
- `motion.css` / `motion-utilities.css`: dead companion selectors + `@keyframes jl-thermometer-live-pulse`

**Kept on purpose:** zoom/style `--*` inset modifiers (dynamic `MapChromeControlInset` template), MapLibre-generated `.maplibregl-*`, all geometry carve-outs, still-referenced `hud-*` / wizard / route-fallback / unread pulse.

## Geometry carve-outs (must remain)

### `map-shell.css`

- **geometry:** `.map-screen-shell` / dvh fill, safe-area paint band, hit-target / mask, sync/preload indicator **positioning**.
- **keep (later):** `.jl-status-*`, `.map-float-alert`, `.dock-waiting-host` visual skins.

### `map-chrome-controls.css`

- **geometry:** `.maplibregl-map` size/background/`touch-action`, basemap filters, default attrib hide.
- **keep:** `.map-zoom-control*` / `.map-style-control*` positioning + interact/landscape; thermometer walk marker skins.

### `map-bottom-chrome.css`

- **geometry:** `--map-left-*` / safe-area / side-stack phone bottoms / radii / drag glass / draw-menu abspos.

### `map-compass-control.css` / `map-touch-gestures.css` / `map-attribution.css`

- Full-file geometry allowlist.

## Theme bridge

`src/theme/theme.ts` → `jetlagBrand` / `--jl-*` (+ bridge `--ops-*` / `--ask-hud-*`). Prefer theme for new chrome. Residual CSS may keep `--dock-height` / `--z-*` in `base.css` until Cap-proven theme ownership.

Helpers (extend, do not invent a kit): `entryStyles` / `hudChromeStyles` / `mapToolSlotStyles` / `mapChromeSurfaceStyles` / `chatUnreadBadgeStyle` / `desktopOpsShellStyle*` / `askHudPanelStyle`.

## AC #1 note (CVA kit)

`class-variance-authority` + `src/components/ui/button|chip|island` still have live consumers on tip (Join, Ask commit, ToolDeck Island, …). Soft-gate: **do not** purge in W5-E; Wave 7 / on-touch. No new kit invented this band.
