import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  matchingAdminDivisionProbeFailedMessage,
  matchingEmptyPlayAreaMessage,
} from "@/services/geo/matching";
import {
  allAdminDivisionLevelsError,
  okAdminDivisionCounts,
} from "@/services/geo/overpass/adminDivisionAvailability";
import { usePreloadStore } from "@/state/preloadStore";
import { useMatchingDraftState } from "./useMatchingDraftState";

describe("useMatchingDraftState presence seed", () => {
  beforeEach(() => {
    usePreloadStore.setState({
      activeGameAreaKey: null,
      categoryPresenceCounts: null,
      adminDivisionCounts: null,
    });
  });

  it("seeds mountain unavailable when probe count is 0 before pick", async () => {
    usePreloadStore.setState({
      categoryPresenceCounts: { mountain: 0 },
    });

    const { result } = renderHook(() =>
      useMatchingDraftState({ regionPackId: "dublin", gameSize: "medium" } as never),
    );

    await waitFor(() => {
      expect(result.current.unavailableMatchingCategories.has("mountain")).toBe(true);
      expect(result.current.catalogNotice).not.toBeNull();
    });

    expect(result.current.unavailableMatchingCategories.get("mountain")).toBe(
      matchingEmptyPlayAreaMessage("mountain"),
    );
    expect(result.current.catalogNotice).toBe(matchingEmptyPlayAreaMessage("mountain"));
  });

  it("clears probe-failed unavailable entries after admin counts recover", async () => {
    usePreloadStore.setState({
      categoryPresenceCounts: {},
      adminDivisionCounts: allAdminDivisionLevelsError(),
    });

    const { result } = renderHook(() => useMatchingDraftState({ gameSize: "medium" } as never));

    await waitFor(() => {
      expect(result.current.catalogProbeError).toBe(matchingAdminDivisionProbeFailedMessage);
      expect(result.current.unavailableMatchingCategories.get("admin_division_3")).toBe(
        matchingAdminDivisionProbeFailedMessage,
      );
    });

    act(() => {
      usePreloadStore.setState({
        adminDivisionCounts: okAdminDivisionCounts({
          admin_division_1: 4,
          admin_division_2: 4,
          admin_division_3: 4,
          admin_division_4: 4,
        }),
      });
    });

    await waitFor(() => {
      expect(result.current.catalogProbeError).toBeNull();
      expect(result.current.unavailableMatchingCategories.has("admin_division_3")).toBe(false);
      expect(result.current.catalogNotice).toBeNull();
    });
  });
});
