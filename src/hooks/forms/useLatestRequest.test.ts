import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useLatestRequest } from "./useLatestRequest";

describe("useLatestRequest", () => {
  it("aborts the previous request's signal when a new one begins", () => {
    const { result } = renderHook(() => useLatestRequest());
    const first = result.current.beginRequest();
    const firstSignal = result.current.requestSignal();
    const second = result.current.beginRequest();
    expect(firstSignal?.aborted).toBe(true);
    expect(result.current.requestSignal()?.aborted).toBe(false);
    expect(result.current.isLatestRequest(first)).toBe(false);
    expect(result.current.isLatestRequest(second)).toBe(true);
  });

  it("aborts the current request on cancel and on unmount", () => {
    const { result, unmount } = renderHook(() => useLatestRequest());
    result.current.beginRequest();
    const signal = result.current.requestSignal();
    result.current.cancelRequests();
    expect(signal?.aborted).toBe(true);

    result.current.beginRequest();
    const next = result.current.requestSignal();
    unmount();
    expect(next?.aborted).toBe(true);
  });
});
