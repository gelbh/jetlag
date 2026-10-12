import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithAppUi } from "../../../test/renderWithAppUi";
import { AdminMonitorPane } from "./AdminMonitorPane";

vi.mock("../../../routes/AdminMapScreen", () => ({
  AdminMapScreen: () => <div data-testid="admin-map-screen-embed">map embed</div>,
}));

describe("AdminMonitorPane", () => {
  it("shows viewport-neutral idle copy without on-desktop wording", () => {
    render(<AdminMonitorPane active={false} />);

    expect(screen.getByText("Monitor pane")).toBeInTheDocument();
    expect(screen.getByText("Select a live session to watch the map here.")).toBeInTheDocument();
    expect(screen.queryByText(/on desktop/i)).not.toBeInTheDocument();
  });

  it("shows sessions unavailable idle copy when the sessions list failed", () => {
    render(<AdminMonitorPane active={false} sessionsUnavailable />);

    expect(
      screen.getByText("Sessions unavailable. Retry from the Sessions panel."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Select a live session to watch the map here."),
    ).not.toBeInTheDocument();
  });

  it("shows the error state when the monitor is unavailable", () => {
    renderWithAppUi(<AdminMonitorPane active errorMessage="Session load failed." />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("data-tone", "mispunch");
    expect(alert).toHaveTextContent("Monitor unavailable");
    expect(alert).toHaveTextContent("Session load failed.");
  });

  it("renders the embedded map when active", () => {
    render(<AdminMonitorPane active />);

    expect(screen.getByTestId("admin-monitor-fixed")).toBeInTheDocument();
    expect(screen.getByTestId("admin-map-screen-embed")).toBeInTheDocument();
  });
});
