const GITHUB_REPO = "https://github.com/gelbh/jetlag";

const DEFAULT_GITHUB_ISSUES_URL = `${GITHUB_REPO}/issues/new`;

export function githubIssuesUrl(): string {
  return DEFAULT_GITHUB_ISSUES_URL;
}

export function githubBugReportUrl(): string {
  return `${GITHUB_REPO}/issues/new?template=bug_report`;
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
