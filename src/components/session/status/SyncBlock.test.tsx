import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SyncBlock } from "./SyncBlock";

const baseProps = {
  queuedWrites: 0,
  menuOpen: false,
  onMenuOpenChange: vi.fn(),
};

describe("SyncBlock unhealthy sync text", () => {
  it.each([
    ["offline", "Offline"],
    ["error", "Sync issue"],
    ["degraded", "Unstable"],
  ] as const)("shows plain text for %s status", (syncStatus, label) => {
    render(<SyncBlock {...baseProps} syncStatus={syncStatus} />);

    expect(
      screen.getByRole("button", { name: new RegExp(label, "i") }),
    ).toBeInTheDocument();
    expect(screen.getByText(label)).toBeVisible();
  });

  it("shows queued count in offline label when writes are pending", () => {
    render(
      <SyncBlock {...baseProps} syncStatus="offline" queuedWrites={2} />,
    );

    expect(screen.getByText("Offline · 2 queued")).toBeVisible();
  });

  it("keeps Synced label on the control when healthy", () => {
    render(<SyncBlock {...baseProps} syncStatus="synced" />);

    expect(screen.queryByText(/Offline|Sync issue|Unstable/i)).toBeNull();
    expect(screen.getByText("Synced")).toBeVisible();
    expect(
      screen.getByRole("button", { name: /Synced\. Show sync details/i }),
    ).toHaveClass("jl-sync-map-indicator__btn--labeled");
  });

  it("uses labeled hit target class when unhealthy", () => {
    render(<SyncBlock {...baseProps} syncStatus="offline" />);

    expect(
      screen.getByRole("button", { name: /Offline/i }),
    ).toHaveClass("jl-sync-map-indicator__btn--labeled");
  });
});
