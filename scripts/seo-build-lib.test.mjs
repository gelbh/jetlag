#!/usr/bin/env node
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  diffHeadAssetKeys,
  extractHeadAssetKeys,
  hasBootSplashElement,
  hasPrerenderedRootMarker,
  PERF_PRERENDER_PATHS,
  prerenderTargets,
  restoreTemplateHeadAssets,
  rewritePrerenderPreviewUrls,
  robotsMetaContent,
} from "./seo-build-lib.mjs";

test("rewritePrerenderPreviewUrls strips the preview origin", () => {
  const origin = "http://127.0.0.1:4179";
  const input = `<link rel="modulepreload" href="${origin}/assets/accountAuth.js"><script src="${origin}/assets/index.js"></script>`;
  const out = rewritePrerenderPreviewUrls(input, origin);

  assert.equal(
    out,
    `<link rel="modulepreload" href="/assets/accountAuth.js"><script src="/assets/index.js"></script>`,
  );
  assert.equal(rewritePrerenderPreviewUrls(input, `${origin}/`), out);
  assert.equal(rewritePrerenderPreviewUrls("no urls", origin), "no urls");
});

const template = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Jet Lag</title>
    <link rel="stylesheet" href="/boot-splash.css" />
    <script type="module" crossorigin src="/assets/index-A.js"></script>
    <link rel="modulepreload" crossorigin href="/assets/react-B.js">
    <link rel="modulepreload" crossorigin href="/assets/preload-helper-C.js">
    <link rel="stylesheet" crossorigin href="/assets/index-D.css">
  <link rel="manifest" href="/manifest.webmanifest"></head>
  <body><div id="root"></div></body>
</html>`;

const snapshot = `<!DOCTYPE html><html lang="en"><head>
    <meta charset="UTF-8">
    <title>Home · Jet Lag</title>
    <link rel="canonical" href="https://jetlag.gelbhart.dev/">
    <meta name="robots" content="index,follow">
    <link rel="stylesheet" href="/boot-splash.css">
    <script type="module" crossorigin="" src="/assets/index-A.js"></script>
    <link rel="modulepreload" crossorigin="" href="/assets/react-B.js">
    <link rel="modulepreload" crossorigin="" href="/assets/preload-helper-C.js">
    <link rel="stylesheet" crossorigin="" href="/assets/index-D.css">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="modulepreload" as="script" crossorigin="" href="/assets/App-E.js">
  <link rel="modulepreload" as="script" crossorigin="" href="/assets/vendor-firebase-F.js">
  <link rel="stylesheet" crossorigin="" href="/assets/HomeRoute-G.css">
  <link rel="preload" as="font" href="/assets/font-H.woff2">
  <style data-mantine-styles="true">:root{--x:1}</style>
  <script type="application/ld+json" data-seo-jsonld="1">{"@type":"WebApplication"}</script>
  <link rel="modulepreload" as="script" crossorigin="" href="/assets/virtual_pwa-register-I.js">
