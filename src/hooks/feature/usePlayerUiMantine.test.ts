import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  PLAYER_UI_MANTINE_STORAGE_KEY,
  isPlayerUiMantineEnabled,
  setPlayerUiMantineEnabled,
  usePlayerUiMantine,
} from "./usePlayerUiMantine";

describe("usePlayerUiMantine", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to disabled", () => {
    expect(isPlayerUiMantineEnabled()).toBe(false);
  });

  it("reads enabled from localStorage", () => {
    localStorage.setItem(PLAYER_UI_MANTINE_STORAGE_KEY, "1");
    expect(isPlayerUiMantineEnabled()).toBe(true);
  });

  it("setPlayerUiMantineEnabled persists and notifies the hook", () => {
    const { result } = renderHook(() => usePlayerUiMantine());
    expect(result.current).toBe(false);
    act(() => {
      setPlayerUiMantineEnabled(true);
    });
    expect(localStorage.getItem(PLAYER_UI_MANTINE_STORAGE_KEY)).toBe("1");
    expect(result.current).toBe(true);
  });
});
