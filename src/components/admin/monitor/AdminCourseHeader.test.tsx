import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminWorld } from "@/components/admin/shared/AdminWorld";
import type { SyncStatus } from "@/domain/device/sync/sync";
import { renderWithAppUi } from "@/test/renderWithAppUi";
import { AdminCourseHeader } from "./AdminCourseHeader";

function renderHeader(syncStatus: SyncStatus = "synced", onLeave = vi.fn()) {
  renderWithAppUi(
    <AdminWorld>
      <AdminCourseHeader
        code="ABCD"
        timerState={{ accumulatedMs: 65_000, runningSince: null }}
        seekerCount={3}
        hiderCount={1}
        questionCount={5}
        syncStatus={syncStatus}
        onLeave={onLeave}
      />
    </AdminWorld>,
  );
  return onLeave;
}

describe("AdminCourseHeader", () => {
  it("shows the code and the course stat cells", () => {
    renderHeader();
    expect(screen.getByText("ABCD")).toHaveStyle({ fontStretch: "125%" });
    expect(screen.getByRole("group", { name: "Clock" })).toHaveTextContent("01:05");
    expect(screen.getByRole("group", { name: "Seekers" })).toHaveTextContent("3");
    expect(screen.getByRole("group", { name: "Hiders" })).toHaveTextContent("1");
    expect(screen.getByRole("group", { name: "Questions" })).toHaveTextContent("5");
  });

  it.each([
    ["synced", "Synced", "ok"],
    ["saving", "Saving changes", "info"],
    ["error", "Sync issue", "mispunch"],
    ["offline", "Offline", "neutral"],
    ["degraded", "Unstable connection", "info"],
    ["stale", "Showing last known state", "info"],
  ] as const)("labels sync %s as a %s mark", (status, label, tone) => {
    renderHeader(status);
    expect(screen.getByText(label).closest("[data-tone]")).toHaveAttribute("data-tone", tone);
  });

  it("leaves the monitor", () => {
    const onLeave = renderHeader();
    fireEvent.click(screen.getByRole("button", { name: "Leave admin monitor" }));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });
});
