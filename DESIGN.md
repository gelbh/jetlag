---
name: Jet Lag Map Companion
description: Unofficial live map companion for Jet Lag hide-and-seek sessions
colors:
  canvas: "oklch(0.285 0.036 255)"
  field-ink: "oklch(0.925 0.000 90)"
  field-ink-muted: "oklch(0.684 0.034 256)"
  flag: "oklch(0.688 0.155 47)"
  flag-ink: "oklch(0.925 0.000 90)"
  flag-soft: "oklch(0.688 0.155 47 / 0.22)"
  signal: "oklch(0.806 0.147 81)"
  signal-soft: "oklch(0.806 0.147 81 / 0.22)"
  trail: "oklch(0.72 0.12 145)"
  trail-soft: "oklch(0.72 0.12 145 / 0.22)"
  halt: "oklch(0.587 0.206 26)"
  halt-soft: "oklch(0.587 0.206 26 / 0.22)"
  rule: "oklch(0.445 0.038 256)"
typography:
  display:
    fontFamily: "Barlow Semi Condensed, system-ui, sans-serif"
    fontWeight: 600
    letterSpacing: "normal"
  body:
    fontFamily: "Source Sans 3, system-ui, sans-serif"
    fontWeight: 400
rounded:
  md: "0.375rem"
  hud-sm: "0.125rem"
  hud-md: "0.25rem"
  hud-lg: "0.375rem"
  hud-xl: "0.5rem"
components:
  home-card-btn:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.field-ink}"
    typography: "{typography.display}"
    height: "3.75rem"
  flag-accent:
    backgroundColor: "{colors.flag}"
    textColor: "{colors.flag-ink}"
---

# Design System

## Overview

Incumbent player UX is the **Jetlag logo palette** on an Apple-native control shell: navy canvas, off-white ink, sunset orange CTAs, gold signal, coral halt. Documented from `tokens/color/survey.json` (logo-sampled). Legacy Broadcast HUD tokens remain for admin / residual aliases; prefer Survey roles for new player UI. Mantine shells use continuous iOS-style controls with flag (orange) as tint.

## Colors

- **Canvas / ink:** `canvas`, `field-ink`, `field-ink-muted` for page ground and readable outdoor text.
- **Accent:** `flag` / `flag-ink` / `flag-soft` for primary actions and fluoro survey accents.
- **Status:** `signal` (info/sync), `trail` (success/progress), `halt` (error/danger), each with soft fills.
- **Structure:** `rule` for field-book edges and subtle lined backdrops on entry screens.
- Do not invent new hues for Live variants in default mode; reassign existing roles.

## Typography

- **Display:** Barlow Semi Condensed, weight 600, often uppercase on entry CTAs and chrome labels (`--font-display`).
- **Body:** Source Sans 3 (`--font-body` / package fonts).
- Prefer condensed uppercase for action labels; keep body for forms and helper copy.

## Layout

- Mobile-first, full-viewport entry posters (`min-height: 100dvh`), map shell dominates post-join.
- Large touch targets on home/join (e.g. home card buttons ~3.75rem min-height).
- One-handed bottom chrome on map; entry screens stack brand, primary actions, then secondary links.

## Elevation & Depth

- Entry backdrop uses soft radial washes of flag/signal over lined canvas, not stacked cards.
- Legacy HUD float/menu shadows remain for residual HUD chrome; new player UI should stay flat field-book unless map chrome already uses a HUD shadow.

## Shapes

- Mantine default radius `md` on Wave 1a shells.
- Legacy HUD radii (`radius-hud-*`) for residual map chrome only.

## Components

- **Home / Join / Create:** dual-path Legacy Survey vs Mantine behind `jl.playerUi.mantine`. Preserve task parity when restyling.
- **Map tools:** Matching, Measuring, Thermometer, Radar, Tentacles; Draw Zone / Pin.
- Prefer semantic Survey color roles on controls over raw orange Mantine defaults when refining player surfaces.

## Do's and Don'ts

**Do**

- Keep outdoor contrast (field-ink on canvas; flag for primary).
- Preserve role language: Seeker, Hider, session code.
- Vary Live previews within Survey identity (hierarchy, density, layout), not new brand worlds.

**Don't**

- Claim official Jet Lag / Nebula affiliation in copy.
- Reintroduce purple-on-white AI-default palettes or invent tokens outside field-book + documented HUD aliases.
- Break flag-off Legacy paths while iterating Mantine shells.
