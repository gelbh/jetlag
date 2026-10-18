import { describe, expect, it, vi } from "vitest";
import { abortableSleep, anySignal, isAbortError } from "./anySignal";

describe("anySignal", () => {
  it("aborts when any input aborts, with that reason", () => {
    const a = new AbortController();
    const b = new AbortController();
    const combined = anySignal([a.signal, undefined, b.signal]);
    b.abort("why");
    expect(combined.aborted).toBe(true);
    expect(combined.reason).toBe("why");
  });

  it("is aborted at once when an input already is", () => {
    const a = new AbortController();
    a.abort();
    expect(anySignal([a.signal]).aborted).toBe(true);
  });
});

describe("abortableSleep", () => {
  it("rejects immediately on abort", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const sleep = abortableSleep(60_000, controller.signal);
    controller.abort(new DOMException("Cancelled.", "AbortError"));
    await expect(sleep).rejects.toSatisfy(isAbortError);
    vi.useRealTimers();
  });
});
