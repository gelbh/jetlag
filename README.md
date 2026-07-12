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

## About

Unofficial fan companion for [Jet Lag: The Game](https://jetlagthegame.com/). Not affiliated with the show, board game, or Nebula.

## Official Jet Lag

- [Jet Lag: The Game on YouTube](https://jetlagthegame.com/)
- [Hide + Seek board game (Nebula Store)](https://store.nebula.tv/products/jet-lag-the-game-hide-and-seek-transit-game)
- [Expansion rules reference](https://rules.jetlagthegame.com/expansion/)
