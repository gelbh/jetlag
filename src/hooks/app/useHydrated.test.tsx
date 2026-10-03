import { act } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { useHydrated } from "./useHydrated";

function Probe({ seen }: { seen: boolean[] }) {
  const hydrated = useHydrated();
  seen.push(hydrated);
  return <span>{hydrated ? "client" : "server"}</span>;
}

describe("useHydrated", () => {
  let container: HTMLDivElement;

  afterEach(() => {
    container?.remove();
    delete window.__JETLAG_PRERENDER__;
  });

  it("stays false for the whole prerender capture", async () => {
    window.__JETLAG_PRERENDER__ = true;
    container = document.body.appendChild(document.createElement("div"));
    const seen: boolean[] = [];
    const root = createRoot(container);
    await act(async () => {
      root.render(<Probe seen={seen} />);
    });
    expect(seen).toEqual([false]);
    expect(container.textContent).toBe("server");
    root.unmount();
  });

  it("is true on the first createRoot render", async () => {
    container = document.body.appendChild(document.createElement("div"));
    const seen: boolean[] = [];
    const root = createRoot(container);
    await act(async () => {
      root.render(<Probe seen={seen} />);
    });
    expect(seen).toEqual([true]);
    expect(container.textContent).toBe("client");
    root.unmount();
  });

  it("matches the server snapshot while hydrating, then flips", async () => {
    container = document.body.appendChild(document.createElement("div"));
    container.innerHTML = renderToString(<Probe seen={[]} />);
    const seen: boolean[] = [];
    const errors: unknown[] = [];
    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(container, <Probe seen={seen} />, {
        onRecoverableError: (error) => errors.push(error),
      });
    });
    expect(errors).toEqual([]);
    expect(seen[0]).toBe(false);
    expect(seen.at(-1)).toBe(true);
    expect(container.textContent).toBe("client");
    root?.unmount();
  });
});
