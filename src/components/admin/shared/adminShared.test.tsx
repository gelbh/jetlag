import { Alert } from "@mantine/core";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { AdminConfirm } from "@/components/admin/shared/AdminConfirm";
import { AdminDiagRow } from "@/components/admin/shared/AdminDiagRow";
import { AdminRegion } from "@/components/admin/shared/AdminRegion";
import { AdminSegmented } from "@/components/admin/shared/AdminSegmented";
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
  it("renders a selectable diagnostics term/value pair outside the admin world", () => {
    renderWithAppUi(
      <dl>
        <AdminDiagRow label="Bounds">51.5, -0.12</AdminDiagRow>
      </dl>,
    );
    const term = screen.getByText("Bounds");
    const value = screen.getByText("51.5, -0.12");
    expect(term.tagName).toBe("DT");
    expect(value.tagName).toBe("DD");
    expect(term.parentElement).toHaveStyle({ userSelect: "text" });
  });

  it("renders the session code in one form at every size", () => {
    renderWithAppUi(
      <AdminWorld>
        {(["sm", "md", "lg"] as const).map((size) => (
          <SessionCode key={size} code={`CODE-${size}`} size={size} />
        ))}
      </AdminWorld>,
    );
    const px = { sm: "14px", md: "16px", lg: "20px" };
    for (const size of ["sm", "md", "lg"] as const) {
      const { style } = screen.getByText(`CODE-${size}`);
      expect(style.fontFamily).toBe("ui-monospace, SFMono-Regular, Menlo, monospace");
      expect(style.fontWeight).toBe("700");
      expect(style.letterSpacing).toBe("0.08em");
      expect(style.fontSize).toBe(px[size]);
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

  it("uses jetlag halt for destructive alerts under the admin shell", () => {
    renderWithAppUi(
      <AdminWorld>
        <Alert color="halt">Halt</Alert>
        <Alert color="blue">Blue</Alert>
      </AdminWorld>,
    );
    const halt = screen.getByText("Halt").closest<HTMLElement>(".mantine-Alert-root");
    const blue = screen.getByText("Blue").closest<HTMLElement>(".mantine-Alert-root");
    expect(halt?.style.getPropertyValue("--alert-color")).toContain("halt");
    expect(blue?.style.getPropertyValue("--alert-color")).toContain("blue");
    expect(halt?.style.border).toContain("var(--alert-color)");
    expect(blue?.style.border).toContain("var(--alert-color)");
    expect(halt?.style.getPropertyValue("--alert-color")).not.toBe(
      blue?.style.getPropertyValue("--alert-color"),
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

  it("draws each status tone as a dot plus word in its player token", () => {
    const expected: Record<StatusTone, string> = {
      live: "var(--color-signal)",
      ok: "var(--color-trail)",
      info: "var(--color-brand-blue)",
      mispunch: "var(--color-status-error)",
      neutral: "var(--color-ink-muted)",
    };
    renderWithAppUi(
      <AdminWorld>
        {(Object.keys(expected) as StatusTone[]).map((tone) => (
          <StatusMark key={tone} tone={tone} label={`Mark ${tone}`} />
        ))}
      </AdminWorld>,
    );
    for (const [tone, color] of Object.entries(expected)) {
      const mark = screen.getByText(`Mark ${tone}`);
      expect(mark.style.color).toBe(color);
      expect(mark.querySelector('[aria-hidden="true"]')).not.toBeNull();
    }
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

  it("stays dark inside admin when the OS prefers light", () => {
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
    expect(region.style.borderRadius).toBe("16px");
    expect(region.style.background).toContain("var(--color-canvas)");
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
      expect(screen.getByText("just now").getAttribute("style")).toContain("admin-punch");
      unmount();

      motion.reduced = true;
      renderWithAppUi(
        <AdminWorld>
          <PunchTime at={at} flashing />
        </AdminWorld>,
      );
      const style = screen.getByText("just now").getAttribute("style") ?? "";
      expect(style).toContain("var(--color-flag-soft)");
      expect(style).not.toContain("animation");
    } finally {
      motion.reduced = false;
    }
  });

  it("restarts the punch flash when a second punch lands while flashing", () => {
    const first = new Date().toISOString();
    const second = new Date(Date.now() + 1000).toISOString();
    const { rerender } = renderWithAppUi(
      <AdminWorld>
        <PunchTime at={first} flashing />
      </AdminWorld>,
    );
    const before = screen.getByText("just now");

    rerender(
      <AdminWorld>
        <PunchTime at={second} flashing />
      </AdminWorld>,
    );

    const after = screen.getByText("just now");
    expect(after).toHaveAttribute("datetime", second);
    expect(after.getAttribute("style")).toContain("admin-punch");
    expect(after).not.toBe(before);
    expect(before.isConnected).toBe(false);
  });
});

describe("AdminSegmented", () => {
  const data = [
    { value: "live", label: "Live" },
    { value: "triage", label: "Triage", badge: 3 },
  ];

  it("renders options with a count badge and reports a change", () => {
    const onChange = vi.fn();
    renderWithAppUi(
      <AdminWorld>
        <AdminSegmented aria-label="Desk view" value="live" onChange={onChange} data={data} />
      </AdminWorld>,
    );
    expect(screen.getByRole("radiogroup", { name: "Desk view" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Live" })).toBeChecked();
    expect(screen.getByText("3")).toBeVisible();
    fireEvent.click(screen.getByRole("radio", { name: /Triage/ }));
    expect(onChange).toHaveBeenCalledWith("triage");
  });
});

describe("AdminConfirm", () => {
  function renderConfirm(overrides: Partial<ComponentProps<typeof AdminConfirm>> = {}) {
    const props = {
      opened: true,
      title: "Start the end game?",
      consequence: "Start the end game for ABCD now?",
      confirmLabel: "Start end game",
      destructive: true,
      onConfirm: vi.fn().mockResolvedValue(undefined),
      onClose: vi.fn(),
      ...overrides,
    };
    renderWithAppUi(
      <AdminWorld>
        <AdminConfirm {...props} />
      </AdminWorld>,
    );
    return props;
  }

  it("calls onConfirm then onClose when confirmed", async () => {
    const props = renderConfirm();
    expect(screen.getByText(props.consequence)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start end game" }));
    await waitFor(() => expect(props.onClose).toHaveBeenCalledTimes(1));
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
  });

  it("Cancel closes without confirming", () => {
    const props = renderConfirm();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it("keeps the modal open and shows the error when onConfirm throws", async () => {
    const props = renderConfirm({
      onConfirm: vi.fn().mockRejectedValue(new Error("Session already ended.")),
    });
    fireEvent.click(screen.getByRole("button", { name: "Start end game" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Session already ended.");
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it("renders outside the admin world without admin tokens", () => {
    renderWithAppUi(
      <AdminConfirm
        opened
        title="Reset board?"
        consequence="Clear the board for ABCD?"
        confirmLabel="Reset board"
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Reset board" })).toBeInTheDocument();
  });
});
