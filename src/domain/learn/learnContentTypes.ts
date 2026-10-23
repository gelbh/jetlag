import type { LearnRoutePath } from "@/domain/seo/learnRoutePaths";

export type LearnLinkPath = LearnRoutePath | "/premium" | "/privacy";

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
      caption: string;
    };

export type LearnSection = {
  id: string;
  heading: string;
  lead: string;
  blocks?: readonly LearnBlock[];
};

export type LearnPageContent = {
  path: LearnRoutePath;
  intro: string;
  sections: readonly LearnSection[];
  related: readonly LearnLinkPath[];
};
