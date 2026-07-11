import { githubIssuesUrl } from "../device/githubFeedback";

export const LEGAL_APP_NAME = "Jet Lag Map Companion";
export const LEGAL_OPERATOR = "Gelbhart";
export const LEGAL_EFFECTIVE_DATE = "2026-07-11";
export const LEGAL_PRIVACY_PATH = "/privacy";
export const LEGAL_TERMS_PATH = "/terms";
export const LEGAL_FEEDBACK_URL = githubIssuesUrl();

export interface LegalSection {
  id: string;
  title: string;
  paragraphs: string[];
}
