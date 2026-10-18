import { fireEvent, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  applyAdminSessionChipFilters,
  filterAdminSessions,
} from "@/domain/admin/adminSessionFilters";
import { type AdminTablePrefs, defaultPrefs } from "@/domain/admin/adminTablePrefs";
import type { AdminSessionSummary } from "@/services/admin/adminSessions";
import { renderWithAppUi } from "@/test/renderWithAppUi";
import { AdminColumnPicker } from "./AdminColumnPicker";
import { AdminDataTable } from "./AdminDataTable";
import { AdminTableToolbar } from "./AdminTableToolbar";
import { buildSessionColumns, SESSION_DEFAULT_SORT } from "./sessionColumns";
import { makeSession } from "./testSessions";

const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const columns = buildSessionColumns(new Map());
const defaults = defaultPrefs(columns, SESSION_DEFAULT_SORT);

const sessions = [
  makeSession({ sessionId: "a", code: "AAAA", lastActivityAt: ago(3 * 60_000) }),
  makeSession({ sessionId: "b", code: "BBBB", lastActivityAt: ago(5_000) }),
  makeSession({ sessionId: "c", code: "CCCC", lastActivityAt: null, isLive: false }),
  makeSession({ sessionId: "d", code: "DDDD", lastActivityAt: ago(2 * 3_600_000) }),
];

function codesInOrder() {
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[0]?.textContent);
}

function Harness({
  initial = defaults,
  rows = sessions,
  onOpen = () => {},
}: {
  initial?: AdminTablePrefs;
  rows?: AdminSessionSummary[];
  onOpen?: (row: AdminSessionSummary) => void;
}) {
  const [prefs, setPrefs] = useState(initial);
  const [liveOnly, setLiveOnly] = useState(false);
  const shown = applyAdminSessionChipFilters(
    filterAdminSessions(rows, {
      query: "",
      liveOnly,
      annotatedOnly: false,
      mode: "all",
      state: null,
      sort: "lastActivity",
    }),
    { phase: null, tier: null, hasIncident: false },
    new Map(),
  );
  return (
    <>
      <AdminTableToolbar
        tabs={<span>Sessions</span>}
        query=""
        onQueryChange={() => {}}
        liveOnly={liveOnly}
        onLiveOnlyChange={setLiveOnly}
        phase={null}
        phaseOptions={[]}
        onPhaseChange={() => {}}
        tier={null}
        tierOptions={[]}
        onTierChange={() => {}}
        hasIncident={false}
        onHasIncidentChange={() => {}}
        picker={
          <AdminColumnPicker
            columns={columns}
            prefs={prefs}
            defaults={defaults}
            onPrefsChange={setPrefs}
          />
        }
        density={prefs.density}
        onDensityChange={(density) => setPrefs({ ...prefs, density })}
      />
      <AdminDataTable
        columns={columns}
        rows={shown}
        rowKey={(row) => row.sessionId}
        prefs={prefs}
        onPrefsChange={setPrefs}
        onOpen={onOpen}
        rowMuted={(row) => !row.isLive}
      />
    </>
  );
}

const headers = () =>
  screen.getAllByRole("columnheader").map((h) => h.textContent?.replace(/\s*[↓↑]$/, ""));

