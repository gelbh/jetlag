import { act, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AppResumeWatchdog,
  RESUME_WATCHDOG_RELOAD_KEY,
} from "./AppResumeWatchdog";
import { RouteTransitionTestProvider } from "../../test/RouteTransitionTestProvider";

const resetStuckTransition = vi.fn();
const captureResumeShellUnresponsiveMock = vi.fn();
const addAppResumeBreadcrumbMock = vi.fn();

vi.mock("../../navigation/useRouteTransition", () => ({
  useRouteTransition: () => ({
    phase: "idle" as const,
    loadingReason: null,
    loadingProgress: null,
    beginTransition: vi.fn(),
    reportScreenReady: vi.fn(),
    resetStuckTransition,
  }),
}));

vi.mock("../../services/core/analytics/sentry", () => ({
  addAppResumeBreadcrumb: (...args: unknown[]) =>
    addAppResumeBreadcrumbMock(...args),
  captureResumeShellUnresponsive: (...args: unknown[]) =>
    captureResumeShellUnresponsiveMock(...args),
}));

vi.mock("../../domain/device/resumeShell", async () => {
  const actual = await vi.importActual<
    typeof import("../../domain/device/resumeShell")
  >("../../domain/device/resumeShell");
  return {
    ...actual,
    resumeWatchdogBudgets: (pathname: string = "") => {
      if (pathname === "/admin" || pathname.startsWith("/admin/")) {
        return { graceMs: 50, budgetMs: 400 };
      }
      return { graceMs: 100, budgetMs: 200 };
    },
  };
});

function renderWatchdog(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <RouteTransitionTestProvider>
        <AppResumeWatchdog />
      </RouteTransitionTestProvider>
    </MemoryRouter>,
  );
}

function triggerVisibleResume() {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => "visible",
  });
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

describe("AppResumeWatchdog", () => {
  const reload = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    document.getElementById("root")?.remove();
    vi.stubGlobal("location", { ...window.location, reload });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.getElementById("root")?.remove();
    sessionStorage.clear();
  });

  it("does not reload when #root has interactive controls", async () => {
    const root = document.createElement("div");
    root.id = "root";
    root.appendChild(document.createElement("button"));
    document.body.appendChild(root);

    renderWatchdog();
    triggerVisibleResume();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });

    expect(reload).not.toHaveBeenCalled();
    expect(captureResumeShellUnresponsiveMock).not.toHaveBeenCalled();
    expect(resetStuckTransition).toHaveBeenCalled();
    expect(addAppResumeBreadcrumbMock).toHaveBeenCalled();
  });

  it("reloads once when #root stays empty after the budget", async () => {
    const root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);

    renderWatchdog();
    triggerVisibleResume();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });

    expect(reload).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(RESUME_WATCHDOG_RELOAD_KEY)).toBe("1");
    expect(captureResumeShellUnresponsiveMock).toHaveBeenCalledTimes(1);

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("on /admin, delayed data-resume-ready succeeds within admin budget", async () => {
    const root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);

    renderWatchdog("/admin");
    triggerVisibleResume();

    // Past player mock budget (grace 100 + budget 200) but inside admin budget (50 + 400).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(captureResumeShellUnresponsiveMock).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();

    const desk = document.createElement("div");
    desk.setAttribute("data-resume-ready", "true");
    root.appendChild(desk);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    expect(captureResumeShellUnresponsiveMock).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it("tags admin_route when /admin stays unresponsive", async () => {
    const root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);

    renderWatchdog("/admin");
    triggerVisibleResume();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(reload).toHaveBeenCalledTimes(1);
    expect(captureResumeShellUnresponsiveMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: "/admin",
        adminRoute: true,
      }),
    );
  });
});
