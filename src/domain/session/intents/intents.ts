/**
 * Server-trusted session actions written as `sessions/{id}/intents/{id}` docs
 * and applied by the `processSessionIntent` trigger. This union is the single
 * extension point for new offline-queued server actions — add types here, not a
 * second queue.
 */
export type SessionIntentType = "moveTimer";

export type MoveTimerAction = "pause" | "resume";

/** Client-authored fields; `createdAt` (server timestamp) is added at write time. */
export type MoveTimerIntentInput = {
  type: "moveTimer";
  action: MoveTimerAction;
  uid: string;
  /** Skew-corrected play time; the server clamps it before applying a pause. */
  requestedAtMs: number;
};

export function buildMoveTimerIntent(
  uid: string,
  action: MoveTimerAction,
  requestedAtMs: number,
): MoveTimerIntentInput {
  return { type: "moveTimer", action, uid, requestedAtMs: Math.round(requestedAtMs) };
}
