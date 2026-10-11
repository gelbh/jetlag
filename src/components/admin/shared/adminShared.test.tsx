import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminWorld } from "@/components/admin/shared/AdminWorld";
import { SessionCode } from "@/components/admin/shared/SessionCode";
import { StatCell } from "@/components/admin/shared/StatCell";
import { StatusMark } from "@/components/admin/shared/StatusMark";
import { renderWithAppUi } from "@/test/renderWithAppUi";
import { adminTheme } from "@/theme/adminTheme";

describe("admin shared primitives", () => {
  it("renders the session code in one form at every size", () => {
    renderWithAppUi(
      <AdminWorld>
        <SessionCode code="ABCD" size="lg" />
      </AdminWorld>,
    );
    expect(screen.getByText("ABCD")).toHaveStyle({ fontStretch: "125%" });
  });

  it("pairs every status tone with a visible label", () => {
    renderWithAppUi(
      <AdminWorld>
        <StatusMark tone="mispunch" label="Mispunch" />
      </AdminWorld>,
    );
    expect(screen.getByText("Mispunch")).toBeVisible();
    expect(screen.getByText("Mispunch").closest("[data-tone]")).toHaveAttribute(
      "data-tone",
      "mispunch",
    );
  });

  it("labels stat cells for assistive tech", () => {
    renderWithAppUi(
      <AdminWorld>
        <StatCell label="Runners" value={11} />
      </AdminWorld>,
    );
    expect(screen.getByLabelText("Runners")).toHaveTextContent("11");
  });

  it("marks the subtree as the admin world", () => {
    const { container } = renderWithAppUi(
      <AdminWorld>
        <span>x</span>
      </AdminWorld>,
    );
    expect(container.querySelector("[data-admin-world]")).not.toBeNull();
  });

  it("themes every admin desk component", () => {
    expect(Object.keys(adminTheme.components ?? {}).sort()).toEqual(
      [
        "Accordion",
        "ActionIcon",
        "Alert",
        "Badge",
        "Button",
        "Drawer",
        "Kbd",
        "Paper",
        "Table",
        "Tabs",
        "TextInput",
      ].sort(),
    );
  });
});
