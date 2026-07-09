import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Feedback } from "./Feedback";
import {
  githubBugReportUrl,
  githubBugsBrowseUrl,
  githubIdeasBrowseUrl,
  githubIdeaSubmitUrl,
} from "../domain/device/githubFeedback";
import { renderWithRouter } from "../test/renderWithRouter";

describe("Feedback", () => {
  it("links to GitHub for browsing and submitting feedback", () => {
    renderWithRouter(<Feedback />);

    expect(
      screen.getByRole("link", { name: "Browse improvement ideas on GitHub" }),
    ).toHaveAttribute("href", githubIdeasBrowseUrl());
    expect(
      screen.getByRole("link", { name: "Suggest an improvement on GitHub" }),
    ).toHaveAttribute("href", githubIdeaSubmitUrl());
    expect(
      screen.getByRole("link", { name: "Browse bug reports on GitHub" }),
    ).toHaveAttribute("href", githubBugsBrowseUrl());
    expect(
      screen.getByRole("link", { name: "Report a bug on GitHub" }),
    ).toHaveAttribute("href", githubBugReportUrl());
  });

  it("links back to home", () => {
    renderWithRouter(<Feedback />);

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
