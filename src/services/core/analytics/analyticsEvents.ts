import type { MapTool } from "@/domain/map/mapToolTypes";
import type { PlayerRole } from "@/domain/session/players/playerRole";
import type { GameSize } from "@/domain/session/size/gameSize";
import type { SessionTier } from "@/domain/map/annotations";
import type { PremiumProductKey } from "@/domain/billing/premiumProducts";

export const ANALYTICS_EVENTS = {
  session_created: "session_created",
  session_joined: "session_joined",
  session_ended: "session_ended",
  role_selected: "role_selected",
  premium_checkout_started: "premium_checkout_started",
  premium_checkout_failed: "premium_checkout_failed",
  premium_purchase_completed: "premium_purchase_completed",
  map_tool_used: "map_tool_used",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/** Reasons emitted with `session_ended`. Host leave that promotes does not emit. */
export type SessionEndedReason =
  | "host_end"
  | "host_leave_ended"
  | "fallback_client_end"
  | "expected_already_ended"
  | "game_over"
  | "local";

export type AnalyticsEventProps = {
  session_created: {
    tier: SessionTier;
    gameSize: GameSize;
    role: PlayerRole;
  };
  session_joined: {
    role: PlayerRole;
  };
  session_ended: {
    reason: SessionEndedReason;
  };
  role_selected: {
    role: PlayerRole;
    surface: "create" | "join";
  };
  premium_checkout_started: {
    productKey: PremiumProductKey;
  };
  premium_checkout_failed: {
    productKey?: PremiumProductKey;
    message?: string;
  };
  premium_purchase_completed: Record<string, never>;
  map_tool_used: {
    tool: Exclude<MapTool, "none">;
  };
};