</head><body><div id="root"><main>Prerendered home body</main></div>
<link rel="modulepreload" href="/assets/body-only-J.js"></body></html>`;

test("extractHeadAssetKeys lists module scripts and asset links in head only", () => {
  assert.deepEqual(extractHeadAssetKeys(template), [
    "stylesheet:/boot-splash.css",
    "module:/assets/index-A.js",
    "modulepreload:/assets/react-B.js",
    "modulepreload:/assets/preload-helper-C.js",
    "stylesheet:/assets/index-D.css",
  ]);
});

test("restoreTemplateHeadAssets drops runtime-injected preloads and keeps the template set", () => {
  const out = restoreTemplateHeadAssets(snapshot, template);

  assert.deepEqual(extractHeadAssetKeys(out), extractHeadAssetKeys(template));
  assert.equal(out.match(/rel="modulepreload"/g).length, 3); // 2 template + 1 body (untouched)
  assert.ok(out.includes('<script type="module" crossorigin src="/assets/index-A.js"></script>'));
  for (const kept of [
    '<link rel="canonical" href="https://jetlag.gelbhart.dev/">',
    '<meta name="robots" content="index,follow">',
    '<link rel="manifest" href="/manifest.webmanifest">',
    '<style data-mantine-styles="true">:root{--x:1}</style>',
    '<script type="application/ld+json" data-seo-jsonld="1">{"@type":"WebApplication"}</script>',
    "<main>Prerendered home body</main>",
  ]) {
    assert.ok(out.includes(kept), `missing ${kept}`);
  }
  for (const dropped of [
    "App-E.js",
    "vendor-firebase-F.js",
    "HomeRoute-G.css",
    "font-H.woff2",
    "virtual_pwa-register-I.js",
  ]) {
    assert.ok(!out.includes(dropped), `still has ${dropped}`);
  }
  assert.equal(restoreTemplateHeadAssets(out, template), out, "idempotent");
});

test("restoreTemplateHeadAssets inserts template tags before </head> when the snapshot has none", () => {
  const bare = "<html><head><title>x</title></head><body></body></html>";
  const out = restoreTemplateHeadAssets(bare, template);
  assert.deepEqual(extractHeadAssetKeys(out), extractHeadAssetKeys(template));
  assert.ok(out.indexOf("index-A.js") < out.indexOf("</head>"));
});

test("extractHeadAssetKeys parses single-quoted and unquoted attrs; keeps inline modules", () => {
  const html = `<head><LINK REL=MODULEPRELOAD HREF=/a.js><link rel='stylesheet' href='/b.css'><script type="module">import("/c.js")</script></head>`;
  assert.deepEqual(extractHeadAssetKeys(html), ["modulepreload:/a.js", "stylesheet:/b.css"]);
  assert.throws(() => extractHeadAssetKeys("<body></body>"), /missing a <head>/);
});

test("diffHeadAssetKeys flags extra, missing, reordered and duplicated keys", () => {
  const shell = ["module:/i.js", "modulepreload:/r.js"];
  assert.deepEqual(diffHeadAssetKeys(shell, [...shell]), { matches: true, extra: [], missing: [] });
  assert.deepEqual(diffHeadAssetKeys(shell, [...shell, "modulepreload:/App.js"]), {
    matches: false,
    extra: ["modulepreload:/App.js"],
    missing: [],
  });
  assert.deepEqual(diffHeadAssetKeys(shell, ["module:/i.js"]).missing, ["modulepreload:/r.js"]);
  assert.equal(diffHeadAssetKeys(shell, [...shell].reverse()).matches, false);
  assert.equal(diffHeadAssetKeys(shell, [...shell, "module:/i.js"]).matches, false);
});

test("head asset tags inside comments, noscript and template are ignored", () => {
  const html = `<head><!-- <link rel="modulepreload" href="/c.js"> --><noscript><link rel="stylesheet" href="/n.css"></noscript><template><script type="module" src="/t.js"></script></template><link rel="modulepreload" href="/real.js"></head>`;
  assert.deepEqual(extractHeadAssetKeys(html), ["modulepreload:/real.js"]);
  const out = restoreTemplateHeadAssets(html, template);
  assert.deepEqual(extractHeadAssetKeys(out), extractHeadAssetKeys(template));
  assert.ok(out.includes('<noscript><link rel="stylesheet" href="/n.css"></noscript>'));
});

test("quoted `>` inside attributes does not split a tag", () => {
  const html = `<head><link rel="stylesheet" media="(width > 600px)" href="/wide.css"><link rel="modulepreload" href="/x.js"></head>`;
  assert.deepEqual(extractHeadAssetKeys(html), ["stylesheet:/wide.css", "modulepreload:/x.js"]);
  const out = restoreTemplateHeadAssets(html, template);
  assert.deepEqual(extractHeadAssetKeys(out), extractHeadAssetKeys(template));
  assert.ok(!out.includes("600px"));
});

test("inline module bodies with src-like text are kept", () => {
  const inline = `<script type="module">document.body.insertAdjacentHTML("beforeend", '<img src="/x.png">')</script>`;
  const html = `<head>${inline}<link rel="modulepreload" href="/x.js"></head>`;
  assert.deepEqual(extractHeadAssetKeys(html), ["modulepreload:/x.js"]);
  assert.ok(restoreTemplateHeadAssets(html, template).includes(inline));
});

const policy = {
  indexablePaths: ["/", "/premium"],
  disallowPaths: ["/join", "/create"],
};

test("prerenderTargets keeps perf-only paths separate from the index list", () => {
  assert.deepEqual(PERF_PRERENDER_PATHS, ["/join"]);
  assert.deepEqual(prerenderTargets(policy), [
    { path: "/", indexable: true },
    { path: "/premium", indexable: true },
    { path: "/join", indexable: false },
  ]);
});

test("prerenderTargets rejects a perf path that is indexable or crawlable", () => {
  assert.throws(
    () => prerenderTargets(policy, ["/premium"]),
    /both indexablePaths and PERF_PRERENDER_PATHS/,
  );
  assert.throws(
    () => prerenderTargets(policy, ["/stats"]),
    /must be in disallowPaths/,
  );
});

test("hasPrerenderedRootMarker reads the #root opening tag only", () => {
  assert.equal(
    hasPrerenderedRootMarker('<div id="root" data-prerendered="true"><p>x</p></div>'),
    true,
  );
  assert.equal(
    hasPrerenderedRootMarker('<div data-prerendered="true" id="root"></div>'),
    true,
  );
  assert.equal(hasPrerenderedRootMarker('<div id="root"></div>'), false);
  assert.equal(
    hasPrerenderedRootMarker(
      '<!-- <div id="root" data-prerendered="true"> --><div id="root"></div>',
    ),
    false,
  );
  assert.equal(
    hasPrerenderedRootMarker('<div id="root"><p data-prerendered="true"></p></div>'),
    false,
  );
});

test("hasBootSplashElement ignores inert markup", () => {
  assert.equal(hasBootSplashElement('<div id="boot-splash" role="status"></div>'), true);
  assert.equal(hasBootSplashElement("<section class='x' id='boot-splash'>"), true);
  assert.equal(
    hasBootSplashElement('<link rel="stylesheet" href="/boot-splash.css"><div id="boot-splash-mark">'),
    false,
  );
  assert.equal(hasBootSplashElement('<!-- <div id="boot-splash"> -->'), false);
});

test("robotsMetaContent finds the robots meta regardless of attribute order", () => {
  assert.equal(
    robotsMetaContent('<meta content="noindex,nofollow" name="robots">'),
    "noindex,nofollow",
  );
  assert.equal(
    robotsMetaContent('<meta name="description" content="x"><meta name="ROBOTS" content="index,follow">'),
    "index,follow",
  );
  assert.equal(robotsMetaContent('<meta name="description" content="x">'), undefined);
});
