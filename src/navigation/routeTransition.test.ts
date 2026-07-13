import { describe, expect, it, vi, beforeEach } from "vitest";
import * as routePreloaders from "./routePreloaders";
import {
  isLazyRoute,
  normalizeRoutePath,
  preloadRoute,
  resolveNavigateDestinationKey,
} from "./routePreloaders";
import { routeReadinessKind } from "./useRouteScreenReady";
import {
  clearRouteWarmStateForTests,
  getSyncRouteReady,
  isRouteImportWarm,
  isWarmFastPathEligible,
} from "./routeWarmState";
import * as firebase from "../services/core/firebase";
import {
  clearResolvedMatchingAreasCacheForTests,
  isPlayAreaReadySync,
  resolveSessionPlayArea,
} from "../services/geo/resolveSessionMatchingAreas";
import * as regionPackBoundaries from "../services/geo/regionPackBoundaries";
import { usePremiumEntitlementsStore } from "../state/premiumEntitlementsStore";
import { useSessionStore } from "../state/sessionStore";
import { createTestSession } from "../test/fixtures/sessions";

describe("normalizeRoutePath", () => {
  it("strips query strings and hashes", () => {
    expect(normalizeRoutePath("/map?foo=bar")).toBe("/map");
    expect(normalizeRoutePath("/create#step-2")).toBe("/create");
  });

  it("normalizes preset edit paths", () => {
    expect(normalizeRoutePath("/presets/abc123/edit")).toBe(
      "/presets/:id/edit",
    );
    expect(normalizeRoutePath("/presets/new")).toBe("/presets/new");
  });

  it("defaults empty paths to root", () => {
    expect(normalizeRoutePath("")).toBe("/");
  });
});

describe("resolveNavigateDestinationKey", () => {
  it("preserves query strings and hashes for deduplication", () => {
    expect(resolveNavigateDestinationKey("/map?session=abc")).toBe(
      "/map?session=abc",
    );
    expect(resolveNavigateDestinationKey("/create#step-2")).toBe(
      "/create#step-2",
    );
    expect(resolveNavigateDestinationKey("/map?session=abc#panel")).toBe(
      "/map?session=abc#panel",
    );
  });

  it("preserves object search and hash", () => {
    expect(
      resolveNavigateDestinationKey({
        pathname: "/map",
        search: "?session=abc",
        hash: "#panel",
      }),
    ).toBe("/map?session=abc#panel");
  });

  it("defaults omitted object search and hash to empty", () => {
    expect(resolveNavigateDestinationKey({ pathname: "/join" })).toBe("/join");
  });

  it("normalizes preset edit paths while preserving query and hash", () => {
    expect(
      resolveNavigateDestinationKey("/presets/abc123/edit?tab=rules#top"),
    ).toBe("/presets/:id/edit?tab=rules#top");
  });
});

describe("isLazyRoute", () => {
  it("marks known lazy routes", () => {
    expect(isLazyRoute("/map")).toBe(true);
    expect(isLazyRoute("/create")).toBe(true);
    expect(isLazyRoute("/tutorial")).toBe(true);
    expect(isLazyRoute("/presets")).toBe(true);
    expect(isLazyRoute("/presets/new")).toBe(true);
    expect(isLazyRoute("/presets/foo/edit")).toBe(true);
  });

  it("marks eager routes as not lazy", () => {
    expect(isLazyRoute("/")).toBe(false);
    expect(isLazyRoute("/join")).toBe(false);
    expect(isLazyRoute("/admin")).toBe(false);
    expect(isLazyRoute("/premium")).toBe(false);
  });
});

describe("preloadRoute", () => {
  it("resolves immediately for eager routes", async () => {
    await expect(preloadRoute("/join")).resolves.toBeUndefined();
  });

  it("loads lazy route modules without throwing", async () => {
    await expect(preloadRoute("/tutorial")).resolves.toBeUndefined();
  });

  it("invokes the lazy loader for /map and query-bearing paths", async () => {
    const mapLoader = vi.spyOn(routePreloaders.routeImporter, "importMapScreen");

    try {
      await preloadRoute("/map");
      expect(mapLoader).toHaveBeenCalledTimes(1);

      mapLoader.mockClear();
      await preloadRoute("/map?session=abc");
      expect(mapLoader).toHaveBeenCalledTimes(1);
    } finally {
      mapLoader.mockRestore();
    }
  });
});

