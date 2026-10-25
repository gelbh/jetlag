import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { measuringLinearNotFoundMessage } from "@/services/geo/overpass/measuringLinearFeatures";
import { usePreloadStore } from "@/state/preloadStore";
import { useMeasuringDraftState } from "./useMeasuringDraftState";

describe("useMeasuringDraftState presence seed", () => {
  beforeEach(() => {
    usePreloadStore.setState({
      activeGameAreaKey: null,
      categoryPresenceCounts: null,
      adminDivisionCounts: null,
    });
  });

  it("seeds high_speed_rail_line unavailable for Dublin denylist before pick", async () => {
    const { result } = renderHook(() =>
      useMeasuringDraftState([], [], { regionPackId: "dublin", gameSize: "medium" } as never),
    );

    await waitFor(() => {
      expect(result.current.unavailableMeasuringFromKinds.has("high_speed_rail_line")).toBe(true);
      expect(result.current.catalogNotice).not.toBeNull();
    });

    expect(result.current.unavailableMeasuringFromKinds.get("high_speed_rail_line")).toBe(
      measuringLinearNotFoundMessage("high_speed_rail_line"),
    );
    expect(result.current.catalogNotice).toBe(
      measuringLinearNotFoundMessage("high_speed_rail_line"),
    );
  });
});
