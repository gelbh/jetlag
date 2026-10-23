import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithAppUi } from "../../../test/renderWithAppUi";
import { AdminMonitorPane } from "./AdminMonitorPane";

vi.mock("../../../routes/AdminMapScreen", () => ({
  AdminMapScreen: () => <div data-testid="admin-map-screen-embed">map embed</div>,
}));

describe("AdminMonitorPane", () => {
  it("teaches how to open a course when idle", () => {
    renderWithAppUi(<AdminMonitorPane active={false} />);

    expect(screen.getByText("No course open")).toBeInTheDocument();
    expect(
      screen.getByText("Open a live game from the table to watch its map here."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/on desktop/i)).not.toBeInTheDocument();
  });

  it("points at Refresh when the start list failed to load", () => {
    renderWithAppUi(<AdminMonitorPane active={false} sessionsUnavailable />);

    expect(screen.getByText("Sessions unavailable")).toBeInTheDocument();
    expect(
      screen.getByText("Games could not be loaded. Use Refresh in the status strip to try again."),
    ).toBeInTheDocument();
  });

  it("shows the error state when the monitor is unavailable", () => {
    renderWithAppUi(<AdminMonitorPane active errorMessage="Session load failed." />);

    const alert = screen.getByRole("alert");
    expect(alert.style.getPropertyValue("--alert-color")).toContain("halt");
    expect(alert).toHaveTextContent("Monitor unavailable");
    expect(alert).toHaveTextContent("Session load failed.");
  });

  it("shows progress while the join is in flight and Retry after an error", () => {
    const onRetry = vi.fn();
    const { rerender } = renderWithAppUi(<AdminMonitorPane active={false} joining />);
    expect(screen.getByRole("status", { name: "Opening the map" })).toBeInTheDocument();
    expect(screen.queryByText("No course open")).not.toBeInTheDocument();

    rerender(<AdminMonitorPane active={false} errorMessage="Nope" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders the embedded map when active", () => {
    renderWithAppUi(<AdminMonitorPane active />);

    const pane = screen.getByTestId("admin-monitor-fixed");
    // Container for the rail's cqi width; stacking context keeps the rail under the Needs you drawer.
    expect(pane.style.containerType).toBe("inline-size");
    expect(pane.style.isolation).toBe("isolate");
    expect(screen.getByTestId("admin-map-screen-embed")).toBeInTheDocument();
  });
});