describe("routeReadinessKind", () => {
  it("maps primary screens to readiness signals", () => {
    expect(routeReadinessKind("/")).toBe("auth-bootstrap");
    expect(routeReadinessKind("/map")).toBe("play-area");
    expect(routeReadinessKind("/admin")).toBe("admin-auth");
    expect(routeReadinessKind("/premium")).toBe("premium");
  });

  it("uses layout readiness for secondary routes", () => {
    expect(routeReadinessKind("/join")).toBe("layout");
    expect(routeReadinessKind("/create")).toBe("layout");
    expect(routeReadinessKind("/tutorial")).toBe("layout");
    expect(routeReadinessKind("/presets")).toBe("layout");
    expect(routeReadinessKind("/feedback")).toBe("layout");
  });
});

describe("routeWarmState", () => {
  beforeEach(() => {
    clearRouteWarmStateForTests();
    clearResolvedMatchingAreasCacheForTests();
    useSessionStore.getState().setSession(null);
    usePremiumEntitlementsStore.setState({
      hydrated: false,
      loading: false,
      entitlements: null,
    });
  });

  it("tracks warm imports after preloadRoute succeeds", async () => {
    expect(isRouteImportWarm("/map")).toBe(false);

    await preloadRoute("/map");

    expect(isRouteImportWarm("/map")).toBe(true);
  });

  it("treats eager routes as warm fast-path eligible when readiness is sync-true", () => {
    vi.spyOn(firebase, "isFirebaseConfigured").mockReturnValue(false);

    expect(isWarmFastPathEligible("/join")).toBe(true);
  });

  it("requires warm chunk and sync readiness for lazy routes", async () => {
    vi.spyOn(firebase, "isFirebaseConfigured").mockReturnValue(false);
    useSessionStore.getState().setSession(null);

    expect(isWarmFastPathEligible("/map")).toBe(false);

    await preloadRoute("/map");

    expect(isWarmFastPathEligible("/map")).toBe(true);
  });

  it("stays ineligible when chunk is warm but sync readiness is false", async () => {
    const session = createTestSession({
      regionPackId: "london",
      regionPackSubregionId: "camden",
    });
    useSessionStore.getState().setSession(session);

    await preloadRoute("/map");
    expect(isRouteImportWarm("/map")).toBe(true);
    expect(getSyncRouteReady("/map")).toBe(false);
    expect(isWarmFastPathEligible("/map")).toBe(false);
  });
});

describe("getSyncRouteReady", () => {
  beforeEach(() => {
    clearResolvedMatchingAreasCacheForTests();
    useSessionStore.getState().setSession(null);
    usePremiumEntitlementsStore.setState({
      hydrated: false,
      loading: false,
      entitlements: null,
    });
  });

  it("mirrors useRouteScreenReady for auth-bootstrap and layout routes", () => {
    vi.spyOn(firebase, "isFirebaseConfigured").mockReturnValue(true);
    vi.spyOn(firebase, "isAuthBootstrapReady").mockReturnValue(false);
    expect(getSyncRouteReady("/")).toBe(false);

    vi.spyOn(firebase, "isAuthBootstrapReady").mockReturnValue(true);
    expect(getSyncRouteReady("/")).toBe(true);
    expect(getSyncRouteReady("/create")).toBe(true);
  });

  it("mirrors admin auth readiness from auth bootstrap", () => {
    vi.spyOn(firebase, "isFirebaseConfigured").mockReturnValue(true);
    vi.spyOn(firebase, "isAuthBootstrapReady").mockReturnValue(false);
    expect(getSyncRouteReady("/admin")).toBe(false);

    vi.spyOn(firebase, "isAuthBootstrapReady").mockReturnValue(true);
    expect(getSyncRouteReady("/admin")).toBe(true);
  });

  it("mirrors premium hydration state", () => {
    expect(getSyncRouteReady("/premium")).toBe(false);

    usePremiumEntitlementsStore.setState({ hydrated: true });
    expect(getSyncRouteReady("/premium")).toBe(true);
  });

  it("mirrors play area cache readiness for /map", async () => {
    const session = createTestSession({
      regionPackId: "london",
      regionPackSubregionId: "camden",
    });
    useSessionStore.getState().setSession(session);

    expect(getSyncRouteReady("/map")).toBe(false);
    expect(isPlayAreaReadySync(session)).toBe(false);

    vi.spyOn(regionPackBoundaries, "loadRegionPackPlayArea").mockResolvedValue(
      session.gameArea,
    );
    await resolveSessionPlayArea(session);

    expect(isPlayAreaReadySync(session)).toBe(true);
    expect(getSyncRouteReady("/map")).toBe(true);
  });
});
