#!/usr/bin/env node
import assert from "node:assert/strict";
import { rewritePrerenderPreviewUrls } from "./seo-build-lib.mjs";

const origin = "http://127.0.0.1:4179";
const input = `<link rel="modulepreload" href="${origin}/assets/accountAuth.js"><script src="${origin}/assets/index.js"></script>`;
const out = rewritePrerenderPreviewUrls(input, origin);

assert.equal(
  out,
  `<link rel="modulepreload" href="/assets/accountAuth.js"><script src="/assets/index.js"></script>`,
);
assert.equal(rewritePrerenderPreviewUrls(input, `${origin}/`), out);
assert.equal(rewritePrerenderPreviewUrls("no urls", origin), "no urls");

console.log("rewritePrerenderPreviewUrls ok");
