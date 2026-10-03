import { describe, expect, it, vi } from "vitest";

const reactRouterBrowserTracingIntegration = vi.hoisted(() =>
  vi.fn(() => ({ name: "ReactRouterTracing" })),
);
const wrapReactRouterRouting = vi.hoisted(() => vi.fn((routes: unknown) => routes));

vi.mock("@sentry/react", () => ({
  reactRouterBrowserTracingIntegration,
  wrapReactRouterRouting,
}));

import { createSentryReactRouterIntegration, SentryRoutes } from "./sentryReactRouter";

describe("createSentryReactRouterIntegration", () => {
  it("returns the react-router browser tracing integration with INP enabled", () => {
    const integration = createSentryReactRouterIntegration();

    expect(integration).toEqual({ name: "ReactRouterTracing" });
    expect(reactRouterBrowserTracingIntegration).toHaveBeenCalledWith(
      expect.objectContaining({
        enableInp: true,
        useEffect: expect.any(Function),
        useLocation: expect.any(Function),
        useNavigationType: expect.any(Function),
        createRoutesFromChildren: expect.any(Function),
        matchRoutes: expect.any(Function),
      }),
    );
  });
});

describe("SentryRoutes", () => {
  it("wraps react-router Routes", () => {
    expect(wrapReactRouterRouting).toHaveBeenCalled();
    expect(SentryRoutes).toBeTypeOf("function");
  });
});
