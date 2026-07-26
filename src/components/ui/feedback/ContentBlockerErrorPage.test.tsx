import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContentBlockerErrorPage } from "./ContentBlockerErrorPage";

describe("ContentBlockerErrorPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows Safari how-to steps and reloads on Try again", () => {
    const reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, host: "localhost", reload });

    render(
      <MemoryRouter>
        <ContentBlockerErrorPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /Content blocker detected/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Settings → Apps → Safari → Content Blockers/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/localhost/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Try again/i }));
    expect(reload).toHaveBeenCalledOnce();
  });
});
