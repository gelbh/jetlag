import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithAppUi } from "../../../test/renderWithAppUi";
import { SyncBlock } from "./SyncBlock";

const baseProps = {
  queuedWrites: 0,
};

describe("SyncBlock unhealthy sync text", () => {
  it.each([
    ["offline", "Offline"],
    ["error", "Sync issue"],
    ["degraded", "Unstable"],
  ] as const)("shows plain text for %s status", (syncStatus, label) => {
    renderWithAppUi(<SyncBlock {...baseProps} syncStatus={syncStatus} />);

    expect(screen.getByTestId("sync-block-mantine")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: new RegExp(label, "i") })).toBeInTheDocument();
    expect(screen.getByText(label)).toBeVisible();
  });

  it("shows queued count in offline label when writes are pending", () => {
    renderWithAppUi(<SyncBlock {...baseProps} syncStatus="offline" queuedWrites={2} />);

    expect(screen.getByText("Offline · 2 queued")).toBeVisible();
  });

  it("keeps Synced label on the status when healthy", () => {
    renderWithAppUi(<SyncBlock {...baseProps} syncStatus="synced" />);

    expect(screen.queryByText(/Offline|Sync issue|Unstable/i)).toBeNull();
    expect(screen.getByText("Synced")).toBeVisible();
    expect(screen.getByRole("status", { name: /Synced/i })).toBeInTheDocument();
  });

  it("exposes status role when unhealthy", () => {
    renderWithAppUi(<SyncBlock {...baseProps} syncStatus="offline" />);

    expect(screen.getByRole("status", { name: /Offline/i })).toBeInTheDocument();
  });
});
