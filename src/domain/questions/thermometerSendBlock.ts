export type ThermometerSendBlockReason =
  | "open_question"
  | "distance_unavailable"
  | "distance_used"
  | "travel_too_short"
  | "gps_waiting";

export const THERMOMETER_SEND_BLOCK_MESSAGES: Record<ThermometerSendBlockReason, string> = {
  open_question: "Finish the open question before starting another.",
  distance_unavailable: "That distance is not available for this game size. Change the distance.",
  distance_used: "That distance was already used this session. Change the distance.",
  travel_too_short: "Movement is shorter than the selected distance.",
  gps_waiting: "Waiting for a GPS update. Keep walking to arm End walk.",
};

export type ThermometerSendBlockInput = {
  walkingActive: boolean;
  canSubmitQuestion: boolean;
  distanceAvailableForSession: boolean;
  distanceUnused: boolean;
  travelTooShort: boolean;
  liveTravelMeters: number | null;
};

/** First gate that keeps the commit control disarmed, or null when none apply. */
export function thermometerSendBlockReason(
  input: ThermometerSendBlockInput,
): ThermometerSendBlockReason | null {
  if (input.walkingActive) {
    return input.liveTravelMeters === null ? "gps_waiting" : null;
  }
  if (!input.canSubmitQuestion) {
    return "open_question";
  }
  if (!input.distanceAvailableForSession) {
    return "distance_unavailable";
  }
  if (!input.distanceUnused) {
    return "distance_used";
  }
  if (input.travelTooShort) {
    return "travel_too_short";
  }
  return null;
}
