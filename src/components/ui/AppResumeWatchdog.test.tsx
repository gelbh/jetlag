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

vi.mock("../../services/core/sentry", () => ({
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
    resumeWatchdogBudgets: () => ({ graceMs: 100, budgetMs: 200 }),
  };
});

function renderWatchdog() {
  return render(
    <MemoryRouter>
      <RouteTransitionTestProvider>
        <AppResumeWatchdog />
      </RouteTransitionTestProvider>
    </MemoryRouter>,
  );
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

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

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

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

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
});
