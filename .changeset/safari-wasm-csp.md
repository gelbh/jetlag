---
"jetlag": patch
---

Fix Safari blank/broken load after the geometry WASM cutover: allow `wasm-unsafe-eval` in CSP (WebKit requires it; Chrome often did not) and stop shipping the main bundle as undownleveled `esnext`.
