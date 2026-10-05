// Copy checked against: src/hooks/billing/usePremiumHostEligibility.ts and
// src/components/billing/PremiumFeatureList.tsx (Premium), src/sw.ts and
// src/services/core/network/offlineQueue.ts (offline), src/domain/regions/bundledPresets/index.ts
// (built-in areas), src/components/ui/banners/PwaInstallTipBanner.tsx (install) and
// src/domain/legal/privacyPolicyContent.ts (privacy). Re-check them when those change.
import type { LearnPageContent } from "./learnContentTypes";

export const FAQ_CONTENT: LearnPageContent = {
  path: "/faq",
  intro: "Short answers to the questions people ask most about the map companion.",
  sections: [
    {
      id: "is-it-official",
      heading: "Is this the official Jet Lag app?",
      lead: "No. Jet Lag Map Companion is an unofficial fan project. It is not affiliated with Jet Lag: The Game, the Jet Lag board game, or Nebula. It is a map tool for running your own Hide + Seek games inspired by the show.",
    },
    {
      id: "is-it-free",
      heading: "Is it free?",
      lead: "Yes. Free sessions include every question tool and public map data, and you can play without an account. Premium is optional and is bought by the host for the sessions they run. Players who join a session do not need to pay.",
    },
    {
      id: "premium",
      heading: "What does Premium add?",
      lead: "Premium adds live transit and faster map loads to the sessions you host. Live transit shows vehicle positions on the map in metro areas that support it. Faster map loads means the app fetches game area data in the background more quickly. Question tools are the same in free and Premium sessions.",
      blocks: [
        {
          kind: "paragraph",
          text: "Premium comes as session packs, monthly or yearly plans, or a one-time lifetime purchase. You need to sign in to buy it. The Premium page has current prices.",
        },
      ],
    },
    {
      id: "offline",
      heading: "Does it work offline?",
      lead: "Partly. Once loaded, the app itself works offline, and map tiles you have already viewed stay cached. Changes you make while offline are queued and sync when you reconnect. There are no downloadable offline maps, so load your game area while you still have a signal.",
    },
    {
      id: "where",
      heading: "Where can I play?",
      lead: "Anywhere with map data. You can search for any place, draw your own game area, or import a KML or KMZ file. Built-in presets cover Dublin, New York City, Portland (Maine), London, Tokyo, Osaka, Zürich and Lucerne, and Prince Rupert.",
      blocks: [
        {
          kind: "paragraph",
          text: "If your area is not covered by a built-in city pack, you can sign in and request one. Requests are reviewed by hand, so they are not instant.",
        },
      ],
    },
    {
      id: "install",
      heading: "Do I need to install anything?",
      lead: "No. It runs in your phone's browser. For full-screen play, add it to your home screen: on iPhone, tap Share and then Add to Home Screen; in other browsers, use the install option. Installing makes it launch faster and hides the browser bar during hunts.",
    },
    {
      id: "players",
      heading: "How many players do I need?",
      lead: "At least two: one hider and one seeker. Each player uses their own phone. You can have more seekers, and anyone else can follow along as an Observer.",
    },
    {
      id: "account",
      heading: "Do I need an account?",
      lead: "Not to play. The app signs you in anonymously in the background. You only need to sign in with Google or an email link for stats, leaderboards, friends, Premium, and city pack requests.",
    },
    {
      id: "privacy",
      heading: "Who can see my location?",
      lead: "The app reads your location only when you allow it, and not in the background when you are not using it. Seekers share their location with everyone in the session. A hider's location is visible to hiders and observers, not to seekers. Location sharing is optional.",
      blocks: [
        {
          kind: "paragraph",
          text: "In-app analytics are opt-in and leave out session codes, map content, and precise hiding locations. The privacy policy has the full details.",
        },
      ],
    },
  ],
  related: ["/guide", "/tools", "/premium", "/privacy"],
};
