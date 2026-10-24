import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { matchingEmptyPlayAreaMessage } from "@/services/geo/matching";
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
});
