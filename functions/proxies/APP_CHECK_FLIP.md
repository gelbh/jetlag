# App Check enforce flip (HTTP proxies)

Overpass / Postpass and other `onRequest` proxies verify the `X-Firebase-AppCheck` header in `verifyProxyAppCheck.mjs`. Enforcement is **log-only** today: invalid or missing tokens are logged but requests still proceed.

**Do not flip in a drive-by PR.** Treat this as a deliberate production change with soak evidence and rollback ready.

## Current default

`PROXY_APP_CHECK_ENFORCED` in `verifyProxyAppCheck.mjs` is `false`. Leave it `false` until the criteria below are met.

## What to watch (soak)

Cloud Logging / Functions logs emit one JSON line per failed check:

```json
{ "type": "proxy_app_check", "result": "missing"|"invalid", "code": "...", "route": "...", "enforced": false }
```

Filter on `type="proxy_app_check"` (or `jsonPayload.type="proxy_app_check"` depending on sink).

**Success criteria before enforce:**

- Legitimate app traffic (real devices / production sessions hitting proxy routes) shows **`result=valid`** when a token is present, or no `proxy_app_check` lines at all for those routes during normal use.
- `missing` / `invalid` lines are explainable (bots, old builds, manual curls) and not a large share of real user proxy volume.
- Soak long enough to cover a release cycle and peak usage (team judgment; often several days to two weeks).

## Flip (enforce)

1. Confirm soak criteria with another engineer.
2. Set `PROXY_APP_CHECK_ENFORCED = true` in `verifyProxyAppCheck.mjs` (or wire a Functions param / env that defaults to `false` and set it to `true` in GSM if that pattern is adopted).
3. Deploy Functions.
4. Monitor `proxy_app_check` logs and 401 rates on proxy routes; watch support / error tracking for `App Check required.`

When `enforced: true`, failed verification returns **401** with `{ "error": "App Check required." }` and the handler does not run.

## Rollback

1. Set `PROXY_APP_CHECK_ENFORCED` back to `false` (or param/env off).
2. Redeploy Functions.
3. Confirm new log lines show `enforced: false` and legitimate clients recover without 401s.

## Out of scope for this runbook

- Callable `enforceAppCheck` (separate Firebase path).
- Client token wiring changes unless already required for your flip plan.
