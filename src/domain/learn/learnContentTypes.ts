import type { LearnRoutePath } from "@/domain/seo/learnRoutePaths";

/** Pages a learn article may link to under "Keep reading". */
export type LearnLinkPath = LearnRoutePath | "/premium" | "/privacy";

/** Interactive product showcases mounted inside learn articles. */
export type LearnShowcaseId =
  | "radar"
  | "thermometer"
  | "matching"
  | "measuring"
  | "tentacles"
  | "photo"
  | "tools-hub";

export type LearnBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "steps"; items: readonly string[] }
  | { kind: "bullets"; items: readonly string[] }
  | {
      kind: "table";
      caption: string;
      head: readonly [string, string];
      rows: readonly (readonly [string, string])[];
    }
  | {
      kind: "showcase";
      showcase: LearnShowcaseId;
      /** Visible caption under the demo frame (also used as accessible name). */
      caption: string;
    };

export type LearnSection = {
  /** Stable fragment id (`#id`) for deep links. */
  id: string;
  heading: string;
  /** Direct answer shown first under the heading (aim for 40–60 words). */
  lead: string;
  blocks?: readonly LearnBlock[];
};

export type LearnPageContent = {
  path: LearnRoutePath;
  intro: string;
  sections: readonly LearnSection[];
  /** "Keep reading" links, in order. */
  related: readonly LearnLinkPath[];
};
