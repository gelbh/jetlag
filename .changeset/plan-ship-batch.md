---
"jetlag": patch
---

Observer map: admin observers see live seeker and hider GPS pins on the session map
Admin: live sessions list sorts by recent activity so active games surface first
PWA: stale route chunks wait until you leave the map screen before reloading
PWA: app updates apply automatically after a session ends on all platforms
Join: newer app versions can join sessions created on older builds
Join: returning players rejoin the same code without a spurious version mismatch
Join: version mismatch messages say whether you need an update or the host should start a new session
Boot: tutorial route loads on demand instead of on first paint
Boot: Firebase storage and callable functions load when first needed, shrinking the opening bundle
Live map: GPS marker keys stay stable across location updates to cut map flicker
Live map: elimination shading runs in a background worker so the map stays responsive during heavy annotation load
Deploy: frontend static assets now deploy to Cloudflare Workers instead of Pages
