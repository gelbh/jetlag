# Cloudflare Worker

Edge entry for the Jet Lag SPA host (`worker/index.ts`). Handles a few special API paths, then serves static assets from the Workers Assets binding with HTML CSP nonces and cache headers.

## Request routing order

Handlers run in this order (first match wins for early returns):

1. **Sentry tunnel** — `SENTRY_TUNNEL_PATH` → `handleSentryTunnelRequest`
2. **PostHog reverse proxy** — paths matched by `shouldHandlePosthogProxy` → `handlePosthogProxyRequest`
3. **CSP report** — `POST /api/csp-report` (other methods → `204`) → logs truncated body
4. **Incident email** — `INCIDENT_EMAIL_PATH` → `handleIncidentEmailRequest`
5. **Static assets** — `env.ASSETS.fetch`
   - Exact `/` is rewritten to `/prerender/home/` (prerendered home; Assets redirects are followed so the client stays on `/`)
   - `/prerender/home` and `/prerender/home/` **308** → `/`
   - Nested SPA routes still fall through to the asset shell as usual
6. **Asset SPA-fallback guard** — if a `/assets/*` request would get HTML (`text/html` 200), respond `404` instead (stale chunk / missing file)
7. **Document CSP nonce** — HTML documents get a per-response script nonce via `applyDocumentCspNonce`
8. **Cache-Control** — `applyCacheControlHeader` on the (possibly CSP-rewritten) asset response

## Modules

| Path | Role |
|------|------|
| `sentryTunnel.ts` | Browser → Sentry envelope tunnel |
| `posthogProxy.ts` | First-party PostHog /ph proxy |
| `documentCsp.ts` | Nonce generation + CSP header / HTML rewrite |
| `assetCacheHeaders.ts` | Cache-Control by pathname |
| `incidentEmail.ts` | Incident desk email webhook |

## Secrets (Worker env)

Injected at runtime via `wrangler secret put` (prod) or `.dev.vars` (local). Never commit real values.

| Binding | Required | Purpose |
|---------|----------|---------|
| `RESEND_API_KEY` | yes (for email) | Resend API key |
| `INCIDENT_EMAIL_SECRET` | yes (for email) | Bearer shared with Cloud Function |
| `INCIDENT_ADMIN_EMAIL` | no | Admin recipient (code default if unset) |
| `INCIDENT_EMAIL_FROM` | no | Verified Resend From (code default if unset) |

Copy `.dev.vars.example` → `.dev.vars` for `npm run preview:worker`.

## Config notes

- `assets.run_worker_first: true` so HTML nonce CSP and `/api/*` (csp-report, incident-email, tunnels) run before static Assets. Do not narrow back to path lists without a CSP + latency proof.
- Config SoT: `wrangler.jsonc` (not TOML).
- Regenerate types with `npm run cf-typegen` (uses `.dev.vars.example`). Do **not** run typegen under `doppler run` / a shell full of `VITE_*` client keys; that pollutes `Env` in `worker-configuration.d.ts`.

## Tests

```bash
npx vitest run worker/index.test.ts
```
