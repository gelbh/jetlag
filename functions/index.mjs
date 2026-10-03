/** Cloud Functions entry (Node.js 24). */
import { getApps, initializeApp } from "firebase-admin/app";

if (getApps().length === 0) {
  initializeApp();
}

export { listActiveSessions } from "./admin/listActiveSessions.mjs";
export { adminModerateSession } from "./admin/moderateSession.mjs";
export {
  createBillingPortalSession,
  createCheckoutSession,
  createPremiumSession,
  getPremiumEntitlements,
  recoverPremiumByStripeEmail,
  startPremiumTrial,
  stripeWebhook,
} from "./handlers/billing.mjs";
export {
  applyIncidentMitigation,
  approveHostConfirm,
  createIncident,
  denyHostConfirm,
  launchIncidentCursorAgent,
  postIncidentMessage,
  postSupportAgentTurn,
  publishIncidentHotfix,
  sessionOpsMcp,
  updateIncidentStatus,
} from "./handlers/incident.mjs";
export {
  createPreloadRequest,
  updatePreloadRequestStatus,
} from "./handlers/preloadRequest.mjs";
export { claimUsername, profileFriends } from "./handlers/profile.mjs";
export { grantAccess, proxy } from "./handlers/proxies.mjs";
export {
  cancelRoleJoinRequest,
  controlSessionTimerForMove,
  endSession,
  initSessionRoleGates,
  joinSessionWithRole,
  leaveHostSession,
  leaveSessionMembership,
  regenerateRolePasscode,
  repairGhostHost,
  requestRoleJoin,
  resetSessionForRematch,
  resolveRoleJoinRequest,
  revealRolePasscode,
} from "./handlers/session.mjs";
export {
  captureStartingLocations,
  finalizeGameResult,
  pollSessionOpsAgentRuns,
  processSessionIntent,
  purgeStaleSessions,
  warmPremiumOverpassPreload,
} from "./handlers/triggers.mjs";
