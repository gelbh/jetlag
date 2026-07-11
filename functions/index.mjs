/** Cloud Functions entry (Node.js 24). */
import { getApps, initializeApp } from "firebase-admin/app";

if (getApps().length === 0) {
  initializeApp();
}

export {
  grantAccess,
  overpass,
  transitland,
  vehicles,
} from "./handlers/proxies.mjs";

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
