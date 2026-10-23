export type SessionIntentType = "moveTimer";

export type MoveTimerAction = "pause" | "resume";

export type MoveTimerIntentInput = {
  type: Extract<SessionIntentType, "moveTimer">;
  action: MoveTimerAction;
  uid: string;
  requestedAtMs: number;
};

export function buildMoveTimerIntent(
  uid: string,
  action: MoveTimerAction,
  requestedAtMs: number,
): MoveTimerIntentInput {
  return { type: "moveTimer", action, uid, requestedAtMs: Math.round(requestedAtMs) };
}
