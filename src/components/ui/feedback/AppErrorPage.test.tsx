import type { ReactElement } from "react";
import { screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { renderWithRouter } from "@/test/renderWithRouter";
import { AppErrorPage } from "./AppErrorPage";

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

function renderPage(ui: ReactElement) {
  return renderWithRouter(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      {ui}
    </MantineProvider>,
  );
}

describe("AppErrorPage", () => {
  it("omits role=alert for navigational errors", () => {
    const { container } = renderPage(
      <AppErrorPage
        title="Page not found"
        message="That URL is not a route."
        secondaryAction={{ label: "Back home", to: "/" }}
      />,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /page not found/i }),
    ).toBeInTheDocument();
    expect(container.querySelector(".mantine-Title-root")).toBeTruthy();
    expect(container.querySelector(".mantine-Button-root")).toBeTruthy();
  });

  it("uses role=alert and primary action for crashes", () => {
    const onReload = vi.fn();
    renderPage(
      <AppErrorPage
        title="Something went wrong"
        message="Try reloading."
        assertive
        primaryAction={{ label: "Reload", onClick: onReload }}
        secondaryAction={{ label: "Back home", to: "/" }}
      />,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    screen.getByRole("button", { name: /reload/i }).click();
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it("renders a detail slot without requiring a message", () => {
    renderPage(
      <AppErrorPage
        title="Map error"
        message=""
        detail={<p>Detail panel</p>}
        secondaryAction={{ label: "Back home", to: "/" }}
      />,
    );
    expect(screen.getByText("Detail panel")).toBeInTheDocument();
  });

  it("does not shout the title in all-caps field-book style", () => {
    const { container } = renderPage(
      <AppErrorPage title="Page not found" message="Missing route." />,
    );
    const title = container.querySelector(".mantine-Title-root");
    expect(title?.className ?? "").not.toMatch(/uppercase/);
  });
});
