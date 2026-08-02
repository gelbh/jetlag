import { LEGAL_APP_NAME } from "../legal/legalContact";
import crawlPolicy from "./seoCrawlPolicy.json";

export type SeoRobots = "index,follow" | "noindex,nofollow";

export type RouteSeo = {
  title: string;
  description: string;
  canonicalPath: string;
  robots: SeoRobots;
  ogImagePath: string;
  jsonLd?: Record<string, unknown>;
};

type RouteSeoSource = Omit<RouteSeo, "robots">;

export const APP_ROUTE_PATHS = [
  "/",
  "/feedback",
  "/stats",
  "/friends",
  "/leaderboard",
  "/privacy",
  "/terms",
  "/premium",
  "/create",
  "/join",
  "/admin",
  "/admin/incidents",
  "/admin/incidents/:incidentId",
  "/presets",
  "/presets/new",
  "/presets/:id/edit",
  "/map",
] as const;

const PRESET_EDIT_PATH_RE = /^\/presets\/[^/]+\/edit$/;
const ADMIN_INCIDENT_PATH_RE = /^\/admin\/incidents\/[^/]+$/;
const DEFAULT_OG_IMAGE_PATH = "/og-default.png";

const INDEXABLE_PATHS = new Set(crawlPolicy.indexablePaths);
const UNOFFICIAL_DISCLAIMER =
  "Unofficial fan companion. Not affiliated with Jet Lag: The Game, the board game, or Nebula.";

const HOME_DESCRIPTION =
  "Jet Lag Map Companion is an unofficial fan companion for Jet Lag Hide + Seek. Host or join synced map sessions with live questions, zones, and tools.";

function titleFor(page: string): string {
  return `${page} · ${LEGAL_APP_NAME}`;
}

function webPageJsonLd(
  path: string,
  title: string,
  description: string,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    url: absoluteUrl(path),
    description,
    disclaimer: UNOFFICIAL_DISCLAIMER,
  };
}

