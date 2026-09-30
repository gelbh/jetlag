import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RouteReadinessSensor } from "./RouteReadinessSensor";
import { RouteTransitionContext } from "./routeTransitionContextInstance";

const mocks = vi.hoisted(() => ({
  usePermanentAuthUser: vi.fn(() => ({
    user: null,
    isPermanent: false,
    authReady: false,
  })),
  usePremiumEntitlements: vi.fn(() => ({ loading: true })),
  usePlayAreaReady: vi.fn(() => false),
}));

vi.mock("../hooks/billing/usePermanentAuthUser", () => ({
  usePermanentAuthUser: mocks.usePermanentAuthUser,
}));
vi.mock("../hooks/billing/usePremiumEntitlements", () => ({
  usePremiumEntitlements: mocks.usePremiumEntitlements,
}));
vi.mock("../hooks/session/usePlayAreaReady", () => ({
  usePlayAreaReady: mocks.usePlayAreaReady,
}));

function renderAt(pathname: string) {
  const reportScreenReady = vi.fn();
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <RouteTransitionContext.Provider
        value={{
          phase: "idle",
          loadingReason: null,
          loadingProgress: null,
          beginTransition: async () => undefined,
          reportScreenReady,
          resetStuckTransition: () => undefined,
        }}
      >
        <RouteReadinessSensor />
      </RouteTransitionContext.Provider>
    </MemoryRouter>,
  );
  return reportScreenReady;
}

describe("RouteReadinessSensor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(["/", "/privacy", "/terms"])(
    "reports %s ready without starting auth or entitlements",
    (pathname) => {
      const report = renderAt(pathname);

      expect(report).toHaveBeenLastCalledWith(true);
      expect(mocks.usePermanentAuthUser).not.toHaveBeenCalled();
      expect(mocks.usePremiumEntitlements).not.toHaveBeenCalled();
      expect(mocks.usePlayAreaReady).not.toHaveBeenCalled();
    },
  );

  it("keeps entitlements hydrated on in-app layout routes", () => {
    const report = renderAt("/join");

    expect(report).toHaveBeenLastCalledWith(true);
    expect(mocks.usePremiumEntitlements).toHaveBeenCalled();
    expect(mocks.usePermanentAuthUser).not.toHaveBeenCalled();
  });

  it("waits on permanent auth for /admin", () => {
    const report = renderAt("/admin");

    expect(report).toHaveBeenLastCalledWith(false);
    expect(mocks.usePermanentAuthUser).toHaveBeenCalled();
  });

  it("waits on entitlements for /premium", () => {
    const report = renderAt("/premium");

    expect(report).toHaveBeenLastCalledWith(false);
    expect(mocks.usePremiumEntitlements).toHaveBeenCalled();
  });

  it("waits on the play area for /map", () => {
    const report = renderAt("/map");

    expect(report).toHaveBeenLastCalledWith(false);
    expect(mocks.usePlayAreaReady).toHaveBeenCalled();
  });
});
