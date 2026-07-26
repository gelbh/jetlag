import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ContentBlockerErrorPage } from "./ContentBlockerErrorPage";

describe("ContentBlockerErrorPage", () => {
  it("shows Safari how-to steps and a Try again action", () => {
    render(
      <MemoryRouter>
        <ContentBlockerErrorPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /Content blocker detected/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Try again/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Settings → Apps → Safari → Content Blockers/i),
    ).toBeInTheDocument();
  });
});
