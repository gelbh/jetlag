import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { GameArea } from "@/domain/map/annotations";
import { DUBLIN_CITY_GAME_AREA } from "@/test/fixtures/dublinGameArea";
import { usePackAttachChrome } from "./usePackAttachChrome";

const MID_ATLANTIC: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-40, 30],
      [-30, 30],
      [-30, 40],
      [-40, 40],
      [-40, 30],
    ],
  ],
};

describe("usePackAttachChrome", () => {
  it("auto-attaches dublin for a dublin-city play area", () => {
    const { result } = renderHook(() =>
      usePackAttachChrome({ gameArea: DUBLIN_CITY_GAME_AREA }),
    );

    expect(result.current.packId).toBe("dublin");
    expect(result.current.source).toBe("auto");
    expect(result.current.showRequestCta).toBe(false);
  });

  it("shows request CTA when no pack qualifies", () => {
    const { result } = renderHook(() =>
      usePackAttachChrome({ gameArea: MID_ATLANTIC }),
    );

    expect(result.current.packId).toBeUndefined();
    expect(result.current.showRequestCta).toBe(true);
  });

  it("keeps manual clear sticky until the play area changes", () => {
    const { result, rerender } = renderHook(
      ({ gameArea }) => usePackAttachChrome({ gameArea }),
      { initialProps: { gameArea: DUBLIN_CITY_GAME_AREA as GameArea | null } },
    );

    act(() => {
      result.current.clearPack();
    });
    expect(result.current.packId).toBeUndefined();
    expect(result.current.source).toBe("manual");
    expect(result.current.showRequestCta).toBe(true);

    rerender({ gameArea: DUBLIN_CITY_GAME_AREA });
    expect(result.current.packId).toBeUndefined();
    expect(result.current.source).toBe("manual");

    rerender({ gameArea: MID_ATLANTIC });
    expect(result.current.packId).toBeUndefined();
    expect(result.current.source).toBe("auto");
    expect(result.current.showRequestCta).toBe(true);
  });

  it("clears seeded pack when initialPackId becomes undefined", () => {
    const { result, rerender } = renderHook(
      ({ initialPackId }) =>
        usePackAttachChrome({
          gameArea: DUBLIN_CITY_GAME_AREA,
          initialPackId,
        }),
      {
        initialProps: {
          initialPackId: "dublin" as import("@/domain/regions/regionPack").RegionPackId | undefined,
        },
      },
    );

    expect(result.current.packId).toBe("dublin");
    expect(result.current.source).toBe("bundled");

    rerender({ initialPackId: undefined });
    expect(result.current.packId).toBe("dublin");
    expect(result.current.source).toBe("auto");
  });
});
