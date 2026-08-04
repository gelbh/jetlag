import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  PWA_MARK_APP_READY,
  markPlayDay,
  measurePlayDay,
} from "./playDayMarks";

describe("playDayMarks", () => {
  beforeEach(() => {
    vi.stubGlobal("performance", {
      mark: vi.fn(),
      measure: vi.fn(),
      getEntriesByName: vi.fn(() => [{ duration: 12.5 }]),
      clearMarks: vi.fn(),
      clearMeasures: vi.fn(),
    });
  });

  it("marks app ready with frozen name", () => {
    markPlayDay(PWA_MARK_APP_READY);
    expect(performance.mark).toHaveBeenCalledWith(PWA_MARK_APP_READY);
  });

  it("returns measure duration when present", () => {
    expect(
      measurePlayDay("pwa:boot", "pwa:nav", PWA_MARK_APP_READY),
    ).toBe(12.5);
  });
});
