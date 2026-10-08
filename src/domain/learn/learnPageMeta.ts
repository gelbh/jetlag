// Loaded by routeSeo (App chunk, critical path): titles and link labels only. Page bodies live
// in learnContent.ts, which only the lazy LearnPage route imports.
import { isLearnRoutePath, type LearnRoutePath } from "@/domain/seo/learnRoutePaths";
import type { LearnLinkPath } from "./learnContentTypes";

export type LearnPageMeta = {
  /** Short sticky-bar title. */
  headerTitle: string;
  /** Page heading (the only h1). */
  h1: string;
  /** `<title>`, ≤ 60 chars. */
  seoTitle: string;
  /** Meta description, ≤ 160 chars. */
  description: string;
  /** Label for internal links and breadcrumbs. */
  linkLabel: string;
  /** Breadcrumb parent; `null` sits directly under Home. */
  parent: LearnRoutePath | null;
};

const LEARN_PAGE_META: Record<LearnRoutePath, LearnPageMeta> = {
  "/guide": {
    headerTitle: "How to play",
    h1: "How to play Jet Lag Hide + Seek in your city",
    seoTitle: "How to Play Jet Lag Hide + Seek in Your Own City",
    description:
      "Run a Jet Lag-style Hide + Seek game in your own city: pick roles, set the game area, start the hiding period, ask map questions, and finish the round.",
    linkLabel: "How to play",
    parent: null,
  },
  "/tools": {
    headerTitle: "Question tools",
    h1: "Hide + Seek question tools",
    seoTitle: "Hide + Seek Question Tools · Jet Lag Map Companion",
    description:
      "How Matching, Measuring, Thermometer, Radar, Tentacles, and Photo questions work in the map companion, and how each answer shades the map.",
    linkLabel: "All question tools",
    parent: null,
  },
  "/tools/radar": {
    headerTitle: "Radar",
    h1: "Radar question",
    seoTitle: "Radar Question Explained · Jet Lag Hide + Seek",
    description:
      "Radar asks the hider: are you within this distance of me? See the distance options, how the hider answers, and how the map shades a yes or a no.",
    linkLabel: "Radar question",
    parent: "/tools",
  },
  "/tools/thermometer": {
    headerTitle: "Thermometer",
    h1: "Thermometer question",
    seoTitle: "Thermometer Question Explained · Jet Lag Hide + Seek",
    description:
      "Thermometer asks whether seekers got hotter or colder after traveling a set distance. See the distances and how the answer splits the map in two.",
    linkLabel: "Thermometer question",
    parent: "/tools",
  },
  "/tools/matching": {
    headerTitle: "Matching",
    h1: "Matching question",
    seoTitle: "Matching Question Explained · Jet Lag Hide + Seek",
    description:
      "Matching asks whether the hider's nearest airport, park, museum, or other place is the same as the seekers'. See the categories and the map shading.",
    linkLabel: "Matching question",
    parent: "/tools",
  },
  "/tools/measuring": {
    headerTitle: "Measuring",
    h1: "Measuring question",
    seoTitle: "Measuring Question Explained · Jet Lag Hide + Seek",
    description:
      "Measuring asks whether the hider is closer to or further from a type of place than the seekers. See the categories and how the map shades each answer.",
    linkLabel: "Measuring question",
    parent: "/tools",
  },
  "/tools/tentacles": {
    headerTitle: "Tentacles",
    h1: "Tentacles question",
    seoTitle: "Tentacles Question Explained · Jet Lag Hide + Seek",
    description:
      "Tentacles asks which nearby museum, library, hospital, or other place the hider is closest to. See the radius, the categories, and the map shading.",
    linkLabel: "Tentacles question",
    parent: "/tools",
  },
  "/tools/photo": {
    headerTitle: "Photo",
    h1: "Photo question",
    seoTitle: "Photo Question Explained · Jet Lag Hide + Seek",
    description:
      "Photo asks the hider to send a picture of something nearby, like the sky or the widest street. See the prompts by game size and how hiders reply.",
    linkLabel: "Photo question",
    parent: "/tools",
  },
  "/faq": {
    headerTitle: "FAQ",
    h1: "Jet Lag Map Companion FAQ",
    seoTitle: "Jet Lag Map Companion FAQ: Free, Premium, Offline",
    description:
      "Quick answers about the Jet Lag Map Companion: what is free, what Premium adds, offline play, supported areas, installing it, and privacy.",
    linkLabel: "FAQ",
    parent: null,
  },
};

const OTHER_LINK_LABELS: Record<Exclude<LearnLinkPath, LearnRoutePath>, string> = {
  "/premium": "Premium",
  "/privacy": "Privacy Policy",
};

/** Link label for a "Keep reading" target. */
export function learnLinkLabel(path: LearnLinkPath): string {
  return isLearnRoutePath(path) ? LEARN_PAGE_META[path].linkLabel : OTHER_LINK_LABELS[path];
}

export function learnPageMeta(path: LearnRoutePath): LearnPageMeta {
  return LEARN_PAGE_META[path];
}

export type LearnBreadcrumb = { name: string; path: string };

/** Home → (parent) → page, for the breadcrumb nav and `BreadcrumbList` JSON-LD. */
export function learnBreadcrumbs(path: LearnRoutePath): LearnBreadcrumb[] {
  const meta = learnPageMeta(path);
  const crumbs: LearnBreadcrumb[] = [{ name: "Home", path: "/" }];
  if (meta.parent) {
    crumbs.push({ name: learnPageMeta(meta.parent).headerTitle, path: meta.parent });
  }
  crumbs.push({ name: meta.headerTitle, path });
  return crumbs;
}
