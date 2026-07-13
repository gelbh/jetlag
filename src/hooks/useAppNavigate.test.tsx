import { renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useAppNavigate,
  resetAppNavigationStackForTests,
  useAppNavigationStack,
} from "./useAppNavigate";

const beginTransitionMock = vi.fn(async () => undefined);

vi.mock("../navigation/useRouteTransition", () => ({
  useRouteTransition: () => ({
    phase: "idle" as const,
    beginTransition: beginTransitionMock,
    reportScreenReady: vi.fn(),
  }),
}));

describe("useAppNavigate", () => {
  beforeEach(() => {
    beginTransitionMock.mockReset();
    resetAppNavigationStackForTests("/");
  });

  it("delegates forward navigation to the transition coordinator", () => {
    const { result } = renderHook(() => useAppNavigate(), {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    });

    act(() => {
      result.current("/create");
    });

    expect(beginTransitionMock).toHaveBeenCalledWith("/create", {
      direction: "forward",
      replace: undefined,
      state: undefined,
      preventScrollReset: undefined,
      relative: undefined,
    });
  });

  it("uses replace direction for replace navigations", () => {
    const { result } = renderHook(() => useAppNavigate(), {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    });

    act(() => {
      result.current("/", { replace: true });
    });

    expect(beginTransitionMock).toHaveBeenCalledWith("/", {
      direction: "replace",
      replace: true,
      state: undefined,
      preventScrollReset: undefined,
      relative: undefined,
    });
  });

  it("uses back direction when requested", () => {
    const { result } = renderHook(() => useAppNavigate(), {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    });

    act(() => {
      result.current("/tutorial");
      result.current("/", { direction: "back" });
    });

    expect(beginTransitionMock).toHaveBeenLastCalledWith("/", {
      direction: "back",
      replace: undefined,
      state: undefined,
      preventScrollReset: undefined,
      relative: undefined,
    });
  });

  it("exposes stack helpers for edge swipe", () => {
    const { result: navigateResult } = renderHook(() => useAppNavigate(), {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    });
    const { result: stackResult } = renderHook(() => useAppNavigationStack(), {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    });

    expect(stackResult.current.canGoBack()).toBe(false);

    act(() => {
      navigateResult.current("/create");
    });

    expect(stackResult.current.canGoBack()).toBe(true);

    act(() => {
      stackResult.current.goBack();
    });

    expect(beginTransitionMock).toHaveBeenLastCalledWith("/", {
      direction: "back",
    });
  });
});
