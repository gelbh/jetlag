import { MantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { learnPageContent } from "@/domain/learn/learnContent";
import { learnPageMeta } from "@/domain/learn/learnPageMeta";
import { LEARN_ROUTE_PATHS, type LearnRoutePath } from "@/domain/seo/learnRoutePaths";
import { jetlagTheme } from "@/theme/theme";
import { RouteTransitionTestProvider } from "../../test/RouteTransitionTestProvider";
import { LearnPage } from "./LearnPage";

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
});

function renderPage(path: LearnRoutePath) {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      <MemoryRouter initialEntries={[path]}>
        <RouteTransitionTestProvider>
          <LearnPage path={path} />
        </RouteTransitionTestProvider>
      </MemoryRouter>
    </MantineProvider>,
  );
}

describe("LearnPage", () => {
  it.each(LEARN_ROUTE_PATHS)("%s renders one h1 and an h2 per section", (path) => {
    renderPage(path);
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(learnPageMeta(path).h1);
    const h2s = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(h2s).toEqual(learnPageContent(path).sections.map((section) => section.heading));
  });

  it("links tool pages back to the hub with a breadcrumb", () => {
    renderPage("/tools/radar");
    const crumbs = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(crumbs).getByRole("link", { name: "Question tools" })).toHaveAttribute(
      "href",
      "/tools",
    );
    expect(within(crumbs).getByText("Radar")).toHaveAttribute("aria-current", "page");
  });

  it("cross-links related pages and the play entry points", () => {
    renderPage("/guide");
    const keepReading = screen.getByRole("navigation", { name: "Keep reading" });
    expect(within(keepReading).getByRole("link", { name: "All question tools" })).toHaveAttribute(
      "href",
      "/tools",
    );
    expect(screen.getByRole("link", { name: "Create session" })).toHaveAttribute("href", "/create");
    expect(screen.getByRole("link", { name: "Join session" })).toHaveAttribute("href", "/join");
    expect(screen.getByText(/Not affiliated with Jet Lag: The Game/)).toBeInTheDocument();
  });

  it("links the tools hub to every tool page", () => {
    renderPage("/tools");
    const keepReading = screen.getByRole("navigation", { name: "Keep reading" });
    for (const path of LEARN_ROUTE_PATHS.filter((p) => p.startsWith("/tools/"))) {
      expect(
        within(keepReading).getByRole("link", { name: learnPageMeta(path).linkLabel }),
      ).toHaveAttribute("href", path);
    }
  });
});
