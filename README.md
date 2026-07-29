<p align="center">
  <a href="https://jetlag.gelbhart.dev">
    <img src="public/icons/icon-512.svg" width="96" height="96" alt="Jet Lag Map Companion" />
  </a>
</p>

<h1 align="center">Jet Lag Map Companion</h1>

<p align="center">
  <a href="https://jetlag.gelbhart.dev"><img src="https://img.shields.io/website?url=https%3A%2F%2Fjetlag.gelbhart.dev&label=jetlag.gelbhart.dev&color=0E132C" alt="Live app" /></a>
  <a href="https://github.com/gelbh/jetlag"><img src="https://img.shields.io/github/stars/gelbh/jetlag?style=flat-square&color=C55B40" alt="GitHub stars" /></a>
</p>

Seekers ask questions on the live map. Hiders answer, set hiding zones, and watch the search unfold. Radar, zones, pins, and question tools stay in sync across the session.

**[Open the app →](https://jetlag.gelbhart.dev)**

Built for players on the move. Big touch targets, readable outdoors, one-handed use. Add it to your home screen for a full-screen map (PWA).

## How it works

1. A host creates a session, frames the play area, and shares the 4-letter code.
2. Seekers and hiders join on their phones and pick a role.
3. The shared map updates live as questions are asked, zones are drawn, and hiders place their hiding zone.

## Map tools

Question tools sit on the bottom bar:

- **Matching.** Same category on the map?
- **Measuring.** Closer or further?
- **Thermometer.** Hotter or colder?
- **Radar.** Inside or outside a circle?
- **Tentacles.** Point-to-point questions.

Markup tools live under **Draw**:

- **Zone.** Draw a play boundary.
- **Pin.** Mark a point on the map.

## Development

Secrets live in [Doppler](https://www.doppler.com/); there is no `.env.example`.

```bash
npm ci
doppler login     # once per machine
doppler setup     # reads doppler.yaml (project jetlag, config dev)
npm run env:pull  # writes .env.local from Doppler
npm run dev
```

### Geometry kernel WASM (Rust)

`npm run build` always runs `npm run wasm:build` first (wasm-pack → `crates/jetlag-geometry-kernel/pkg/`, gitignored). Local `vite` / opt-out `ts` mode can stub a missing `pkg/` via Vite’s optional plugin, but production and worker builds still need a real package.

**Toolchain (once per machine):** Rust stable with `wasm32-unknown-unknown`, plus [wasm-pack](https://rustwasm.github.io/wasm-pack/) (CI pins **0.13.1**).

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-pack --version 0.13.1   # or match CI
npm run wasm:build
```

**Kernel mode** (default `wasm` when unset): override with localStorage `jl.geometry.maskKernel=ts` (or `dual`) or env `VITE_GEOMETRY_MASK_KERNEL` (`ts` | `dual` | `wasm`; localStorage overrides env). Empty values are ignored; invalid non-empty values fall back to `ts`. WASM load/compute failure falls back to TypeScript on every entrypoint.

**Ready flags** (default `wasm` mode uses WASM when ready):

| Entrypoint | WASM default |
|------------|--------------|
| Mask union (polygons) | yes |
| End-game disks | yes (when no disk skip applies) |
| Half-plane / radar | yes |
| Geodesic line buffer | yes |
| Tentacle elimination | yes |
| Spatial Voronoi | no (TS / d3-geo-voronoi) |

Disk masks may still use the TypeScript CircleUnion path when disks are present and WASM offers no advantage — see ship notes. `dual` mode always returns TypeScript for diagnosis; it never changes player-visible defaults.

## Deploy

- **Path:** open a PR → required CI (`unit`, `build`, `emulator`, `e2e`, `lighthouse`) → merge to `main` → Deploy workflow builds, then path-aware Firebase backend + Cloudflare Worker frontend (Doppler `prd`).
- **Dependabot:** weekly grouped npm (production / development, patch+minor); those PRs enable squash auto-merge when Allow auto-merge is on and required CI is green. Configure `DEPENDABOT_AUTOMERGE_TOKEN` as a **Dependabot** secret (not a normal Actions secret) — fine-scoped PAT or GitHub App token with merge rights; `GITHUB_TOKEN` merges skip Deploy. GitHub Actions bumps and major version PRs stay manual.
- **Frontend (manual):** `doppler run --config prd -- npm run deploy:worker`
- **Local Worker preview:** `npm run preview:worker` (build + `wrangler dev`; validates `/assets/*` routing)
- **Backend (Firebase, manual):** `doppler run --config prd -- npm run deploy`

## About

Unofficial fan companion for [Jet Lag: The Game](https://jetlagthegame.com/). Not affiliated with the show, board game, or Nebula.

## Official Jet Lag

- [Jet Lag: The Game on YouTube](https://jetlagthegame.com/)
- [Hide + Seek board game (Nebula Store)](https://store.nebula.tv/products/jet-lag-the-game-hide-and-seek-transit-game)
- [Expansion rules reference](https://rules.jetlagthegame.com/expansion/)
