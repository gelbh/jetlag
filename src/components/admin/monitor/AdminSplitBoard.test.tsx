import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminWorld } from "@/components/admin/shared/AdminWorld";
import { renderWithAppUi } from "@/test/renderWithAppUi";
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
