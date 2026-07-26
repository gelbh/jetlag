import { describe, expect, it } from "vitest";
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
      "https://github.com/gelbh/jetlag/issues/new?template=bug_report.md",
    );
    expect(githubBugsBrowseUrl()).toBe(
      "https://github.com/gelbh/jetlag/issues?q=is%3Aissue+label%3Abug",
    );
    expect(githubIdeasBrowseUrl()).toBe(
      "https://github.com/gelbh/jetlag/issues?q=is%3Aissue+label%3Aenhancement",
    );
    expect(githubIdeaSubmitUrl()).toBe(
      "https://github.com/gelbh/jetlag/issues/new?template=idea_report.md",
    );
  });
});
