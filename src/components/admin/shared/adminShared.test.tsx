import { Badge, Button } from "@mantine/core";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminWorld } from "@/components/admin/shared/AdminWorld";
import { SessionCode } from "@/components/admin/shared/SessionCode";
import { StatCell } from "@/components/admin/shared/StatCell";
import { StatusMark } from "@/components/admin/shared/StatusMark";
import { renderWithAppUi } from "@/test/renderWithAppUi";

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

  it("fills the live tone with ink text for contrast", () => {
    renderWithAppUi(
      <AdminWorld>
        <StatusMark tone="live" label="Live" />
      </AdminWorld>,
    );
    const mark = screen.getByText("Live").closest<HTMLElement>("[data-tone]");
    expect(mark?.style.getPropertyValue("--badge-bg")).toBe("var(--adm-live)");
    expect(mark?.style.getPropertyValue("--badge-color")).toBe("var(--adm-ink)");
  });

  it("falls back to the neutral tone for an unknown data-tone", () => {
    renderWithAppUi(
      <AdminWorld>
        <Badge data-tone="bogus">Odd</Badge>
      </AdminWorld>,
    );
    const badge = screen.getByText("Odd").closest<HTMLElement>("[data-tone]");
    expect(badge?.style.getPropertyValue("--badge-bd")).toBe("1px solid var(--adm-ink-muted)");
  });

  it("reports a blank status label in dev", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      renderWithAppUi(
        <AdminWorld>
          <StatusMark tone="ok" label=" " />
        </AdminWorld>,
      );
      expect(error).toHaveBeenCalledWith("StatusMark needs a visible label");
    } finally {
      error.mockRestore();
    }
  });

  it("stays dark when the OS prefers light", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    }));
    try {
      renderWithAppUi(
        <AdminWorld>
          <span>x</span>
        </AdminWorld>,
      );
      expect(document.documentElement).toHaveAttribute("data-mantine-color-scheme", "dark");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("fills admin buttons with overprint instead of the app primary", () => {
    renderWithAppUi(
      <AdminWorld>
        <Button>Go</Button>
      </AdminWorld>,
    );
    const button = screen.getByRole("button", { name: "Go" });
    expect(button.style.getPropertyValue("--button-bg")).toBe("var(--adm-overprint)");
    expect(button.style.getPropertyValue("--button-color")).toBe("var(--adm-overprint-ink)");
  });
});
