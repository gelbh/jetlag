import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { AdminWorld } from "@/components/admin/shared/AdminWorld";
import { useAdminMonitorFocus } from "@/domain/admin/adminMonitorFocus";
import { createTestSession } from "@/test/fixtures/sessions";
import { renderWithAppUi } from "@/test/renderWithAppUi";
import { AdminPlayerRoster } from "./AdminPlayerRoster";
import { AdminSplitBoard } from "./AdminSplitBoard";

describe("AdminSplitBoard", () => {
  it("folds the roster body and reports it on the toggle", () => {
    renderWithAppUi(
      <AdminWorld>
        <AdminSplitBoard count={4} defaultOpen>
          <p>Roster body</p>
        </AdminSplitBoard>
      </AdminWorld>,
    );
    const region = screen.getByRole("region", { name: "Player roster" });
    const toggle = within(region).getByRole("button", { name: /Runners\s*4/ });
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("starts folded when asked", () => {
    renderWithAppUi(
      <AdminWorld>
        <AdminSplitBoard count={2} defaultOpen={false}>
          <p>Roster body</p>
        </AdminSplitBoard>
      </AdminWorld>,
    );
    expect(screen.getByRole("button", { name: /Runners\s*2/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});

describe("AdminPlayerRoster", () => {
  beforeEach(() => {
    useAdminMonitorFocus.setState({ focusedPlayerUid: null, focusRequest: 0 });
  });

  function renderRoster() {
    const session = createTestSession({
      memberUids: ["seeker-uid-123456", "hider-uid-1"],
      memberRoles: { "seeker-uid-123456": "seeker", "hider-uid-1": "hider" },
    });
    renderWithAppUi(
      <AdminWorld>
        <AdminPlayerRoster
          session={session}
          locations={[
            {
              uid: "hider-uid-1",
              sessionId: session.id,
              lat: 0,
              lng: 0,
              updatedAt: new Date().toISOString(),
            } as never,
          ]}
        />
      </AdminWorld>,
    );
  }

  it("follows a runner from anywhere on the row", () => {
    renderRoster();
    const row = screen.getByRole("button", { name: "Follow hider-ui…" }).closest("tr");
    expect(row).not.toBeNull();
    fireEvent.click(within(row as HTMLElement).getByText("Hider"));
    expect(useAdminMonitorFocus.getState().focusedPlayerUid).toBe("hider-uid-1");
    expect(useAdminMonitorFocus.getState().focusRequest).toBe(1);
  });

  it("follows once per keyboard activation of the runner button", () => {
    renderRoster();
    fireEvent.click(screen.getByRole("button", { name: "Follow seeker-u…" }));
    expect(useAdminMonitorFocus.getState().focusRequest).toBe(1);
  });

  it("marks the followed runner row as selected", () => {
    renderRoster();
    fireEvent.click(screen.getByRole("button", { name: "Follow seeker-u…" }));
    const row = screen.getByRole("button", { name: "Follow seeker-u…" }).closest("tr");
    expect(row).toHaveAttribute("aria-selected", "true");
  });
});
