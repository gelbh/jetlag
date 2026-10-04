#!/usr/bin/env node
import assert from "node:assert/strict";
import { test } from "node:test";
import { HOME_PRERENDER_PATH } from "../worker/assetFetch.ts";
import { resolveDocumentPath } from "./lhci-document-route.mjs";

const dist = new Set([
  "/index.html",
  "/prerender/home/index.html",
  "/join/index.html",
  "/premium/index.html",
  "/legacy.html",
]);
const exists = (path) => dist.has(path);

test("exact / uses the Worker's prerendered home path", () => {
  assert.equal(resolveDocumentPath("/", exists), `${HOME_PRERENDER_PATH}index.html`);
});

test("prerendered routes resolve with or without a trailing slash", () => {
  assert.equal(resolveDocumentPath("/join", exists), "/join/index.html");
  assert.equal(resolveDocumentPath("/join/", exists), "/join/index.html");
  assert.equal(resolveDocumentPath("/premium", exists), "/premium/index.html");
  assert.equal(resolveDocumentPath("/legacy", exists), "/legacy.html");
});

test("routes without a prerendered file fall through to the SPA shell", () => {
  assert.equal(resolveDocumentPath("/create", exists), null);
  assert.equal(resolveDocumentPath("/join/extra", exists), null);
});

test("asset requests are never rewritten", () => {
  assert.equal(
    resolveDocumentPath("/assets/index-abc.js", () => true),
    null,
  );
  assert.equal(
    resolveDocumentPath("/join/index.html", () => true),
    null,
  );
});
