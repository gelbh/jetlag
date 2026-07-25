import { describe, expect, it } from "vitest";
import {
  SESSION_OPS_CAPS,
  SESSION_OPS_GLOBAL_TOOL_CAP,
  SESSION_OPS_SUMMON_CAP,
  SESSION_OPS_TOOL_CAP,
  SESSION_OPS_TURN_CAP,
  canConsumeTool,
  canConsumeTurn,
  canSummon,
  consumeSummon,
  consumeTool,
  consumeTurn,
  getSessionOpsCaps,
  remainingSummons,
  remainingTools,
  remainingTurns,
  resolveSessionOpsCapTier,
  isSessionOpsPremiumTier,
} from "./sessionOpsCaps";

describe("sessionOpsCaps", () => {
  it("exposes free vs premium limits from spec defaults", () => {
    expect(SESSION_OPS_CAPS.free).toEqual({
      summonsPerSession: 1,
      agentTurnsPerSummon: 12,
      toolExecutionsPerSummon: 6,
      globalToolAttemptsPerUidPerHour: 20,
    });
    expect(SESSION_OPS_CAPS.premium).toEqual({
      summonsPerSession: 5,
      agentTurnsPerSummon: 40,
      toolExecutionsPerSummon: 25,
      globalToolAttemptsPerUidPerHour: 60,
    });
    expect(getSessionOpsCaps("free")).toEqual(SESSION_OPS_CAPS.free);
    expect(getSessionOpsCaps("premium")).toEqual(SESSION_OPS_CAPS.premium);
  });

  it("treats reporter unlimited premium or premium session as premium caps", () => {
    expect(
      isSessionOpsPremiumTier({ hasUnlimitedPremium: true, sessionTier: "free" }),
    ).toBe(true);
    expect(
      isSessionOpsPremiumTier({
        hasUnlimitedPremium: false,
        sessionTier: "premium",
      }),
    ).toBe(true);
    expect(
      isSessionOpsPremiumTier({ hasUnlimitedPremium: false, sessionTier: "free" }),
    ).toBe(false);
    expect(resolveSessionOpsCapTier({ hasUnlimitedPremium: true })).toBe(
      "premium",
    );
    expect(
      resolveSessionOpsCapTier({
        hasUnlimitedPremium: false,
        sessionTier: "premium",
      }),
    ).toBe("premium");
    expect(
      resolveSessionOpsCapTier({
        hasUnlimitedPremium: false,
        sessionTier: "free",
      }),
    ).toBe("free");
  });

  it("consumes summons / turns / tools up to the tier cap", () => {
    const free = getSessionOpsCaps("free");
    const premium = getSessionOpsCaps("premium");

    expect(canSummon({ summonCount: 0 }, free)).toBe(true);
    expect(remainingSummons({ summonCount: 0 }, free)).toBe(1);
    const afterSummon = consumeSummon({ summonCount: 0 }, free);
    expect(afterSummon.ok).toBe(true);
    if (!afterSummon.ok) return;
    expect(afterSummon.usage).toEqual({ summonCount: 1 });
    expect(canSummon(afterSummon.usage, free)).toBe(false);
    expect(consumeSummon(afterSummon.usage, free)).toEqual({
      ok: false,
      code: SESSION_OPS_SUMMON_CAP,
    });

    expect(canSummon({ summonCount: 4 }, premium)).toBe(true);
    expect(canSummon({ summonCount: 5 }, premium)).toBe(false);

    let turns = { agentTurnCount: 0, toolExecutionCount: 0 };
    for (let i = 0; i < free.agentTurnsPerSummon; i += 1) {
      const next = consumeTurn(turns, free);
      expect(next.ok).toBe(true);
      if (next.ok) turns = next.usage;
    }
    expect(canConsumeTurn(turns, free)).toBe(false);
    expect(remainingTurns(turns, free)).toBe(0);
    expect(consumeTurn(turns, free)).toEqual({
      ok: false,
      code: SESSION_OPS_TURN_CAP,
    });

    let tools = { agentTurnCount: 0, toolExecutionCount: 0 };
    for (let i = 0; i < free.toolExecutionsPerSummon; i += 1) {
      const next = consumeTool(tools, free);
      expect(next.ok).toBe(true);
      if (next.ok) tools = next.usage;
    }
    expect(canConsumeTool(tools, free)).toBe(false);
    expect(remainingTools(tools, free)).toBe(0);
    expect(consumeTool(tools, free)).toEqual({
      ok: false,
      code: SESSION_OPS_TOOL_CAP,
    });

    expect(premium.globalToolAttemptsPerUidPerHour).toBe(60);
    expect(SESSION_OPS_GLOBAL_TOOL_CAP).toBe("SESSION_OPS_GLOBAL_TOOL_CAP");
  });

  it("does not reset counters on host-confirm style re-consume", () => {
    const caps = getSessionOpsCaps("free");
    let usage = { agentTurnCount: 3, toolExecutionCount: 2 };
    // Host confirm is a gate only — approving must not zero counters.
    const afterConfirmTool = consumeTool(usage, caps);
    expect(afterConfirmTool).toEqual({
      ok: true,
      usage: { agentTurnCount: 3, toolExecutionCount: 3 },
    });
    if (afterConfirmTool.ok) usage = afterConfirmTool.usage;
    const afterConfirmTurn = consumeTurn(usage, caps);
    expect(afterConfirmTurn).toEqual({
      ok: true,
      usage: { agentTurnCount: 4, toolExecutionCount: 3 },
    });
  });
});