describe("AdminDataTable sorting", () => {
  it("sorts Last activity by timestamp, nulls last, and cycles desc, asc, off", () => {
    renderWithAppUi(<Harness />);
    // default: lastActivity desc -> 5s ago, 3m ago, 2h ago, null last
    expect(codesInOrder()).toEqual(["BBBB", "AAAA", "DDDD", "CCCC"]);
    const header = () => screen.getByRole("button", { name: /Last activity/ });
    fireEvent.click(header());
    expect(codesInOrder()).toEqual(["DDDD", "AAAA", "BBBB", "CCCC"]);
    expect(screen.getByRole("columnheader", { name: /Last activity/ })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    fireEvent.click(header());
    expect(screen.getByRole("columnheader", { name: /Last activity/ })).not.toHaveAttribute(
      "aria-sort",
    );
    // Off keeps the incoming row order (here pre-sorted by the filter helper).
    expect(codesInOrder()).toEqual(["BBBB", "AAAA", "DDDD", "CCCC"]);
    fireEvent.click(header());
    expect(codesInOrder()).toEqual(["BBBB", "AAAA", "DDDD", "CCCC"]);
  });

  it("does not make columns without a sort value clickable", () => {
    renderWithAppUi(
      <AdminDataTable
        columns={[{ id: "x", label: "X", defaultVisible: true, render: () => "x" }]}
        rows={[1]}
        rowKey={String}
        prefs={{ visible: ["x"], sort: null, density: "compact" }}
        onPrefsChange={() => {}}
        onOpen={() => {}}
      />,
    );
    expect(screen.queryByRole("button", { name: "X" })).toBeNull();
  });
});

describe("AdminDataTable rows", () => {
  it("opens a row on click and on Enter, and marks the selected row", () => {
    const onOpen = vi.fn();
    renderWithAppUi(
      <AdminDataTable
        columns={columns}
        rows={sessions}
        rowKey={(row) => row.sessionId}
        prefs={defaults}
        onPrefsChange={() => {}}
        selectedKey="a"
        onOpen={onOpen}
      />,
    );
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows.filter((r) => r.getAttribute("aria-current") === "true")).toHaveLength(1);
    fireEvent.click(rows[0]);
    fireEvent.keyDown(rows[1], { key: "Enter" });
    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  it("applies compact row height from prefs", () => {
    renderWithAppUi(
      <AdminDataTable
        columns={columns}
        rows={sessions}
        rowKey={(row) => row.sessionId}
        prefs={{ ...defaults, density: "compact" }}
        onPrefsChange={() => {}}
        onOpen={() => {}}
      />,
    );
    const cell = within(screen.getAllByRole("row")[1]).getAllByRole("cell")[0];
    expect(cell).toHaveStyle({ height: "40px" });
  });
});

describe("Live only chip", () => {
  it("hides non-live rows when toggled", () => {
    renderWithAppUi(<Harness />);
    expect(codesInOrder()).toContain("CCCC");
    const chip = screen.getByRole("button", { name: "Live only" });
    expect(chip).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(codesInOrder()).not.toContain("CCCC");
    expect(codesInOrder()).toHaveLength(3);
  });
});

describe("column picker", () => {
  const openPicker = () => fireEvent.click(screen.getByRole("button", { name: /Columns · / }));

  it("hides and shows columns", async () => {
    renderWithAppUi(<Harness />);
    expect(headers()).toContain("Tier");
    openPicker();
    fireEvent.click(await screen.findByRole("checkbox", { name: "Tier" }));
    expect(headers()).not.toContain("Tier");
    expect(screen.getByRole("button", { name: "Columns · 8 of 19" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Questions asked" }));
    expect(headers().at(-1)).toBe("Questions asked");
  });

  it("keeps Code pinned and unhideable", async () => {
    renderWithAppUi(<Harness />);
    openPicker();
    const code = await screen.findByRole("checkbox", { name: "Code" });
    expect(code).toBeDisabled();
    expect(code).toBeChecked();
    expect(screen.getByText("pinned")).toBeInTheDocument();
    expect(headers()[0]).toBe("Code");
  });

  it("reorders with Alt+Arrow and with drag and drop, never above Code", async () => {
    renderWithAppUi(<Harness />);
    openPicker();
    await screen.findByRole("checkbox", { name: "Tier" });
    const row = (id: string) => document.querySelector(`[data-column-id="${id}"]`) as HTMLElement;
    fireEvent.keyDown(row("phase"), { key: "ArrowUp", altKey: true });
    expect(headers().slice(0, 3)).toEqual(["Code", "Phase", "Area"]);
    fireEvent.keyDown(row("phase"), { key: "ArrowUp", altKey: true });
    expect(headers()[0]).toBe("Code");
    fireEvent.keyDown(row("area"), { key: "ArrowDown", altKey: true });
    expect(headers().slice(0, 4)).toEqual(["Code", "Phase", "Players (S / H)", "Area"]);
    fireEvent.dragStart(row("tier"));
    fireEvent.drop(row("phase"));
    expect(headers().slice(0, 3)).toEqual(["Code", "Tier", "Phase"]);
    fireEvent.dragStart(row("tier"));
    fireEvent.drop(row("code"));
    expect(headers()[0]).toBe("Code");
  });

  it("filters the list with the find field and resets to defaults", async () => {
    renderWithAppUi(<Harness />);
    openPicker();
    fireEvent.click(await screen.findByRole("checkbox", { name: "Tier" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Area" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Find a column" }), {
      target: { value: "annot" },
    });
    expect(
      screen.getAllByRole("checkbox").map((c) => c.getAttribute("aria-label") ?? ""),
    ).toBeDefined();
    expect(screen.queryByRole("checkbox", { name: "Code" })).toBeNull();
    expect(screen.getByRole("checkbox", { name: "Last annotation" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Find a column" }), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset to defaults" }));
    expect(headers()).toEqual(
      defaults.visible.map((id) => columns.find((c) => c.id === id)?.label),
    );
  });

  it("Done closes the picker", async () => {
    renderWithAppUi(<Harness />);
    openPicker();
    fireEvent.click(await screen.findByRole("button", { name: "Done" }));
    await vi.waitFor(() => expect(screen.queryByRole("button", { name: "Done" })).toBeNull());
  });
});
