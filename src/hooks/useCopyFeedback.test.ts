import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCopyFeedback } from "./useCopyFeedback";
import { copyToClipboard } from "../platform/copyToClipboard";

vi.mock("../platform/copyToClipboard", () => ({
  copyToClipboard: vi.fn(),
}));

describe("useCopyFeedback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(copyToClipboard).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("marks copied on success and resets after the success delay", async () => {
    vi.mocked(copyToClipboard).mockResolvedValue(true);
    const { result } = renderHook(() => useCopyFeedback());

    await act(async () => {
      await result.current.copy("ABCD");
    });

    expect(result.current.status).toBe("copied");

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.status).toBe("idle");
  });

  it("marks failed on error and resets after the failure delay", async () => {
    vi.mocked(copyToClipboard).mockResolvedValue(false);
    const { result } = renderHook(() => useCopyFeedback());

    await act(async () => {
      await result.current.copy("ABCD");
    });

    expect(result.current.status).toBe("failed");

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.status).toBe("idle");
  });
});
