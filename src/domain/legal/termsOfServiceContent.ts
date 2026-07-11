import type { LegalSection } from "./legalContact";

export const TERMS_OF_SERVICE_SECTIONS: LegalSection[] = [
  {
    id: "acceptance",
    title: "Acceptance",
    paragraphs: [
      "By using Jet Lag Map Companion, you agree to these terms. If you do not agree, do not use the app.",
      "You must be old enough to use online services in your region and follow local laws while playing.",
    ],
  },
  {
    id: "unofficial",
    title: "Unofficial fan app",
    paragraphs: [
      "Jet Lag Map Companion is an unofficial fan companion for Jet Lag: The Game. It is not affiliated with, endorsed by, or sponsored by the show, board game, Nebula, or any rights holder.",
      "Jet Lag: The Game name and related marks belong to their respective owners. This app is provided independently by Gelbhart.",
    ],
  },
  {
    id: "use",
    title: "Acceptable use",
    paragraphs: [
      "Use the app for lawful Hide + Seek sessions with people who choose to play. Do not harass other players, upload illegal content, attempt to break into sessions you were not invited to, or abuse the service.",
      "Do not scrape, overload, or reverse-engineer the app's infrastructure.",
    ],
  },
  {
    id: "gameplay",
    title: "Gameplay and safety",
    paragraphs: [
      "The app helps groups run map-based games outdoors. You are responsible for your own safety, following traffic laws, and respecting private property.",
      "Live location sharing happens only when you enable it and join a session. Other players in your session can see shared location data while the game runs.",
    ],
  },
  {
    id: "accounts-premium",
    title: "Accounts and premium",
    paragraphs: [
      "Free play uses anonymous accounts. Premium features require sign-in so purchases can sync across devices.",
      "Premium prices, trials, and billing terms are shown at checkout. Payments are processed by Stripe. Refunds and subscription changes follow Stripe's policies and what is offered in the Stripe billing portal.",
      "Premium credits and subscriptions are for use with this app only. They do not transfer to the physical board game or other products.",
    ],
  },
  {
    id: "availability",
    title: "Service availability",
    paragraphs: [
      "The app is provided as-is. Sessions depend on network connectivity, Firebase, and third-party map services. Outages, bugs, or data loss can happen.",
      "Features may change or be removed without notice. There is no guaranteed uptime.",
    ],
  },
  {
    id: "liability",
    title: "Limitation of liability",
    paragraphs: [
      "To the fullest extent allowed by law, Gelbhart is not liable for indirect, incidental, or consequential damages arising from use of the app, including lost game progress, billing disputes handled by Stripe, or injuries during outdoor play.",
      "Your sole remedy for dissatisfaction is to stop using the app.",
    ],
  },
  {
    id: "changes",
    title: "Changes to these terms",
    paragraphs: [
      "These terms may be updated when the app changes. Continued use after an update means you accept the revised terms. The date at the top of this page shows when they last changed.",
    ],
  },
];
