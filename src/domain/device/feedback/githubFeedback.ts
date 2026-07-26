const GITHUB_REPO = "https://github.com/gelbh/jetlag";

const DEFAULT_GITHUB_ISSUES_URL = `${GITHUB_REPO}/issues/new`;

export function githubIssuesUrl(): string {
  return DEFAULT_GITHUB_ISSUES_URL;
}

/** Markdown issue templates — GitHub Mobile supports these; YAML forms and Discussions do not. */
export function githubBugReportUrl(): string {
  return `${GITHUB_REPO}/issues/new?template=bug_report.md`;
}

export function githubBugsBrowseUrl(): string {
  return `${GITHUB_REPO}/issues?q=is%3Aissue+label%3Abug`;
}

export function githubIdeasBrowseUrl(): string {
  return `${GITHUB_REPO}/issues?q=is%3Aissue+label%3Aenhancement`;
}

export function githubIdeaSubmitUrl(): string {
  return `${GITHUB_REPO}/issues/new?template=idea_report.md`;
}
