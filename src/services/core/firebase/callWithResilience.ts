import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";
import { fullJitterDelayMs } from "@/domain/device/network/backoff";
import { NeedsConnectionError } from "@/domain/device/network/needsConnectionError";
import { isDeviceEffectivelyOffline } from "@/services/core/network/deviceOffline";
import { getFirebaseFunctions } from "./firebase";

export { NeedsConnectionError };

export const DEFAULT_CALLABLE_TIMEOUT_MS = 12_000;
/** Wall-clock cap across all attempts and backoff sleeps. */
export const DEFAULT_CALLABLE_BUDGET_MS = 25_000;
/** Don't start an attempt that could not realistically finish. */
const MIN_ATTEMPT_MS = 1_000;

const RETRIABLE_CODES = new Set([
  "functions/unavailable",
  "functions/deadline-exceeded",
  "functions/internal",
]);

export type CallWithResilienceOptions<Res = unknown> = {
  /** Per-attempt SDK timeout (the SDK default is 70 s). */
  timeoutMs?: number;
  /** Total wall-clock budget across attempts. */
  budgetMs?: number;
  /**
   * Set only when a repeat call cannot double-apply: the handler is read-only
   * or state-guarded, so a retry after a lost response converges or fails with
   * a precondition error. Non-idempotent calls never retry.
   */
  idempotent?: boolean;
  /** Attempts for idempotent calls (ignored otherwise). */
  maxAttempts?: number;
  /** Runs after the offline gate and Functions init, before the first attempt. */
  prepare?: () => Promise<void>;
  /**
   * Called only when a *retry* fails with a non-retriable error. A state-guarded
   * handler answers a repeat of an already-committed call with a precondition
   * error; return a result here to treat that as success, or undefined to throw.
   */
  recoverAfterRetry?: (error: unknown) => Res | undefined | Promise<Res | undefined>;
};

/** Match a callable HttpsError by code (without `functions/`) and optional exact message. */
export function isCallableError(error: unknown, code: string, message?: string): boolean {
  return (
    error instanceof FirebaseError &&
    error.code === `functions/${code}` &&
    (message === undefined || error.message === message)
  );
}

function isRetriableCallableError(error: unknown): boolean {
  return error instanceof FirebaseError && RETRIABLE_CODES.has(error.code);
}

/**
 * Callables have no offline queue. Fail fast when offline, cap each attempt at
 * `timeoutMs` and the whole call at `budgetMs`, and retry transient failures
 * with full jitter only when the handler is idempotent.
 */
export async function callWithResilience<Req, Res>(
  name: string,
  payload: Req,
  opts: CallWithResilienceOptions<Res> = {},
): Promise<Res> {
  const {
    timeoutMs = DEFAULT_CALLABLE_TIMEOUT_MS,
    idempotent = false,
    prepare,
    recoverAfterRetry,
  } = opts;
  const budgetMs = Math.max(opts.budgetMs ?? DEFAULT_CALLABLE_BUDGET_MS, timeoutMs);
  const maxAttempts = idempotent ? (opts.maxAttempts ?? 3) : 1;

  if (isDeviceEffectivelyOffline()) {
    throw new NeedsConnectionError();
  }

  const functions = await getFirebaseFunctions();
  await prepare?.();
  const deadline = Date.now() + budgetMs;

  for (let attempt = 0; ; attempt += 1) {
    const remaining = deadline - Date.now();
    const callable = httpsCallable<Req, Res>(functions, name, {
      timeout: Math.max(MIN_ATTEMPT_MS, Math.min(timeoutMs, remaining)),
    });
    try {
      return (await callable(payload)).data;
    } catch (error) {
      if (attempt > 0 && !isRetriableCallableError(error) && recoverAfterRetry) {
        const recovered = await recoverAfterRetry(error);
        if (recovered !== undefined) {
          return recovered;
        }
      }
      if (!isRetriableCallableError(error) || attempt + 1 >= maxAttempts) {
        throw error;
      }
      const delayMs = fullJitterDelayMs(attempt);
      if (deadline - Date.now() - delayMs < MIN_ATTEMPT_MS) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      // Signal dropped while backing off: stop instead of burning attempts.
      if (isDeviceEffectivelyOffline()) {
        throw new NeedsConnectionError();
      }
    }
  }
}
