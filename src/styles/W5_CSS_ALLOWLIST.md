# Wave 5 CSS allowlist (source of truth)

Inventory + classification for Mantine player UI Wave 5 chrome migration.
Do not delete or rewrite live chrome modules in W5-A; later bands consume this table.

| Field | Value |
| --- | --- |
| Tip SHA | `aba33649` (W5-C tip; W5-D updates line counts below) |
| Baseline `wc -l src/styles/*.css` (pre `map-hud.css` delete) | **5053** |
| Baseline after orphan `map-hud.css` delete | **5052** |
| After W5-C panel kill | **~3782** |
| After W5-D dock band (this PR) | **3206** |
| Band | W5-D (dock / bottom chrome → Mantine + theme) |

## Classes

| Class | Meaning |
| --- | --- |
| **replace** | Migrate chrome to Mantine / theme tokens, then delete the CSS module (or the chrome subset). |
| **allowlist** | Keep for MapLibre / geometry / safe-area hit targets until a later proven AC. |
| **delete** | Dead file; remove in this PR. |
| **bridge** | Replace eventually (through W5-E); keep env/safe-area and motion bridges until Cap AC proven. |

## Full inventory

| File | Lines | Class | Band | Notes |
| --- | ---: | --- | --- | --- |
| `base.css` | 150 | bridge | until E | Fonts, dock/safe-area/z-index CSS vars. Keep `env(safe-area-*)` until Cap AC proven. Theme now mirrors via `jetlagBrand` / `--jl-*`. |
| `map-attribution.css` | 51 | allowlist | geometry | MapLibre attribution control + ask/matching placement clearance overrides. |
| `map-bottom-chrome.css` | 418 | allowlist (+ residual) | W5-D | **Allowlist:** `--map-left-*` stack bases/tiers, safe-area insets, zoom/style bottoms, side-stack snap / drag glass. Island / ToolDeck skins already Mantine (`mapChromeSurfaceStyles`). |
| `map-chrome-controls.css` | 206 | allowlist (+ residual) | W5-C | **Allowlist:** MapLibre canvas size, `touch-action`, basemap filters, default attrib hide. **Residual:** zoom/style positioning hooks, interact/landscape distill, thermometer marker skins. Button chrome → `hudChromeStyles` / `MapChromeControl`. |
| `map-compass-control.css` | 67 | allowlist | geometry | Needle + tier bottom geometry. Chrome button skin may migrate later; keep positioning. |
| `map-shell.css` | 790 | allowlist | geometry (+ replace carve-out) | Primary: map container, shell mask, safe-area hit targets, sync/preload **positioning**. W5-C removed duplicate panel/beacon visual chrome (now Mantine). **Replace later:** `.jl-status-*`, `.map-float-alert`, dock-waiting host skins. |
| `map-tool-dock.css` | 210 | replace (residual) | W5-D → W5-E | Slot / menu / overflow chrome deleted (→ `mapToolSlotStyles` / `MapChromeControl`). Residual: panel-above-dock geometry, wizard nav, unread pulse, route-fallback. |
| `map-touch-gestures.css` | 88 | allowlist | geometry | MapLibre children gesture pass-through + feature popup geometry (imported from MapView, not `index.css`). |
| `motion-utilities.css` | 63 | bridge | until E | Motion utility classes; bridge until motion system lands in theme/kit. |
| `motion.css` | 690 | bridge | until E | Keyframes / motion contracts. Hosts `map-attention-pulse` for `MapAttentionRing`. |
| `primitives.css` | 216 | replace (residual) | W5-C → W5-E | Map floating controls use `hudChromeStyles`. Residual: `hud-*` / `btn-*` / `field-*` for ScreenNav, banners, admin, sheets until those migrate. Soft-gate: left for W5-E. |
| `route-transition.css` | 153 | bridge | until E | Route transition motion. |
| `scrollbars.css` | 42 | bridge | until E | Scrollbar skin; keep until chrome kill. |
| `tokens.css` | 62 | bridge | until E | Residual `@theme` color/radius tokens; prefer `jetlagBrand` for new UI. |

## Deleted in W5-D

