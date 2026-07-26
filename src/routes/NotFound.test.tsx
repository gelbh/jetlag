import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NotFound } from "./NotFound";
import { renderWithRouter } from "../test/renderWithRouter";

describe("NotFound", () => {
  it("shows page-not-found copy and a home link", () => {
    renderWithRouter(<NotFound />, { route: "/missing-path" });

    expect(
      screen.getByRole("heading", { name: /Page not found/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Back home/i })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
