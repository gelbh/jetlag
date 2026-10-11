import { describe, expect, it, vi } from "vitest";
import { captureWorkerException, WORKER_EXCEPTION_DISTINCT_ID } from "./exceptionCapture";

function fakeCtx() {
  const pending: Promise<unknown>[] = [];
  return {
    ctx: {
      waitUntil: vi.fn((p: Promise<unknown>) => pending.push(p)),
    } as unknown as ExecutionContext,
    settled: () => Promise.all(pending),
  };
}

const env = { POSTHOG_PROJECT_KEY: "phc_test" } as Env;

describe("captureWorkerException", () => {
  it("sends a scrubbed exception with request context and no query string", async () => {
    const client = { captureExceptionImmediate: vi.fn(async () => {}) };
    const { ctx, settled } = fakeCtx();
    const request = new Request("https://jetlag.gelbhart.dev/join/ABCD?code=ABCD", {
      method: "POST",
      headers: { "cf-ray": "ray-1" },
    });

    captureWorkerException(new Error("boom in WXYZ"), request, env, ctx, client);
    await settled();

    expect(ctx.waitUntil).toHaveBeenCalledTimes(1);
    const [error, distinctId, properties] = client.captureExceptionImmediate.mock.calls[0];
    expect((error as Error).message).toBe("boom in ****");
    expect(distinctId).toBe(WORKER_EXCEPTION_DISTINCT_ID);
    expect(properties).toEqual({
      $process_person_profile: false,
      runtime: "cloudflare-worker",
      method: "POST",
      path: "/join/****",
      cf_ray: "ray-1",
    });
  });

  it("no-ops without a project key or execution context", () => {
    const client = { captureExceptionImmediate: vi.fn(async () => {}) };
    const request = new Request("https://jetlag.gelbhart.dev/");
    const { ctx } = fakeCtx();

    captureWorkerException(
      new Error("x"),
      request,
      { POSTHOG_PROJECT_KEY: "" } as Env,
      ctx,
      client,
    );
    captureWorkerException(new Error("x"), request, env, undefined, client);

    expect(client.captureExceptionImmediate).not.toHaveBeenCalled();
    expect(ctx.waitUntil).not.toHaveBeenCalled();
  });

  it("swallows capture failures", async () => {
    const client = {
      captureExceptionImmediate: vi.fn(async () => {
        throw new Error("posthog down");
      }),
    };
    const { ctx, settled } = fakeCtx();

    captureWorkerException(
      new Error("x"),
      new Request("https://jetlag.gelbhart.dev/"),
      env,
      ctx,
      client,
    );

    await expect(settled()).resolves.toBeDefined();
  });
});