| File | Lines | Class | Band | Notes |
| --- | ---: | --- | --- | --- |
| `desktop-ops.css` | 211 | delete | W5-D | Ops shell grid + contextual rail → `desktopOpsShellStyle` / `contextualRailStyle` + `jetlagBrand` ops tokens. |
| `ask-hud.css` | 99 | delete | W5-D | Strip/rail height tokens → `jetlagBrand` / `--ask-hud-*` CSS vars; layout → Tailwind / component styles. |

## Deleted in W5-C

| File | Lines | Class | Band | Notes |
| --- | ---: | --- | --- | --- |
| `map-panels.css` | 259 | delete | W5-C | Sync/preload panel + beacon chrome → `HudDetailPanel` / `syncBeaconStyle` / `preloadBeaconStyle`. Geometry hooks remain in `map-shell.css`. |
| `map-wizard-attention.css` | 25 | delete | W5-C | Attention ring → `MapAttentionRing` + `mapAttentionRingStyle`; pulse keyframes in `motion.css`. |

## Deleted in W5-B

| File | Lines | Class | Band | Notes |
| --- | ---: | --- | --- | --- |
| `home-entry.css` | 606 | delete | W5-B | Entry chrome → `entryStyles.ts` / layout shells. |

## Deleted in W5-A

| File | Lines | Class | Band | Notes |
| --- | ---: | --- | --- | --- |
| `map-hud.css` | 1 | delete | W5-A | Orphan stub comment only; not imported in `index.css`. Removed. Class names like `map-hud-home` live in `primitives.css` and stay. |

## Geometry carve-outs (detail)

### `map-shell.css`

- **Allowlist:** `.map-screen-shell` container / dvh fill, `::before` safe-area paint band, map chrome host overflow, sync-beacon insets, hit-target / mask geometry tied to safe-area and dock clearance; sync/preload indicator **positioning** (`.jl-sync-map-indicator`, `.jl-preload-map-indicator`, panel `transform-origin` / width hooks).
- **Replace (later band):** `.jl-status-*`, `.map-float-alert`, `.dock-waiting-host` visual chrome (colors, typography, frosted skins).

### `map-chrome-controls.css`

- **Allowlist:** `.maplibregl-map` width/height/background, `touch-action: none`, basemap filter classes, default `.maplibregl-ctrl-attrib { display: none }`.
- **Residual (W5-C):** `.map-zoom-control*` / `.map-style-control*` **positioning** + interact/landscape distill; thermometer walk marker skins.
- **Replaced:** floating button chrome → `MapChromeControl` + `hudChromeStyles`.

### `map-bottom-chrome.css`

- **Allowlist (W5-D keep):** `--map-left-*` stack bases/tiers, safe-area insets for left MapView portals, ask/matching clearance coupling, side-stack phone bottoms / radii / drag glass, draw-menu abspos under OverlayHost.
- Island / ToolDeck / OverlayHost layout already Tailwind + Mantine Paper styles (`mapChromeSurfaceStyles` / `mapHuntSurfaceStyles`).

### `map-compass-control.css`

- **Allowlist:** needle transform, tier `bottom` vars, control size geometry.
- **Optional later:** button chrome skin via Mantine `ActionIcon`.

### `map-touch-gestures.css`

- **Allowlist:** full file (MapLibre children / marker pointer-events / touch-action).

### `map-attribution.css`

- **Allowlist:** MapLibre attrib control styling + placement clearance CSS vars.

## Theme bridge (W5-A / W5-C / W5-D)

`src/theme/theme.ts` exposes dock / safe-area / z-index / spacing / ops rail / ask HUD heights on `jetlagBrand` → `theme.other` and `--jl-*` (plus bridge `--ops-*` / `--ask-hud-*`) via `jetlagCssVariablesResolver`. Residual CSS may keep `--dock-height` / `--z-*` in `base.css` until W5-E; new chrome code should prefer theme tokens.

W5-D helpers (extend, do not invent a kit): `desktopOpsShellStyle*`, `contextualRailStyle*`, `mapToolSlotIconStyle`, `chatUnreadBadgeStyle`, plus existing `hudChromeStyles` / `mapToolSlotStyles` / `askHudPanelStyle` / `mapChromeSurfaceStyles`.
