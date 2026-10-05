import { act, lazy, type ReactNode, Suspense } from "react";
import { createPortal } from "react-dom";
import { createRoot, hydrateRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { finalizePrerenderDom } from "../../scripts/prerender-hydration-markers.mjs";

// Pins scripts/prerender-hydration-markers.mjs (React fiber internals) to the installed React:
// a client-rendered DOM plus the markers must hydrate with zero recoverable errors.

function Route() {
  return <p>route body</p>;
}

let releaseLazy: () => void = () => {};
const LazyRoute = lazy(
  () =>
    new Promise<{ default: typeof Route }>((resolve) => {
      releaseLazy = () => resolve({ default: Route });
    }),
);

function Nothing(): ReactNode {
  return null;
}

function Shell({ count }: { count: number }) {
  return (
    <main>
      <h1>
        {count} players {"ready"}
      </h1>
      <Suspense fallback={null}>
        <Nothing />
      </Suspense>
      <section>
        <Suspense fallback={<p>loading</p>}>
          <LazyRoute />
          <Suspense fallback={null}>
            <span>nested</span>
          </Suspense>
          {/* Empty boundary as the last child of another boundary. */}
          <Suspense fallback={null}>
            <Nothing />
          </Suspense>
        </Suspense>
      </section>
      {createPortal(<div id="portal-node">portal</div>, document.body)}
      <span className="mantine-FloatingIndicator-root" />
      <footer>end</footer>
    </main>
  );
}

function HydratedShell({ count }: { count: number }) {
  // The hydration render: no measured indicator and no portal yet. Both mount after a client
  // re-render (Mantine portals wait for a mount effect), so the snapshot must not claim them.
  return (
    <main>
      <h1>
        {count} players {"ready"}
      </h1>
      <Suspense fallback={null}>
        <Nothing />
      </Suspense>
      <section>
        <Suspense fallback={<p>loading</p>}>
          <LazyRoute />
          <Suspense fallback={null}>
            <span>nested</span>
          </Suspense>
          {/* Empty boundary as the last child of another boundary. */}
          <Suspense fallback={null}>
            <Nothing />
          </Suspense>
        </Suspense>
      </section>
      <footer>end</footer>
    </main>
  );
}

describe("finalizePrerenderDom", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("adds the markers hydrateRoot needs so the prerendered DOM is kept", async () => {
    const prerender = document.body.appendChild(document.createElement("div"));
    prerender.id = "root";
    const root = createRoot(prerender);
    await act(async () => {
      root.render(<Shell count={3} />);
    });

    expect(finalizePrerenderDom()).toEqual({ ready: false });
    expect(prerender.innerHTML).not.toContain("<!--$-->");

    await act(async () => {
      releaseLazy();
    });
    const appCheckContainer = document.body.appendChild(document.createElement("div"));
    appCheckContainer.id = "fire_app_check_[DEFAULT]";
    appCheckContainer.innerHTML = '<div class="grecaptcha-badge"><iframe></iframe></div>';
    document.documentElement.dataset.bootComplete = "true";
    document.documentElement.dataset.motion = "css";
    expect(finalizePrerenderDom()).toMatchObject({ ready: true, boundaries: 4 });
    expect(document.documentElement.dataset.bootComplete).toBeUndefined();
    expect(document.documentElement.dataset.motion).toBeUndefined();
    expect(prerender.dataset.prerendered).toBe("true");
    expect(prerender.querySelector(".mantine-FloatingIndicator-root")).toBeNull();
    expect(appCheckContainer.isConnected).toBe(false);

    const html = prerender.innerHTML;
    root.unmount();
    document.body.innerHTML = "";

    expect(html).toContain("<h1>3<!-- --> players <!-- -->ready</h1>");
    expect(html).toContain("<!--$--><!--/$--><section>");
    expect(html).toContain(
      "<section><!--$--><p>route body</p><!--$--><span>nested</span><!--/$--><!--$--><!--/$--><!--/$--></section>",
    );

    const container = document.body.appendChild(document.createElement("div"));
    container.innerHTML = html;
    const heading = container.querySelector("h1");
    const routeBody = container.querySelector("section p");
    const errors: unknown[] = [];
    let hydrated: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      hydrated = hydrateRoot(container, <HydratedShell count={3} />, {
        onRecoverableError: (error) => errors.push(error),
      });
    });

    expect(errors).toEqual([]);
    expect(container.querySelector("h1")).toBe(heading);
    expect(container.querySelector("section p")).toBe(routeBody);
    hydrated?.unmount();
  });

  it("waits for a running view transition and strips its inline names", async () => {
    const prerender = document.body.appendChild(document.createElement("div"));
    prerender.id = "root";
    const root = createRoot(prerender);
    await act(async () => {
      root.render(<p>static</p>);
    });
    Object.defineProperty(document, "activeViewTransition", { value: {}, configurable: true });
    expect(finalizePrerenderDom()).toEqual({ ready: false });
    Reflect.deleteProperty(document, "activeViewTransition");

    const main = prerender.querySelector("p")!;
    main.style.setProperty("view-transition-name", "_t_0_");
    main.style.setProperty("view-transition-class", "jl-route-reveal");
    main.style.setProperty("isolation", "isolate");
    document.documentElement.style.setProperty("view-transition-name", "none");

    expect(finalizePrerenderDom()).toMatchObject({ ready: true });
    expect(main.getAttribute("style")).toBe("isolation: isolate;");
    expect(document.documentElement.hasAttribute("style")).toBe(false);
    root.unmount();
  });
});
