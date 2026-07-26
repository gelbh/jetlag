import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "../../test/renderWithRouter";
import { AppErrorPage } from "./AppErrorPage";

describe("AppErrorPage", () => {
  it("omits role=alert for navigational errors", () => {
    renderWithRouter(
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
  });

  it("uses role=alert and primary action for crashes", () => {
    const onReload = vi.fn();
    renderWithRouter(
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
    renderWithRouter(
      <AppErrorPage
        title="Map error"
        message=""
        detail={<p>Detail panel</p>}
        secondaryAction={{ label: "Back home", to: "/" }}
      />,
    );
    expect(screen.getByText("Detail panel")).toBeInTheDocument();
  });
});
