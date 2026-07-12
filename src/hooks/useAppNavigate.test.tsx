import { renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppNavigate } from "./useAppNavigate";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe("useAppNavigate", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    delete document.documentElement.dataset.navDirection;
  });

  it("sets forward nav direction and enables view transitions by default", () => {
    const { result } = renderHook(() => useAppNavigate(), {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    });

    act(() => {
      result.current("/create");
    });

    expect(document.documentElement.dataset.navDirection).toBe("forward");
    expect(navigateMock).toHaveBeenCalledWith("/create", {
      viewTransition: true,
    });
  });

  it("uses neutral direction for replace navigations", () => {
    const { result } = renderHook(() => useAppNavigate(), {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    });

    act(() => {
      result.current("/", { replace: true });
    });

    expect(document.documentElement.dataset.navDirection).toBe("neutral");
    expect(navigateMock).toHaveBeenCalledWith("/", {
      replace: true,
      viewTransition: true,
    });
  });

  it("uses back nav direction when requested", () => {
    const { result } = renderHook(() => useAppNavigate(), {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    });

    act(() => {
      result.current("/tutorial");
      result.current("/", { direction: "back" });
    });

    expect(document.documentElement.dataset.navDirection).toBe("back");
    expect(navigateMock).toHaveBeenLastCalledWith("/", {
      viewTransition: true,
    });
  });

  it("exposes stack helpers for edge swipe", () => {
    const { result } = renderHook(() => useAppNavigate(), {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    });

    expect(result.current.canGoBack()).toBe(false);

    act(() => {
      result.current("/create");
    });

    expect(result.current.canGoBack()).toBe(true);

    act(() => {
      result.current.goBack();
    });

    expect(navigateMock).toHaveBeenLastCalledWith("/", {
      viewTransition: true,
    });
    expect(document.documentElement.dataset.navDirection).toBe("back");
  });
});
