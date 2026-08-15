import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestRemoteSession } from "../../test/fixtures/sessions";
import { resetAllStores } from "../../test/helpers/storeReset";
import { useSessionStore } from "../../state/sessionStore";
import { useBoardEconomy } from "./useBoardEconomy";

const ensureBoardEconomyState = vi.hoisted(() =>
  vi.fn(async () => ({
    hand: [],
    handLimit: 5,
    deck: [],
    discard: [],
    pendingPick: null,
  })),
);
const subscribeBoardEconomyState = vi.hoisted(() =>
  vi.fn((_sessionId: string, onChange: (state: unknown) => void) => {
    onChange({
      hand: [],
      handLimit: 5,
      deck: [],
      discard: [],
      pendingPick: null,
    });
    return vi.fn();
  }),
);
const writeBoardEconomyState = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("../../services/firestore/boardEconomy", () => ({
  ensureBoardEconomyState,
  subscribeBoardEconomyState,
  writeBoardEconomyState,
}));

describe("useBoardEconomy", () => {
  beforeEach(() => {
    resetAllStores();
    vi.clearAllMocks();
    useSessionStore.getState().setSession(
      createTestRemoteSession({ roundNumber: 2 }),
    );
  });

  it("reseeds board economy with seed:roundNumber", async () => {
    renderHook(() =>
      useBoardEconomy({
        sessionId: "remote-session-1",
        enabled: true,
        seed: "board-seed",
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(ensureBoardEconomyState).toHaveBeenCalledWith(
      "remote-session-1",
      "board-seed:2",
    );
  });
});
