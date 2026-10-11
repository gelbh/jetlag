import type { SessionRulesInput } from "@/domain/session/rules";

/** Minimal medium-game rules for learn-page thermometer demos. */
export const LEARN_DEMO_SESSION_RULES = {
  gameSize: "medium",
  distanceUnit: "metric",
  hidingPeriodMinutes: 90,
} as SessionRulesInput;
