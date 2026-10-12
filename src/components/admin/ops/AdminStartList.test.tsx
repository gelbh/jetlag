import { fireEvent, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { AdminWorld } from "@/components/admin/shared/AdminWorld";
import type { AdminSessionSummary } from "@/services/admin/adminSessions";
import { renderWithAppUi } from "@/test/renderWithAppUi";
import { AdminStartList } from "./AdminStartList";

function makeSession(overrides: Partial<AdminSessionSummary> = {}): AdminSessionSummary {
  return {
    sessionId: "s1",
    code: "ABCD",
    hostUid: "host-1",
    tier: "free",
    gameSize: "small",
    createdAt: "2026-10-11T12:00:00Z",
    memberCount: 3,
    roleCounts: { seeker: 2, hider: 1, observer: 0, admin: 0 },
    timerAccumulatedMs: 0,
    timerRunningSince: null,
    endGameStartedAt: null,
    endGameRequestedAt: null,
    hostAppVersion: null,
    hidingPeriodMinutes: null,
    regionPackId: null,
    regionPackSubregionId: null,
    transitMetroId: null,
    gameAreaLabel: "Dublin",
    phase: "seek",
    lastActivityAt: "2026-10-11T12:00:00Z",
    lastLocationAt: null,
    lastAnnotationAt: null,
    activeAnnotationCount: 0,
    mode: "multiplayer",
    isLive: true,
    liveMultiplayer: true,
    ...overrides,
  };
}

const SESSIONS = [
  makeSession(),
  makeSession({ sessionId: "s2", code: "EFGH", lastActivityAt: "2026-10-11T11:00:00Z" }),
  makeSession({
    sessionId: "s3",
    code: "IJKL",
    isLive: false,
    liveMultiplayer: false,
    lastActivityAt: "2026-10-11T10:00:00Z",
  }),
];

type Props = ComponentProps<typeof AdminStartList>;

function props(overrides: Partial<Props> = {}): Props {
  return {
    sessions: SESSIONS,
    loading: false,
    error: null,
    onRetry: vi.fn(),
    hasMore: false,
    loadingMore: false,
    onLoadMore: vi.fn(),
    observingCode: null,
    joinError: null,
    monitoredSessionId: null,
    mispunchBySession: new Map(),
    onMonitor: vi.fn(),
    ...overrides,
  };
}

function renderList(overrides: Partial<Props> = {}) {
  const view = renderWithAppUi(
    <AdminWorld>
      <AdminStartList {...props(overrides)} />
    </AdminWorld>,
  );
  return {
    ...view,
    rerenderList: (next: Partial<Props>) =>
      view.rerender(
        <AdminWorld>
          <AdminStartList {...props({ ...overrides, ...next })} />
        </AdminWorld>,
      ),
  };
}

function bodyRows() {
  const [, body] = screen.getAllByRole("rowgroup");
  return within(body).getAllByRole("row");
}

describe("AdminStartList", () => {
  it("renders one row per filtered session under the start list columns", () => {
    renderList();

    const region = screen.getByRole("region", { name: "Start list" });
    for (const name of ["Course", "Phase", "Rn", "Last", "MP"]) {
      expect(within(region).getByRole("columnheader", { name })).toBeInTheDocument();
    }
    expect(bodyRows()).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Monitor IJKL" })).toBeNull();
  });

  it("monitors from the course button and marks the monitored row", () => {
    const onMonitor = vi.fn();
    renderList({ onMonitor, monitoredSessionId: "s2" });

    fireEvent.click(screen.getByRole("button", { name: "Monitor ABCD" }));
    expect(onMonitor).toHaveBeenCalledWith(expect.objectContaining({ sessionId: "s1" }));

    const [first, second] = bodyRows();
    expect(first).not.toHaveAttribute("aria-current");
    expect(second).toHaveAttribute("aria-current", "true");
  });

  it("shows open mispunches per session and leaves zero empty", () => {
    renderList({ mispunchBySession: new Map([["s1", 2]]) });

    const [first, second] = bodyRows();
    const mpCell = (row: HTMLElement) => within(row).getAllByRole("cell")[4];
    expect(mpCell(first)).toHaveTextContent("2");
    expect(mpCell(second)).toBeEmptyDOMElement();
  });

  it("drives search and the row cursor from the keyboard", () => {
    renderList();
    const search = screen.getByRole("searchbox", { name: "Search" });

    expect(fireEvent.keyDown(document.body, { key: "/" })).toBe(false);
    expect(search).toHaveFocus();

    expect(fireEvent.keyDown(search, { key: "/" })).toBe(true);
    fireEvent.keyDown(search, { key: "j" });
    expect(search).toHaveFocus();
    expect(bodyRows().some((row) => row.hasAttribute("aria-selected"))).toBe(false);

    search.blur();
    fireEvent.keyDown(document.body, { key: "j" });
    fireEvent.keyDown(document.body, { key: "j" });
    let [first, second] = bodyRows();
    expect(second).toHaveAttribute("aria-selected", "true");
    expect(first).not.toHaveAttribute("aria-selected");
    expect(screen.getByRole("button", { name: "Monitor EFGH" })).toHaveFocus();

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "j" });
    expect(bodyRows()[1]).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "k" });
    [first, second] = bodyRows();
    expect(first).toHaveAttribute("aria-selected", "true");
    expect(second).not.toHaveAttribute("aria-selected");
    expect(screen.getByRole("button", { name: "Monitor ABCD" })).toHaveFocus();
  });

  it("drops the cursor when its session leaves the filtered list", () => {
    const { rerenderList } = renderList();
    fireEvent.keyDown(document.body, { key: "j" });
    expect(bodyRows()[0]).toHaveAttribute("aria-selected", "true");

    rerenderList({ sessions: SESSIONS.slice(1) });
    expect(bodyRows().some((row) => row.hasAttribute("aria-selected"))).toBe(false);
  });

  it("flashes the last punch when activity advances after the first render", () => {
    const { rerenderList } = renderList();
    expect(document.querySelector("[data-flash]")).toBeNull();

    rerenderList({
      sessions: [{ ...SESSIONS[0], lastActivityAt: "2026-10-11T12:05:00Z" }, ...SESSIONS.slice(1)],
    });

    const [first, second] = bodyRows();
    expect(within(first).getAllByRole("cell")[3].querySelector("[data-flash]")).not.toBeNull();
    expect(second.querySelector("[data-flash]")).toBeNull();
  });

  it("defaults to live sessions and widens when Live is unchecked", () => {
    renderList();

    const live = screen.getByRole("checkbox", { name: "Live" });
    expect(live).toBeChecked();
    fireEvent.click(live);

    expect(live).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Monitor IJKL" })).toBeInTheDocument();
  });

  it("keeps the empty state copy", () => {
    renderList({ sessions: [] });
    expect(screen.getByText("No live sessions")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "Live" }));
    expect(screen.getByText("No sessions")).toBeInTheDocument();
  });

  it("offers Load more when filters hide every loaded session", () => {
    const onLoadMore = vi.fn();
    renderList({ sessions: [SESSIONS[2]], hasMore: true, onLoadMore });

    expect(screen.getByText("No matching sessions")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Load more sessions" }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("retries a failed load from a mispunch alert", () => {
    const onRetry = vi.fn();
    renderList({ sessions: [], error: "Network down", onRetry });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("data-tone", "mispunch");
    expect(within(alert).getByText("Couldn't load sessions")).toBeInTheDocument();
    expect(within(alert).getByText("Network down")).toBeInTheDocument();
    fireEvent.click(within(alert).getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows a monitor failure as a mispunch alert above the list", () => {
    renderList({ joinError: "Join refused" });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("data-tone", "mispunch");
    expect(within(alert).getByText("Couldn't monitor")).toBeInTheDocument();
    expect(within(alert).getByText("Join refused")).toBeInTheDocument();
    expect(bodyRows()).toHaveLength(2);
  });
});
