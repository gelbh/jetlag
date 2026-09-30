const HOST_ONLY_MESSAGE = /Only the host can do that\.?/i;
const ALREADY_ENDED_MESSAGE = /Session already ended\.?/i;

/**
 * Expected leave/end callable outcomes — not product bugs. Matches on the
 * message only (FirebaseError included) so telemetry policy stays firebase-free.
 */
export function isExpectedSessionLeaveError(error: unknown): boolean {
  return error instanceof Error && isExpectedSessionLeaveMessage(error.message);
}

export function isExpectedSessionLeaveMessage(message: string): boolean {
  return HOST_ONLY_MESSAGE.test(message) || ALREADY_ENDED_MESSAGE.test(message);
}
