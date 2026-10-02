import { MantineProvider } from "@mantine/core";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { renderWithRouter } from "../test/renderWithRouter";
import { NotFound } from "./NotFound";

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  }));
});

describe("NotFound", () => {
  it("shows page-not-found copy and a home link", () => {
    renderWithRouter(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <NotFound />
      </MantineProvider>,
      { route: "/missing-path" },
    );

    expect(screen.getByRole("heading", { name: /Page not found/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Back home/i })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
