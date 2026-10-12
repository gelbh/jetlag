import { Alert, Badge, Button, Divider } from "@mantine/core";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminWorld } from "@/components/admin/shared/AdminWorld";
import { SessionCode } from "@/components/admin/shared/SessionCode";
import { StatCell } from "@/components/admin/shared/StatCell";
import { StatusMark } from "@/components/admin/shared/StatusMark";
import { renderWithAppUi } from "@/test/renderWithAppUi";
import { type StatusTone, toneColor } from "@/theme/adminTone";

describe("admin shared primitives", () => {
  it("renders the session code in one form at every size", () => {
    renderWithAppUi(
      <AdminWorld>
        {(["sm", "md", "lg"] as const).map((size) => (
          <SessionCode key={size} code={`CODE-${size}`} size={size} />
        ))}
      </AdminWorld>,
    );
    for (const size of ["sm", "md", "lg"]) {
      expect(screen.getByText(`CODE-${size}`)).toHaveStyle({ fontStretch: "125%" });
    }
  });

  it("pairs every status tone with a visible label", () => {
    const tones = Object.keys(toneColor) as StatusTone[];
    renderWithAppUi(
      <AdminWorld>
        {tones.map((tone) => (
          <StatusMark key={tone} tone={tone} label={`Tone ${tone}`} />
        ))}
      </AdminWorld>,
    );
    for (const tone of tones) {
      const label = screen.getByText(`Tone ${tone}`);
      expect(label).toBeVisible();
      expect(label.closest("[data-tone]")).toHaveAttribute("data-tone", tone);
    }
  });

  it("keeps error alerts in the mispunch tone", () => {
    renderWithAppUi(
      <AdminWorld>
        <Alert color="red">Red</Alert>
        <Alert>Default</Alert>
        <Alert data-tone="ok">Toned</Alert>
        <Alert color="blue">Blue</Alert>
      </AdminWorld>,
    );
    const alertVar = (text: string) =>
      screen
        .getByText(text)
        .closest<HTMLElement>(".mantine-Alert-root")
        ?.style.getPropertyValue("--alert-color");
    expect(alertVar("Red")).toBe("var(--adm-mispunch)");
    expect(alertVar("Default")).toBe("var(--adm-mispunch)");
    expect(alertVar("Toned")).toBe("var(--adm-ok)");
    expect(alertVar("Blue")).not.toBe("var(--adm-ink)");
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

  it("draws vertical dividers inline so the base border reset can't hide them", () => {
    renderWithAppUi(
      <AdminWorld>
        <Divider orientation="vertical" />
      </AdminWorld>,
    );
    expect(screen.getByRole("separator").style.borderInlineStart).toBe("1px solid var(--adm-rule)");
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
