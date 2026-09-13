# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

*(inferred from README)* Players of Jet Lag: The Game hide-and-seek sessions, usually on phones outdoors. A host creates the session; Seekers and Hiders join with a 4-letter code and pick a role. Secondary: hosts/admins using desktop ops surfaces.

## Product Purpose

*(inferred)* Unofficial fan map companion: keep radar, zones, pins, and question tools in sync across a live hide-and-seek session so players can play on the move without a paper board.

## Positioning

*(inferred)* Real-time shared map + question tools (Matching, Measuring, Thermometer, Radar, Tentacles) and markup (Zone, Pin), framed for a play area the host defines. Not affiliated with the show, board game, or Nebula.

## Operating Context

*(inferred)* Mobile-first PWA (add to home screen), touch-heavy outdoor use, one-handed map chrome. Capacitor builds exist for native shells. Multiplayer sync via Firebase. Feature flag `jl.playerUi.mantine` dual-paths Home / Join / Create between Survey Legacy and Mantine shells during UI migration.

## Capabilities and Constraints

*(inferred)*

- Session create / join / continue; role selection (Seeker / Hider); live map tools listed in README.
- Survey field-book tokens are the player UX source of truth for new player UI; Legacy Broadcast HUD tokens remain for admin / residual aliases.
- Wave 1a Mantine path adds `@mantine/form` entry shells; notifications deferred.
- Must not invent affiliation with Nebula / official Jet Lag products.

## Brand Commitments

*(inferred)* Product name in-repo: **Jet Lag Map Companion**. Display voice on entry: condensed uppercase display labels (Barlow Semi Condensed) with Source Sans body. Accent direction for player UI: Survey field-book (canvas, field-ink, flag, signal, trail, halt, rule). Mantine theme currently light branding only (`primaryColor: orange`, `defaultRadius: md`).

## Evidence on Hand

- README.md product copy and tool list
- `src/styles/tokens.css` (generated from `tokens/`)
- Live app: https://jetlag.gelbhart.dev
- Official references linked in README (do not fabricate testimonials)

## Product Principles

1. Outdoor-readable, large touch targets, one-handed map use.
2. Shared live state is the product; chrome serves the map.
3. Player UI prefers Survey field-book roles over Legacy HUD aliases.
4. Unofficial fan companion; never claim official affiliation.
5. Dual-path UI migration must keep Legacy behavior when the Mantine flag is off.

## Accessibility & Inclusion

*(inferred, undecided detail)* Mobile outdoor readability is a stated product goal; no formal WCAG target recorded in-repo. Prefer large controls and high-contrast field-book roles for player surfaces.
