import { describe, expect, it, vi } from "vitest";
import { retryAsync } from "./retryAsync";

describe("retryAsync", () => {
  it("retries retryable failures before succeeding", async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValue("ok");

    await expect(retryAsync(operation)).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("throws immediately for non-retryable failures", async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValue(new Error("permission denied"));

    await expect(retryAsync(operation)).rejects.toThrow("permission denied");
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
