import { describe, expect, it, vi } from "vitest";
import { withTimeout } from "./withTimeout";

describe("withTimeout", () => {
  it("resolves when the promise wins", async () => {
    await expect(withTimeout(Promise.resolve("ok"), 1000)).resolves.toBe("ok");
  });

  it("rejects when the deadline wins", async () => {
    vi.useFakeTimers();
    const pending = withTimeout(new Promise(() => undefined), 50, "Timed out");
    const assertion = expect(pending).rejects.toThrow("Timed out");
    await vi.advanceTimersByTimeAsync(50);
    await assertion;
    vi.useRealTimers();
  });
});
