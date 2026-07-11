import type { LegalSection } from "./legalContact";

export const PRIVACY_POLICY_SECTIONS: LegalSection[] = [
  {
    id: "overview",
    title: "Overview",
    paragraphs: [
      "Jet Lag Map Companion is an unofficial fan app for Jet Lag: The Game. Gelbhart operates it as a personal project. It is not affiliated with the show, board game, or Nebula.",
      "This policy describes what data the app collects, how it is used, and who receives it.",
    ],
  },
  {
    id: "accounts",
    title: "Accounts",
    paragraphs: [
      "You can play without signing in. The app creates an anonymous Firebase account so sessions and map data can sync.",
      "If you sign in with Google or email on Premium, Firebase stores your account identifier and email address (for email sign-in). Sign-in links premium purchases to your account across devices.",
    ],
  },
  {
    id: "session-data",
    title: "Session and map data",
    paragraphs: [
      "When you host or join a session, the app stores session codes, player roles, map annotations (zones, pins, questions), chat messages, and game settings in Firebase Firestore so all players stay in sync.",
      "Session data is shared with other players in the same session. Hosts control when a session ends.",
    ],
  },
  {
    id: "location",
    title: "Location",
    paragraphs: [
      "The app can read your device location only when you allow it. Seekers and hiders may share live location on the map during a session. Location is not collected in the background when you are not using the app.",
      "You can deny or revoke location permission in your device settings at any time.",
    ],
  },
  {
    id: "photos",
    title: "Photo answers",
    paragraphs: [
      "When a hider uploads a photo answer, the image is stored in Firebase Storage and linked to the question in the session. Other players in that session can view the photo.",
    ],
  },
  {
    id: "premium",
    title: "Premium billing",
    paragraphs: [
      "Premium purchases are processed by Stripe. Stripe receives payment details you enter at checkout. The app stores your entitlement status (credits, subscription, or lifetime access) in Firestore after Stripe confirms payment.",
      "Billing history and refunds are handled through Stripe's billing portal and policies.",
    ],
  },
  {
    id: "errors-analytics",
    title: "Error reporting and analytics",
    paragraphs: [
      "In production, the app may send crash and error reports to Sentry. Session codes and certain identifiers are scrubbed before reports leave your device.",
      "If configured, the app sends anonymous page-view events to Google Analytics 4. No session codes or map content are included.",
    ],
  },
  {
    id: "third-parties",
    title: "Map and geo services",
    paragraphs: [
      "The map loads tiles and data from third-party services such as OpenStreetMap, CARTO, Overpass, and bundled transit feeds. Requests may include map coordinates or place names needed to render the map and answer game tools.",
      "Firebase, Google (for sign-in and App Check), Stripe, Sentry, and Google Analytics process data under their own privacy policies.",
    ],
  },
  {
    id: "local-storage",
    title: "Data on your device",
    paragraphs: [
      "The app stores tutorial progress, map preferences, and similar settings in your browser or app storage. This data stays on your device unless you clear app data.",
    ],
  },
  {
    id: "retention",
    title: "Retention",
    paragraphs: [
      "Session data remains in Firestore while the session is active and for a reasonable period afterward so players can rejoin. Premium account data is kept while your account exists.",
      "You can ask about deletion by opening a GitHub issue (see Contact).",
    ],
  },
  {
    id: "choices",
    title: "Your choices",
    paragraphs: [
      "You do not need an account to play free sessions. Location sharing is optional. You can use the app without signing in to Premium.",
      "Clearing site data or uninstalling the app removes local preferences. Remote session data may remain until it expires or you request removal.",
    ],
  },
  {
    id: "changes",
    title: "Changes",
    paragraphs: [
      "This policy may be updated when the app changes. The date at the top of this page shows when it last changed.",
    ],
  },
];
