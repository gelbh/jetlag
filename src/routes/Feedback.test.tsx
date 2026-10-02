import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  githubBugReportUrl,
  githubBugsBrowseUrl,
  githubIdeaSubmitUrl,
  githubIdeasBrowseUrl,
} from "../domain/device/feedback/githubFeedback";
import { renderWithRouter } from "../test/renderWithRouter";
import { Feedback } from "./Feedback";

describe("Feedback", () => {
  it("links to GitHub for browsing and submitting feedback", () => {
    renderWithRouter(<Feedback />);

    expect(
      screen.getByRole("link", { name: "Browse improvement ideas on GitHub" }),
    ).toHaveAttribute("href", githubIdeasBrowseUrl());
    expect(screen.getByRole("link", { name: "Suggest an improvement on GitHub" })).toHaveAttribute(
      "href",
      githubIdeaSubmitUrl(),
    );
    expect(screen.getByRole("link", { name: "Browse bug reports on GitHub" })).toHaveAttribute(
      "href",
      githubBugsBrowseUrl(),
    );
    expect(screen.getByRole("link", { name: "Report a bug on GitHub" })).toHaveAttribute(
      "href",
      githubBugReportUrl(),
    );
  });

  it("links back to home", () => {
    renderWithRouter(<Feedback />);

    expect(screen.getByRole("link", { name: /Back/i })).toHaveAttribute("href", "/");
  });
});
