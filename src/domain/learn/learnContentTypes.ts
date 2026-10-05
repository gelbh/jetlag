import type { LearnRoutePath } from "@/domain/seo/learnRoutePaths";

/** Pages a learn article may link to under "Keep reading". */
export type LearnLinkPath = LearnRoutePath | "/premium" | "/privacy";

export type LearnBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "steps"; items: readonly string[] }
  | { kind: "bullets"; items: readonly string[] }
  | {
      kind: "table";
      caption: string;
      head: readonly [string, string];
      rows: readonly (readonly [string, string])[];
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
