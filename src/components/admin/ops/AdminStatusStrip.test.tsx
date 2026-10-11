import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "@/test/renderWithRouter";
import { AdminStatusStrip } from "./AdminStatusStrip";

function renderStrip(overrides: { onRefresh?: () => void; onOpenSettings?: () => void } = {}) {
  return renderWithRouter(
    <AdminStatusStrip
      liveCount={3}
      runnerCount={11}
      needsYouCount={2}
      refreshing={false}
      onRefresh={overrides.onRefresh ?? vi.fn()}
      onOpenSettings={overrides.onOpenSettings ?? vi.fn()}
    />,
    { route: "/admin" },
  );
}

describe("AdminStatusStrip", () => {
  it("labels the desk as the event centre without Broadcast or Survey copy", () => {
    renderStrip();
    expect(screen.getByText("Event centre")).toBeInTheDocument();
    expect(screen.getByLabelText("Live games")).toHaveTextContent("3");
    expect(screen.getByLabelText("Runners")).toHaveTextContent("11");
    expect(screen.getByLabelText("Needs you")).toHaveTextContent("2");
    expect(screen.queryByText(/broadcast/i)).toBeNull();
  });

  it("keeps Home, event centre, incidents, and preload navigation reachable", () => {
    renderStrip();
    expect(screen.getByRole("link", { name: /^home$/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /event centre/i })).toHaveAttribute("href", "/admin");
    const needsYou = screen.getByRole("link", { name: /needs you/i });
    expect(needsYou).toHaveAttribute("href", "/admin/incidents");
    expect(needsYou).toContainElement(screen.getByLabelText("Needs you"));
    expect(screen.getByRole("link", { name: "Preload requests" })).toHaveAttribute(
      "href",
      "/admin/preload-requests",
    );
  });

  it("wires Refresh and Settings", () => {
    const onRefresh = vi.fn();
    const onOpenSettings = vi.fn();
    renderStrip({ onRefresh, onOpenSettings });

    fireEvent.click(screen.getByRole("button", { name: "Refresh live sessions" }));
    expect(onRefresh).toHaveBeenCalledTimes(1);

    const settings = screen.getByRole("button", { name: /^settings$/i });
    expect(settings).toHaveAttribute("aria-haspopup", "dialog");
    fireEvent.click(settings);
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it("shows the UTC clock in a time element", () => {
    renderStrip();
    expect(document.querySelector("time")?.textContent).toMatch(/^\d{2}:\d{2}:\d{2} UTC$/);
  });
});
