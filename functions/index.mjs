/** Cloud Functions entry (Node.js 24). */
import { getApps, initializeApp } from "firebase-admin/app";

if (getApps().length === 0) {
  initializeApp();
}

export { grantAccess, proxy } from "./handlers/proxies.mjs";

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
  notifyPendingQuestion,
  notifySessionMessage,
  notifySessionTimer,
  purgeStaleSessions,
  warmPremiumOverpassPreload,
} from "./handlers/triggers.mjs";

export { listActiveSessions } from "./admin/listActiveSessions.mjs";
export { adminModerateSession } from "./admin/moderateSession.mjs";
