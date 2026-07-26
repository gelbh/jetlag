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
| `posthogProxy.ts` | First-party PostHog ingest/proxy |
| `documentCsp.ts` | Nonce generation + CSP header / HTML rewrite |
| `assetCacheHeaders.ts` | Cache-Control by pathname |
| `incidentEmail.ts` | Incident desk email webhook |

## Tests

```bash
npx vitest run worker/index.test.ts
```