export function absoluteUrl(path: string): string {
  const origin = crawlPolicy.siteOrigin;
  if (path === "/") return `${origin}/`;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${normalized.replace(/\/$/, "")}`;
}

export function listIndexablePaths(): readonly string[] {
  return crawlPolicy.indexablePaths;
}

function normalizeSeoPath(pathname: string): string {
  const base = pathname.split("?")[0]?.split("#")[0] ?? "/";
  if (PRESET_EDIT_PATH_RE.test(base)) {
    return "/presets/:id/edit";
  }
  if (ADMIN_INCIDENT_PATH_RE.test(base)) {
    return "/admin/incidents/:incidentId";
  }
  return base || "/";
}

const PREMIUM_TITLE = titleFor("Premium");
const PREMIUM_DESCRIPTION =
  "Unlock premium map companion tools for Jet Lag Hide + Seek sessions.";
const PRIVACY_TITLE = titleFor("Privacy");
const PRIVACY_DESCRIPTION = `Privacy policy for ${LEGAL_APP_NAME}, an unofficial fan companion for Jet Lag Hide + Seek.`;
const TERMS_TITLE = titleFor("Terms");
const TERMS_DESCRIPTION = `Terms of use for ${LEGAL_APP_NAME}, an unofficial fan companion for Jet Lag Hide + Seek.`;

const ROUTE_SEO_BY_PATH: Record<string, RouteSeoSource> = {
  "/": {
    title: LEGAL_APP_NAME,
    description: HOME_DESCRIPTION,
    canonicalPath: "/",
    ogImagePath: DEFAULT_OG_IMAGE_PATH,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: LEGAL_APP_NAME,
      url: absoluteUrl("/"),
      applicationCategory: "GameApplication",
      description: HOME_DESCRIPTION,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      disclaimer: UNOFFICIAL_DISCLAIMER,
    },
  },
  "/premium": {
    title: PREMIUM_TITLE,
    description: PREMIUM_DESCRIPTION,
    canonicalPath: "/premium",
    ogImagePath: DEFAULT_OG_IMAGE_PATH,
    jsonLd: webPageJsonLd("/premium", PREMIUM_TITLE, PREMIUM_DESCRIPTION),
  },
  "/privacy": {
    title: PRIVACY_TITLE,
    description: PRIVACY_DESCRIPTION,
    canonicalPath: "/privacy",
    ogImagePath: DEFAULT_OG_IMAGE_PATH,
    jsonLd: webPageJsonLd("/privacy", PRIVACY_TITLE, PRIVACY_DESCRIPTION),
  },
  "/terms": {
    title: TERMS_TITLE,
    description: TERMS_DESCRIPTION,
    canonicalPath: "/terms",
    ogImagePath: DEFAULT_OG_IMAGE_PATH,
    jsonLd: webPageJsonLd("/terms", TERMS_TITLE, TERMS_DESCRIPTION),
  },
  "/feedback": {
    title: titleFor("Feedback"),
    description: `Send feedback about ${LEGAL_APP_NAME}.`,
    canonicalPath: "/feedback",
    ogImagePath: DEFAULT_OG_IMAGE_PATH,
  },
  "/stats": {
    title: titleFor("Stats"),
    description: `Your session stats in ${LEGAL_APP_NAME}.`,
    canonicalPath: "/stats",
    ogImagePath: DEFAULT_OG_IMAGE_PATH,
  },
  "/friends": {
    title: titleFor("Friends"),
    description: `Manage friends in ${LEGAL_APP_NAME}.`,
    canonicalPath: "/friends",
    ogImagePath: DEFAULT_OG_IMAGE_PATH,
  },
  "/leaderboard": {
    title: titleFor("Leaderboard"),
    description: `Leaderboard for ${LEGAL_APP_NAME}.`,
    canonicalPath: "/leaderboard",
    ogImagePath: DEFAULT_OG_IMAGE_PATH,
  },
  "/create": {
    title: titleFor("Create"),
    description: `Create a map session in ${LEGAL_APP_NAME}.`,
    canonicalPath: "/create",
    ogImagePath: DEFAULT_OG_IMAGE_PATH,
  },
  "/join": {
    title: titleFor("Join"),
    description: `Join a map session in ${LEGAL_APP_NAME}.`,
    canonicalPath: "/join",
    ogImagePath: DEFAULT_OG_IMAGE_PATH,
  },
  "/admin": {
    title: titleFor("Admin"),
    description: `Admin tools for ${LEGAL_APP_NAME}.`,
    canonicalPath: "/admin",
    ogImagePath: DEFAULT_OG_IMAGE_PATH,
  },
  "/admin/incidents": {
    title: titleFor("Incidents"),
    description: `Player incident desk for ${LEGAL_APP_NAME}.`,
    canonicalPath: "/admin/incidents",
    ogImagePath: DEFAULT_OG_IMAGE_PATH,
  },
  "/admin/incidents/:incidentId": {
    title: titleFor("Incident"),
    description: `Incident detail for ${LEGAL_APP_NAME}.`,
    canonicalPath: "/admin/incidents/:incidentId",
    ogImagePath: DEFAULT_OG_IMAGE_PATH,
  },
  "/presets": {
    title: titleFor("Presets"),
    description: `Browse game presets in ${LEGAL_APP_NAME}.`,
    canonicalPath: "/presets",
    ogImagePath: DEFAULT_OG_IMAGE_PATH,
  },
  "/presets/new": {
    title: titleFor("New preset"),
    description: `Create a game preset in ${LEGAL_APP_NAME}.`,
    canonicalPath: "/presets/new",
    ogImagePath: DEFAULT_OG_IMAGE_PATH,
  },
  "/presets/:id/edit": {
    title: titleFor("Edit preset"),
    description: `Edit a game preset in ${LEGAL_APP_NAME}.`,
    canonicalPath: "/presets/:id/edit",
    ogImagePath: DEFAULT_OG_IMAGE_PATH,
  },
  "/map": {
    title: titleFor("Map"),
    description: `Live map session tools in ${LEGAL_APP_NAME}.`,
    canonicalPath: "/map",
    ogImagePath: DEFAULT_OG_IMAGE_PATH,
  },
};

const NOT_FOUND_TITLE = titleFor("Page not found");
const NOT_FOUND_DESCRIPTION = `This page does not exist in ${LEGAL_APP_NAME}.`;

export function getRouteSeo(pathname: string): RouteSeo {
  const normalized = normalizeSeoPath(pathname);
  const entry = ROUTE_SEO_BY_PATH[normalized];
  if (!entry) {
    return {
      title: NOT_FOUND_TITLE,
      description: NOT_FOUND_DESCRIPTION,
      canonicalPath: normalized,
      ogImagePath: DEFAULT_OG_IMAGE_PATH,
      robots: "noindex,nofollow",
    };
  }
  return {
    ...entry,
    robots: INDEXABLE_PATHS.has(normalized)
      ? "index,follow"
      : "noindex,nofollow",
  };
}
