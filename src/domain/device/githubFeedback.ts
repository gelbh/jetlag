import { APP_VERSION } from "./changelog";

const GITHUB_REPO = "https://github.com/gelbh/jetlag";

const DEFAULT_GITHUB_ISSUES_URL = `${GITHUB_REPO}/issues/new`;

export function githubIssuesUrl(): string {
  return DEFAULT_GITHUB_ISSUES_URL;
}

export function githubBugReportUrl(): string {
  const params = new URLSearchParams({
    template: "bug_report.yml",
    version: APP_VERSION,
  });
  return `${GITHUB_REPO}/issues/new?${params.toString()}`;
}

export function githubBugsBrowseUrl(): string {
  return `${GITHUB_REPO}/issues?q=is%3Aissue+label%3Abug`;
}

export function githubIdeasBrowseUrl(): string {
  return `${GITHUB_REPO}/discussions/categories/ideas`;
}

export function githubIdeaSubmitUrl(): string {
  return `${GITHUB_REPO}/discussions/new?category=ideas`;
}
