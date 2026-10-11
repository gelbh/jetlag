import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithAppUi } from "../../../test/renderWithAppUi";
import { renderWithRouter } from "../../../test/renderWithRouter";
import { AdminStatusStrip } from "./AdminStatusStrip";
import { AdminUtcClock } from "./AdminUtcClock";

function strip(
  overrides: { needsYouCount?: number; onRefresh?: () => void; onOpenSettings?: () => void } = {},
) {
  return (
    <AdminStatusStrip
      liveCount={3}
      runnerCount={11}
      needsYouCount={overrides.needsYouCount ?? 2}
      refreshing={false}
      onRefresh={overrides.onRefresh ?? vi.fn()}
      onOpenSettings={overrides.onOpenSettings ?? vi.fn()}
    />
  );
}

function renderStrip(overrides: Parameters<typeof strip>[0] = {}) {
  return renderWithRouter(strip(overrides), { route: "/admin" });
}

const HIDDEN_ON_MOBILE = ".mantine-visible-from-sm";

describe("AdminStatusStrip", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("labels the desk as the event centre without Broadcast or Survey copy", () => {
    renderStrip();
    expect(screen.getByText("Event centre")).toBeInTheDocument();
    expect(screen.getByLabelText("Live games")).toHaveTextContent("3");
    expect(screen.getByLabelText("Runners")).toHaveTextContent("11");
    expect(screen.getByLabelText("Needs you")).toHaveTextContent("2");
    expect(screen.queryByText(/broadcast/i)).toBeNull();
  });

  it("keeps Home, event centre, incidents, and preload navigation reachable", () => {
    renderStrip();
    expect(screen.getByRole("link", { name: /^home$/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Event centre" })).toHaveAttribute("href", "/admin");
    const needsYou = screen.getByRole("link", { name: "Needs you: 2 open" });
    expect(needsYou).toHaveAttribute("href", "/admin/incidents");
    expect(needsYou).toContainElement(screen.getByRole("group", { name: "Needs you" }));
    expect(screen.getByRole("group", { name: "Needs you" })).toHaveTextContent("2");
    expect(screen.getByRole("link", { name: "Preload requests" })).toHaveAttribute(
      "href",
      "/admin/preload-requests",
    );
  });

  it("keeps navigation and actions visible below sm and hides secondary detail", () => {
    renderStrip();
    for (const control of [
      screen.getByRole("link", { name: /^home$/i }),
      screen.getByRole("link", { name: "Event centre" }),
      screen.getByRole("link", { name: "Needs you: 2 open" }),
      screen.getByRole("link", { name: "Preload requests" }),
      screen.getByRole("button", { name: "Refresh live sessions" }),
      screen.getByRole("button", { name: /^settings$/i }),
    ]) {
      expect(control.closest(HIDDEN_ON_MOBILE)).toBeNull();
    }
    for (const detail of [
      screen.getByText("Event centre"),
      screen.getByLabelText("Live games"),
      screen.getByLabelText("Runners"),
      document.querySelector("time"),
    ]) {
      expect(detail?.closest(HIDDEN_ON_MOBILE)).not.toBeNull();
    }
  });

  it("announces Needs you changes in a polite live region", () => {
    const { rerender } = renderStrip({ needsYouCount: 2 });
    const live = document.querySelector('[aria-live="polite"]');
    expect(live).toHaveTextContent("2 open incidents");
    rerender(strip({ needsYouCount: 5 }));
    expect(live).toHaveTextContent("5 open incidents");
  });

  it("wires Refresh and Settings", () => {
    const onRefresh = vi.fn();
    const onOpenSettings = vi.fn();
    renderStrip({ onRefresh, onOpenSettings });

    fireEvent.click(screen.getByRole("button", { name: "Refresh live sessions" }));
    expect(onRefresh).toHaveBeenCalledTimes(1);

    const settings = screen.getByRole("button", { name: /^settings$/i });
    expect(settings).toHaveAttribute("aria-haspopup", "dialog");
    fireEvent.click(settings);
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });
});

describe("AdminUtcClock", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("ticks every second in UTC and clears its interval on unmount", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-26T12:00:00.000Z"));
    const { unmount } = renderWithAppUi(<AdminUtcClock />);
    const time = document.querySelector("time");
    expect(time).toHaveTextContent("12:00:00 UTC");
    expect(time).toHaveAttribute("dateTime", "2026-07-26T12:00:00.000Z");

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(time).toHaveTextContent("12:00:02 UTC");

    const timersBeforeUnmount = vi.getTimerCount();
    unmount();
    expect(vi.getTimerCount()).toBe(timersBeforeUnmount - 1);
  });
});
