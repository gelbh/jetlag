const HOST_ONLY_MESSAGE = /Only the host can do that\.?/i;
const ALREADY_ENDED_MESSAGE = /Session already ended\.?/i;

/** Leave and end callables report a deleted session doc as not-found: nothing left to leave. */
function isSessionGoneCallableError(error: Error): boolean {
  return "code" in error && error.code === "functions/not-found";
}

export function isExpectedSessionLeaveError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (isSessionGoneCallableError(error) || isExpectedSessionLeaveMessage(error.message))
  );
}

export function isExpectedSessionLeaveMessage(message: string): boolean {
  return HOST_ONLY_MESSAGE.test(message) || ALREADY_ENDED_MESSAGE.test(message);
}
