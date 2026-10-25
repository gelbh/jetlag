import type { PremiumProductKey } from "@/domain/billing/premiumProducts";
import type { PowerUpId } from "@/domain/boardEconomy/types";
import type { LearnShowcaseId } from "@/domain/learn/learnContentTypes";
import type { SessionTier } from "@/domain/map/annotations";
import type { MapTool } from "@/domain/map/mapToolTypes";
import type { ThermometerSendBlockReason } from "@/domain/questions/thermometerSendBlock";
import type { LearnRoutePath } from "@/domain/seo/learnRoutePaths";
import type { PendingQuestionToolType } from "@/domain/session/activity/sessionChat";
import type { JoinFailureReason } from "@/domain/session/join/joinFailureReason";
import type { JoinRequestRole } from "@/domain/session/players/joinRequest";
import type { PlayerRole } from "@/domain/session/players/playerRole";

export type AnalyticsSessionRole = PlayerRole | JoinRequestRole;

import type { GameSize } from "@/domain/session/size/gameSize";

export const ANALYTICS_EVENTS = {
  session_created: "session_created",
  session_joined: "session_joined",
  join_failed: "join_failed",
  session_ended: "session_ended",
  session_leave_already_left: "session_leave_already_left",
  role_selected: "role_selected",
  premium_checkout_started: "premium_checkout_started",
  premium_checkout_failed: "premium_checkout_failed",
  premium_purchase_completed: "premium_purchase_completed",
  map_tool_used: "map_tool_used",
  hider_card_played: "hider_card_played",
  analytics_consent_accepted: "analytics_consent_accepted",
  learn_showcase_interacted: "learn_showcase_interacted",
  learn_cta_clicked: "learn_cta_clicked",
  question_asked: "question_asked",
  question_answered: "question_answered",
  game_started: "game_started",
  invite_shared: "invite_shared",
  account_linked: "account_linked",
  pwa_installed: "pwa_installed",
  thermometer_send_blocked: "thermometer_send_blocked",
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/** Reasons emitted with `session_ended`. Host leave that promotes does not emit. */
export type SessionEndedReason =
  | "host_end"
  | "host_leave_ended"
  | "fallback_client_end"
  | "expected_already_ended"
  | "game_over"
  | "local"
  | "abandoned";

/**
 * Opaque session document id for funnel correlation.
 * Prefer this over join codes / `sessionId` keys: those are stripped by analytics scrubbing.
 */
export type AnalyticsGameIdProps = {
  gameId: string;
};

export type AnalyticsEventProps = {
  session_created: AnalyticsGameIdProps & {
    tier: SessionTier;
    gameSize: GameSize;
    role: PlayerRole;
  };
  session_joined: AnalyticsGameIdProps & {
    role: AnalyticsSessionRole;
  };
  join_failed: {
    role: PlayerRole;
    reason: JoinFailureReason;
    /** Present when the join target session was already resolved. */
    gameId?: string;
  };
  session_ended: AnalyticsGameIdProps & {
    reason: SessionEndedReason;
    /** Session `createdAt` when known (abandoned sweep). */
    createdAt?: string;
  };
  session_leave_already_left: Record<string, never>;
  role_selected: {
    role: AnalyticsSessionRole;
    surface: "create" | "join";
  };
  premium_checkout_started: {
    productKey: PremiumProductKey;
  };
  premium_checkout_failed: {
    productKey?: PremiumProductKey;
    message?: string;
  };
  premium_purchase_completed: {
    productKey: PremiumProductKey;
    source: "stripe_webhook";
  };
  map_tool_used: {
    tool: Exclude<MapTool, "none">;
  };
  hider_card_played: {
    card: PowerUpId | "curse" | "move";
    deck?: "physical";
  };
  analytics_consent_accepted: {
    surface: "banner";
  };
  learn_showcase_interacted: {
    showcase: LearnShowcaseId;
  };
  learn_cta_clicked: {
    cta: "join" | "create";
    path: LearnRoutePath;
  };
  question_asked: {
    tool: PendingQuestionToolType;
  };
  question_answered: {
    tool: PendingQuestionToolType;
    mode: "hider_reply" | "self_recorded";
  };
  game_started: Record<string, never>;
  invite_shared: {
    method: "native_share" | "copy_link" | "copy_code";
  };
  account_linked: {
    provider: "google" | "apple" | "email";
    outcome: "linked" | "signed_in_existing";
  };
  pwa_installed: Record<string, never>;
  thermometer_send_blocked: {
    reason: ThermometerSendBlockReason;
    placementMode: "gps" | "manual";
    awaitHiderAnswer: boolean;
  };
};
