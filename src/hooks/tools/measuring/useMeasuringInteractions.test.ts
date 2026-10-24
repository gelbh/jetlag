import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GameArea } from "@/domain/map/annotations";
import { getNamedLoadTask } from "@/services/core/progress/loadTask";
import { MEASURING_SEARCH_TASK } from "@/services/core/progress/namedTasks";
import type { GeocodedPlace } from "@/services/geo/geocoding";
import type { MeasuringAnchorLoaders } from "./useMeasuringAnchorLoaders";
import type { MeasuringDraftState } from "./useMeasuringDraftState";
import { useMeasuringInteractions } from "./useMeasuringInteractions";

const searchPlaces = vi.hoisted(() => vi.fn());

vi.mock("@/services/geo/geocoding", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/geo/geocoding")>()),
  searchPlaces,
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function renderInteractions() {
  const draft = {
    wizardStepRef: { current: "anchor" },
    measuringSearchQuery: "Trinity College",
    measuringSeekerPoint: null,
    setMeasuringError: vi.fn(),
    setMeasuringSearchRole: vi.fn(),
    setMeasuringSearchLoading: vi.fn(),
    setMeasuringSearchResults: vi.fn(),
    setMeasuringSearchQuery: vi.fn(),
  } as unknown as MeasuringDraftState;
  const { result } = renderHook(() =>
    useMeasuringInteractions({
      active: true,
      gameArea: { type: "Polygon", coordinates: [] } as unknown as GameArea,
      refreshGps: vi.fn(),
      ensurePointInGameArea: () => true,
      draft,
      loaders: {} as MeasuringAnchorLoaders,
      submittingRef: { current: false },
    }),
  );
  return { result, draft };
}

describe("useMeasuringInteractions search progress", () => {
  afterEach(() => {
    searchPlaces.mockReset();
  });

  it("publishes a search task while the place search runs", async () => {
    const pending = deferred<GeocodedPlace[]>();
    searchPlaces.mockReturnValueOnce(pending.promise);
    const { result, draft } = renderInteractions();

    let search!: Promise<void>;
    act(() => {
      search = result.current.handleSearch("seeker");
    });
    const task = getNamedLoadTask(MEASURING_SEARCH_TASK);
    expect(task?.getSnapshot().status).toBe("running");
    expect(searchPlaces).toHaveBeenCalledWith("Trinity College", {
      signal: task?.signal,
      node: task?.root,
    });

    await act(async () => {
      pending.resolve([]);
      await search;
    });
    expect(task?.getSnapshot().status).toBe("done");
    expect(getNamedLoadTask(MEASURING_SEARCH_TASK)).toBeNull();
    expect(draft.setMeasuringSearchLoading).toHaveBeenLastCalledWith(false);
  });

  it("stops loading without an error when the search is cancelled", async () => {
    searchPlaces.mockImplementationOnce(
      (_query: string, options: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener("abort", () => reject(options.signal.reason));
        }),
    );
    const { result, draft } = renderInteractions();

    let search!: Promise<void>;
    act(() => {
      search = result.current.handleSearch("seeker");
    });
    await act(async () => {
      getNamedLoadTask(MEASURING_SEARCH_TASK)?.cancel();
      await search;
    });

    expect(draft.setMeasuringSearchLoading).toHaveBeenLastCalledWith(false);
    expect(draft.setMeasuringError).toHaveBeenLastCalledWith(null);
    expect(draft.setMeasuringSearchResults).not.toHaveBeenCalled();
  });
});
