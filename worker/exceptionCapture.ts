import { PostHog } from "posthog-node";
import { scrubString, scrubTelemetryError } from "../src/services/core/analytics/telemetryScrub";

const POSTHOG_HOST = "https://eu.i.posthog.com";
export const WORKER_EXCEPTION_DISTINCT_ID = "jetlag-worker";

export type WorkerExceptionClient = Pick<PostHog, "captureExceptionImmediate">;

let client: WorkerExceptionClient | null = null;
let clientKey: string | null = null;

function getClient(apiKey: string): WorkerExceptionClient {
  if (!client || clientKey !== apiKey) {
    // Workers can end before a batch flushes, so send each event immediately.
    client = new PostHog(apiKey, { host: POSTHOG_HOST, flushAt: 1, flushInterval: 0 });
    clientKey = apiKey;
  }
  return client;
}

/**
 * Report an exception that escaped the Worker fetch handler. Never throws; the caller re-throws
 * the original error. `ctx.waitUntil` keeps the send alive after the invocation fails.
 */
export function captureWorkerException(
  error: unknown,
  request: Request,
  env: Env,
  ctx: ExecutionContext | undefined,
  clientImpl?: WorkerExceptionClient,
): void {
  const apiKey = env.POSTHOG_PROJECT_KEY?.trim();
  if (!apiKey || !ctx) {
    return;
  }

  const properties = {
    $process_person_profile: false,
    runtime: "cloudflare-worker",
    method: request.method,
    path: scrubString(new URL(request.url).pathname),
    cf_ray: request.headers.get("cf-ray") ?? undefined,
  };
  const send = Promise.resolve()
    .then(() =>
      (clientImpl ?? getClient(apiKey)).captureExceptionImmediate(
        scrubTelemetryError(error),
        WORKER_EXCEPTION_DISTINCT_ID,
        properties,
      ),
    )
    .catch(() => {});
  ctx.waitUntil(send);
}
