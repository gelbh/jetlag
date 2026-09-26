# Wave 5 CSS allowlist (source of truth)

Inventory + classification for Mantine player UI Wave 5 chrome migration.
Do not delete or rewrite live chrome modules in W5-A; later bands consume this table.

| Field | Value |
| --- | --- |
| Tip SHA | `56e415db3662ecad0a881ec17beb95b749c634e3` |
| Baseline `wc -l src/styles/*.css` (pre `map-hud.css` delete) | **5053** |
| Baseline after orphan `map-hud.css` delete | **5052** |
| Band | W5-A (inventory + theme harden only) |

## Classes

| Class | Meaning |
| --- | --- |
| **replace** | Migrate chrome to Mantine / theme tokens, then delete the CSS module (or the chrome subset). |
| **allowlist** | Keep for MapLibre / geometry / safe-area hit targets until a later proven AC. |
| **delete** | Dead file; remove in this PR. |
| **bridge** | Replace eventually (through W5-E); keep env/safe-area and motion bridges until Cap AC proven. |

## Full inventory

| File | Lines | Class | Band | Notes |
| --- | --- | ---: | --- | --- |
| `ask-hud.css` | 138 | replace | W5-C / W5-D | Ask HUD chrome (panels, cues) in C; residual strip/height tokens in D. |
| `base.css` | 150 | bridge | until E | Fonts, dock/safe-area/z-index CSS vars. Keep `env(safe-area-*)` until Cap AC proven. Theme now mirrors via `jetlagBrand` / `--jl-*`. |
| `desktop-ops.css` | 211 | replace | W5-D | Desktop ops chrome layout. |
| `home-entry.css` | 606 | replace | W5-B | Home / entry surfaces. |
| `map-attribution.css` | 51 | allowlist | geometry | MapLibre attribution control + ask/matching placement clearance overrides. |
| `map-bottom-chrome.css` | 418 | replace | W5-D | Primary: dock / island clearance tokens + chrome layout. **Allowlist carve-out:** left-stack geometry / safe-area insets (`--map-left-*`, tier bottoms). |
| `map-chrome-controls.css` | 289 | replace | W5-C | Primary: floating zoom/style chrome. **Allowlist carve-out:** MapLibre canvas size, `touch-action`, basemap filters, hiding default attrib. |
| `map-compass-control.css` | 67 | allowlist | geometry | Needle + tier bottom geometry. Chrome button skin may migrate later; keep positioning. |
| `map-panels.css` | 259 | replace | W5-C | Map floating panels / sheet chrome. |
| `map-shell.css` | 1058 | allowlist | geometry (+ replace carve-out) | Primary: map container, shell mask, safe-area hit targets. **Replace carve-out:** status chrome (`jl-status-*`, `map-float-alert`, dock-waiting host skins). |
| `map-tool-dock.css` | 476 | replace | W5-D | Tool dock / deck chrome. |
| `map-touch-gestures.css` | 88 | allowlist | geometry | MapLibre children gesture pass-through + feature popup geometry (imported from MapView, not `index.css`). |
| `map-wizard-attention.css` | 25 | replace | W5-C | Wizard place-phase attention ring (chrome). |
| `motion-utilities.css` | 63 | bridge | until E | Motion utility classes; bridge until motion system lands in theme/kit. |
| `motion.css` | 673 | bridge | until E | Keyframes / motion contracts. |
| `primitives.css` | 223 | replace | W5-B | Shared HUD primitives (`hud-chrome`, panels, scrim). |
| `route-transition.css` | 153 | bridge | until E | Route transition motion. |
| `scrollbars.css` | 42 | bridge | until E | Scrollbar skin; keep until chrome kill. |
| `tokens.css` | 62 | bridge | until E | Residual `@theme` color/radius tokens; prefer `jetlagBrand` for new UI. |

## Deleted in W5-A

| File | Lines | Class | Band | Notes |
| --- | --- | ---: | --- | --- |
| `map-hud.css` | 1 | delete | W5-A | Orphan stub comment only; not imported in `index.css`. Removed. Class names like `map-hud-home` live in `primitives.css` and stay. |

## Geometry carve-outs (detail)

### `map-shell.css`

- **Allowlist:** `.map-screen-shell` container / dvh fill, `::before` safe-area paint band, map chrome host overflow, sync-beacon insets, hit-target / mask geometry tied to safe-area and dock clearance.
- **Replace (later band):** `.jl-status-*`, `.map-float-alert`, `.dock-waiting-host` visual chrome (colors, typography, frosted skins).

### `map-chrome-controls.css`

- **Allowlist:** `.maplibregl-map` width/height/background, `touch-action: none`, basemap filter classes, default `.maplibregl-ctrl-attrib { display: none }`.
- **Replace:** `.map-zoom-control*`, `.map-style-control*` chrome buttons and positioning that duplicate theme tokens.

### `map-bottom-chrome.css`

- **Allowlist:** `--map-left-*` stack bases/tiers, safe-area insets for left MapView portals, ask/matching clearance coupling.
- **Replace:** island / side-stack visual chrome tokens that Mantine dock can own (`--dock-island-*` skins once layout is theme-driven).

### `map-compass-control.css`

- **Allowlist:** needle transform, tier `bottom` vars, control size geometry.
- **Optional later:** button chrome skin via Mantine `ActionIcon`.

### `map-touch-gestures.css`

- **Allowlist:** full file (MapLibre children / marker pointer-events / touch-action).

### `map-attribution.css`

- **Allowlist:** MapLibre attrib control styling + placement clearance CSS vars.

### `map-wizard-attention.css`

- No geometry carve-out; classified **replace** (attention ring chrome).

## Theme bridge (W5-A)

`src/theme/theme.ts` exposes dock / safe-area / z-index / spacing on `jetlagBrand` → `theme.other` and `--jl-*` via `jetlagCssVariablesResolver`. Residual CSS may keep `--dock-height` / `--z-*` in `base.css` until W5-E; new chrome code should prefer theme tokens.
