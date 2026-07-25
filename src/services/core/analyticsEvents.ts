import type { MapTool } from "../../domain/map/mapToolTypes";
import type { PlayerRole } from "../../domain/session/playerRole";
import type { GameSize } from "../../domain/session/gameSize";
import type { SessionTier } from "../../domain/map/annotations";
import type { PremiumProductKey } from "../../domain/billing/premiumProducts";

export const ANALYTICS_EVENTS = {
  session_created: "session_created",
  session_joined: "session_joined",
  session_ended: "session_ended",
  premium_checkout_started: "premium_checkout_started",
  premium_purchase_completed: "premium_purchase_completed",
  map_tool_used: "map_tool_used",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type AnalyticsEventProps = {
  session_created: {
    tier: SessionTier;
    gameSize: GameSize;
    role: PlayerRole;
  };
  session_joined: {
    role: PlayerRole;
  };
  session_ended: Record<string, never>;
  premium_checkout_started: {
    productKey: PremiumProductKey;
  };
  premium_purchase_completed: Record<string, never>;
  map_tool_used: {
    tool: Exclude<MapTool, "none">;
  };
};
