// Browser-side half of scripts/prerender-marketing.mjs; see finalizePrerenderDom.

/**
 * Runs inside the prerender page (serialized by Playwright, so it must stay self-contained).
 * A client-rendered DOM lacks the markers `hydrateRoot` needs, so this adds what React's server
 * renderer would have written:
 * - `<!--$-->…<!--/$-->` around every resolved `<Suspense>` boundary (hydration throws a
 *   mismatch when a boundary has no marker),
 * - `<!-- -->` between adjacent text nodes (serialization merges them into one),
 * - `data-prerendered="true"` on `#root` (the `src/main.tsx` hydrate switch),
 * and drops what the hydration render cannot reproduce: `#boot-splash`, Mantine floating
 * indicators (rendered only after a measuring re-render, and positioned for this viewport), and
 * the `<html>` boot/motion attributes App effects set for this headless session (the visitor's
 * own App sets them again once hydrated).
 *
 * `useId` attributes keep the snapshot's client-format ids (React does not patch attributes
 * when hydrating); label/input pairs stay consistent with each other.
 *
 * Returns `{ ready: false }` without touching the DOM while any boundary still shows its
 * fallback, so callers can poll it; the first `{ ready: true }` call is the only mutating one.
 *
 * Relies on React DOM internals (`__reactContainer$`, fiber tags, Suspense `memoizedState`);
 * src/test/prerenderHydrationMarkers.test.tsx pins that against the installed React.
 */
export function finalizePrerenderDom() {
  const SUSPENSE = 13;
  const HOST_COMPONENT = 5;
  const HOST_TEXT = 6;
  const HOST_PORTAL = 4;
  const HOST_ROOT = 3;
  const OFFSCREEN = 22;
  const ACTIVITY = 31;
  const rootEl = document.getElementById("root");
  if (!rootEl) throw new Error("#root missing");
  const containerKey = Object.keys(rootEl).find((k) => k.startsWith("__reactContainer$"));
  if (!containerKey) throw new Error("#root is not a React root");
  const hostRoot = rootEl[containerKey].stateNode.current;

  const boundaries = [];
  const visit = (fiber) => {
    for (let f = fiber; f; f = f.sibling) {
      if (f.tag === HOST_PORTAL) continue;
      // React 19.2+ <Activity> needs `<!--&-->` markers this walker does not write.
      if (f.tag === ACTIVITY) throw new Error("<Activity> is not supported in prerendered shells");
      if (f.tag === SUSPENSE) boundaries.push(f);
      if (f.child) visit(f.child);
    }
  };
  visit(hostRoot.child);
  if (boundaries.some((b) => b.memoizedState !== null)) {
    return { ready: false };
  }

  /** Top-level host nodes of a fiber subtree, in order (portals excluded). */
  const hostNodes = (fiber, out) => {
    for (let f = fiber; f; f = f.sibling) {
      if (f.tag === HOST_PORTAL) continue;
      if (f.tag === OFFSCREEN && f.memoizedState !== null) continue;
      if (f.tag === HOST_COMPONENT || f.tag === HOST_TEXT) out.push(f.stateNode);
      else if (f.child) hostNodes(f.child, out);
    }
    return out;
  };
  /** End comment per processed boundary; pre-order guarantees ancestors come first. */
  const ends = new Map();
  /**
   * Where an empty boundary sits: before the next host node, else at the end of the nearest
   * enclosing host element or Suspense boundary (before that boundary's end comment).
   */
  const insertionPoint = (fiber) => {
    for (let f = fiber; f; f = f.return) {
      if (f !== fiber) {
        if (f.tag === HOST_COMPONENT) return { parent: f.stateNode, before: null };
        if (f.tag === HOST_ROOT) return { parent: rootEl, before: null };
        if (f.tag === SUSPENSE && ends.has(f)) {
          const end = ends.get(f);
          return { parent: end.parentNode, before: end };
        }
      }
      for (let s = f.sibling; s; s = s.sibling) {
        const [next] = hostNodes(s, []);
        if (next) return { parent: next.parentNode, before: next };
      }
    }
    return { parent: rootEl, before: null };
  };

  for (const boundary of boundaries) {
    const nodes = hostNodes(boundary.child, []);
    const start = document.createComment("$");
    const end = document.createComment("/$");
    ends.set(boundary, end);
    if (boundary.alternate) ends.set(boundary.alternate, end);
    if (nodes.length === 0) {
      const { parent, before } = insertionPoint(boundary);
      parent.insertBefore(start, before);
      parent.insertBefore(end, before);
      continue;
    }
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    first.parentNode.insertBefore(start, first);
    last.parentNode.insertBefore(end, last.nextSibling);
  }

  const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT);
  const texts = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) texts.push(n);
  for (const text of texts) {
    if (text.nextSibling && text.nextSibling.nodeType === Node.TEXT_NODE) {
      text.parentNode.insertBefore(document.createComment(" "), text.nextSibling);
    }
  }

  document.getElementById("boot-splash")?.remove();
  for (const name of ["data-boot-complete", "data-motion", "data-motion-decorative"]) {
    document.documentElement.removeAttribute(name);
  }
  for (const node of rootEl.querySelectorAll(".mantine-FloatingIndicator-root")) {
    node.remove();
  }
  rootEl.setAttribute("data-prerendered", "true");
  // Serialize in the same task so no React commit can land between marking and snapshotting.
  const doctype = document.doctype ? new XMLSerializer().serializeToString(document.doctype) : "";
  return {
    ready: true,
    boundaries: boundaries.length,
    html: doctype + document.documentElement.outerHTML,
  };
}
