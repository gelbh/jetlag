import { describe, expect, it, vi } from "vitest";

const wrappedRoutesSentinel = vi.hoisted(() => {
  function WrappedRoutes() {
    return null;
  }
  return WrappedRoutes;
});

const reactRouterBrowserTracingIntegration = vi.hoisted(() =>
  vi.fn(() => ({ name: "ReactRouterTracing" })),
);
const wrapReactRouterRouting = vi.hoisted(() => vi.fn(() => wrappedRoutesSentinel));

vi.mock("@sentry/react", () => ({
  reactRouterBrowserTracingIntegration,
  wrapReactRouterRouting,
}));

import { createSentryReactRouterIntegration, SentryRoutes } from "./sentryReactRouter";

describe("sentryReactRouter", () => {
  it("builds the SPA tracing integration with INP and wraps Routes", () => {
    expect(SentryRoutes).toBe(wrappedRoutesSentinel);

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
