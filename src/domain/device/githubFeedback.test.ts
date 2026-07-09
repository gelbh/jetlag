import { describe, expect, it } from "vitest";
import { APP_VERSION } from "./changelog";
import {
  githubBugReportUrl,
  githubBugsBrowseUrl,
  githubIdeasBrowseUrl,
  githubIdeaSubmitUrl,
  githubIssuesUrl,
} from "./githubFeedback";

describe("githubFeedback", () => {
  it("builds GitHub feedback URLs", () => {
    expect(githubIssuesUrl()).toBe(
      "https://github.com/gelbh/jetlag/issues/new",
    );
    expect(githubBugReportUrl()).toBe(
      `https://github.com/gelbh/jetlag/issues/new?template=bug_report.yml&version=${APP_VERSION}`,
    );
    expect(githubBugsBrowseUrl()).toBe(
      "https://github.com/gelbh/jetlag/issues?q=is%3Aissue+label%3Abug",
    );
    expect(githubIdeasBrowseUrl()).toBe(
      "https://github.com/gelbh/jetlag/discussions/categories/ideas",
    );
    expect(githubIdeaSubmitUrl()).toBe(
      "https://github.com/gelbh/jetlag/discussions/new?category=ideas",
    );
  });
});
