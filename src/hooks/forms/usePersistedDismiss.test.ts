import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { usePersistedDismiss } from "./usePersistedDismiss";

const STORAGE_KEY = "jetlag.test.dismiss";

describe("usePersistedDismiss", () => {
  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it("starts dismissed when localStorage flag is set", () => {
    localStorage.setItem(STORAGE_KEY, "1");
    const { result } = renderHook(() => usePersistedDismiss(STORAGE_KEY));
    expect(result.current.dismissed).toBe(true);
  });

  it("persists dismiss and updates state", () => {
    const { result } = renderHook(() => usePersistedDismiss(STORAGE_KEY));

    expect(result.current.dismissed).toBe(false);

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.dismissed).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe("1");
  });
});
