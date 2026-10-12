import { Alert, Badge, Button, Divider, Drawer, Select } from "@mantine/core";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminRegion } from "@/components/admin/shared/AdminRegion";
import { AdminWorld } from "@/components/admin/shared/AdminWorld";
import { PunchTime } from "@/components/admin/shared/PunchTime";
import { SessionCode } from "@/components/admin/shared/SessionCode";
import { StatCell } from "@/components/admin/shared/StatCell";
import { StatusMark } from "@/components/admin/shared/StatusMark";
import { renderWithAppUi } from "@/test/renderWithAppUi";
import { type StatusTone, toneColor } from "@/theme/adminTone";

const motion = vi.hoisted(() => ({ reduced: false }));

vi.mock("@mantine/hooks", async (importActual) => ({
  ...(await importActual<typeof import("@mantine/hooks")>()),
  useReducedMotion: () => motion.reduced,
}));

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

  it("portals a Drawer into the admin world so it reads --adm-paper", async () => {
    renderWithAppUi(
      <AdminWorld>
        <Drawer opened onClose={() => {}} title="Settings">
          drawer body
        </Drawer>
      </AdminWorld>,
    );
    const body = await screen.findByText("drawer body");
    expect(body.closest("[data-admin-world]")).not.toBeNull();
    expect(body.closest(".mantine-Drawer-content")?.getAttribute("style")).toContain(
      "var(--adm-paper)",
    );
  });

  it("names a region by its title and shows the count", () => {
    renderWithAppUi(
      <AdminWorld>
        <AdminRegion title="Start list" count={3} data-testid="start-list">
          <span>rows</span>
        </AdminRegion>
      </AdminWorld>,
    );
    const region = screen.getByRole("region", { name: "Start list" });
    expect(region).toHaveAttribute("data-testid", "start-list");
    expect(screen.getByRole("heading", { name: "Start list" })).toBeVisible();
    expect(region).toHaveTextContent("3");
    expect(screen.getByText("rows")).toBeVisible();
  });

  it("swaps the region body for error, then loading, then empty", () => {
    const { rerender } = renderWithAppUi(
      <AdminWorld>
        <AdminRegion title="Course" error="Broke" loading="Loading" empty="Nothing">
          <span>rows</span>
        </AdminRegion>
      </AdminWorld>,
    );
    expect(screen.getByText("Broke")).toBeVisible();
    expect(screen.queryByText("Loading")).toBeNull();

    rerender(
      <AdminWorld>
        <AdminRegion title="Course" loading="Loading" empty="Nothing">
          <span>rows</span>
        </AdminRegion>
      </AdminWorld>,
    );
    expect(screen.getByText("Loading")).toBeVisible();
    expect(screen.queryByText("Nothing")).toBeNull();

    rerender(
      <AdminWorld>
        <AdminRegion title="Course" empty="Nothing">
          <span>rows</span>
        </AdminRegion>
      </AdminWorld>,
    );
    expect(screen.getByText("Nothing")).toBeVisible();
    expect(screen.queryByText("rows")).toBeNull();
  });

  it("punches a fresh stamp as just now and flags the flash", () => {
    const at = new Date().toISOString();
    renderWithAppUi(
      <AdminWorld>
        <PunchTime at={at} flashing />
        <PunchTime at={null} flashing={false} />
      </AdminWorld>,
    );
    const fresh = screen.getByText("just now");
    expect(fresh.tagName).toBe("TIME");
    expect(fresh).toHaveAttribute("datetime", at);
    expect(fresh).toHaveAttribute("data-flash");
    const never = screen.getByText("never");
    expect(never).not.toHaveAttribute("data-flash");
    expect(never).not.toHaveAttribute("datetime");
  });

  it("lets a non-scrolling region body fill without a scroll area", () => {
    renderWithAppUi(
      <AdminWorld>
        <AdminRegion title="Course" scroll={false}>
          <span>map</span>
        </AdminRegion>
      </AdminWorld>,
    );
    const map = screen.getByText("map");
    expect(map.closest(".mantine-ScrollArea-root")).toBeNull();
    expect(screen.getByRole("region", { name: "Course" })).toContainElement(map);
  });

  it("animates the punch flash, or holds a static fill under reduced motion", () => {
    const at = new Date().toISOString();
    try {
      motion.reduced = false;
      const { unmount } = renderWithAppUi(
        <AdminWorld>
          <PunchTime at={at} flashing />
        </AdminWorld>,
      );
      expect(screen.getByText("just now").getAttribute("style")).toContain("adm-punch");
      unmount();

      motion.reduced = true;
      renderWithAppUi(
        <AdminWorld>
          <PunchTime at={at} flashing />
        </AdminWorld>,
      );
      const style = screen.getByText("just now").getAttribute("style") ?? "";
      expect(style).toContain("var(--adm-overprint-soft)");
      expect(style).not.toContain("animation");
    } finally {
      motion.reduced = false;
    }
  });

  it("portals combobox dropdowns into the admin world", async () => {
    renderWithAppUi(
      <AdminWorld>
        <Select label="Sort" data={["Last activity", "Created"]} defaultDropdownOpened />
      </AdminWorld>,
    );
    const option = await screen.findByRole("option", { name: "Created" });
    expect(option.closest("[data-admin-world]")).not.toBeNull();
  });
});
