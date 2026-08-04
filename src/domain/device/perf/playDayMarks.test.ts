import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  PWA_MARK_APP_READY,
  PWA_MARK_MAP_RESUME,
  PWA_MARK_MAP_USABLE,
  PWA_MEASURE_MAP_RETURN,
  markMapResumeStart,
  markMapUsableAndMeasureReturn,
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

  it("marks map resume start with frozen name", () => {
    markMapResumeStart();
    expect(performance.mark).toHaveBeenCalledWith(PWA_MARK_MAP_RESUME);
  });

  it("marks map-usable and measures return from map-resume", () => {
    expect(markMapUsableAndMeasureReturn()).toBe(12.5);
    expect(performance.mark).toHaveBeenCalledWith(PWA_MARK_MAP_USABLE);
    expect(performance.measure).toHaveBeenCalledWith(
      PWA_MEASURE_MAP_RETURN,
      PWA_MARK_MAP_RESUME,
      PWA_MARK_MAP_USABLE,
    );
  });
});
