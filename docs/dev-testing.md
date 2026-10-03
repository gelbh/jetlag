# Dev testing: scenario worlds

Wave 6 ships a typed scenario catalog under `src/test/scenarios/` (for example `dublin-local-map`). Use the headless CLI for list / seed print / reset recipes; use `/dev/scenarios` in a DEV or emulator session when you want the picker to write localStorage and navigate.

## Commands

```bash
npm run world -- list
npm run world -- apply dublin-local-map
npm run world -- reset
```

### list

Prints one row per catalog scenario: `id`, title, and comma-separated tags.

### apply

Loads `getScenario` + `toLocalStorageSeed` and prints the seed JSON to stdout (session / map / annotations blobs plus `clearTimer`). Exit code is non-zero for an unknown id; stderr lists known ids.

Pure seed print is always safe. Pasting into a running app (or using `/dev/scenarios`) is DEV/emulator only.

Ingest options:

- Paste into the browser console with the key recipe below (same keys `/dev/scenarios` uses).
- Pipe JSON into a local helper, or copy fields into Playwright `addInitScript` / e2e session fixtures that already call `toLocalStorageSeed`.

Example console apply after `npm run world -- apply dublin-local-map`:

```js
const seed = /* paste JSON */;
localStorage.setItem("jetlag-session", seed.sessionBlob);
localStorage.setItem("jetlag-map", seed.mapBlob);
localStorage.setItem("jetlag-annotations", seed.annotationsBlob);
if (seed.clearTimer) localStorage.removeItem("jetlag-timer");
location.assign("/map");
```

### reset

Prints a clear recipe for seed keys only (no silent wipe of unrelated localStorage):

- `jetlag-session`
- `jetlag-map`
- `jetlag-annotations`
- `jetlag-timer`

`npm run world -- reset` prints `localStorage.removeItem(...)` lines for those keys. Reset with no prior apply is a no-op success.
