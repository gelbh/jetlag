import { describe, expect, it, vi } from "vitest";
import { captureWorkerException } from "./exceptionCapture";
import worker from "./index";

vi.mock("./exceptionCapture", () => ({ captureWorkerException: vi.fn() }));

const ctx = { waitUntil: vi.fn() } as unknown as ExecutionContext;

describe("worker fetch exception capture", () => {
  it("captures and re-throws errors escaping the handler", async () => {
    const failure = new Error("assets down");
    const env = {
      POSTHOG_PROJECT_KEY: "phc_test",
      ASSETS: { fetch: vi.fn().mockRejectedValue(failure) },
    } as unknown as Env;
    const request = new Request("https://jetlag.gelbhart.dev/map");

    await expect(worker.fetch(request, env, ctx)).rejects.toBe(failure);
    expect(captureWorkerException).toHaveBeenCalledWith(failure, request, env, ctx);
  });

  it("does not capture on successful responses", async () => {
    vi.mocked(captureWorkerException).mockClear();
    const env = { ASSETS: { fetch: vi.fn() } } as unknown as Env;

    const response = await worker.fetch(
      new Request("https://jetlag.gelbhart.dev/api/time"),
      env,
      ctx,
    );

    expect(response.ok).toBe(true);
    expect(captureWorkerException).not.toHaveBeenCalled();
  });
});
