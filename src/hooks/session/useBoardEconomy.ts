import { useCallback, useEffect, useState } from "react";
import {
  beginSequentialRewardPick,
  continueSequentialRewardPick,
  enforceHandLimit,
  playCurse,
  playDiscardDrawPowerUp,
  playExpandHand,
  playMoveCard,
  markCurseCleared,
  discardFromHand,
  rewardCyclesFromPendingCost,
  type BoardEconomyState,
  type PendingDrawPick,
} from "../../domain/boardEconomy";
import type { PendingQuestionToolType } from "../../domain/session/activity/sessionChat";
import {
  ensureBoardEconomyState,
  subscribeBoardEconomyState,
  writeBoardEconomyState,
} from "../../services/firestore/boardEconomy";

export function useBoardEconomy(params: {
  sessionId: string | null;
  enabled: boolean;
  seed: string | null;
}) {
  const { sessionId, enabled, seed } = params;
  const [state, setState] = useState<BoardEconomyState | null>(null);
  const [ready, setReady] = useState(false);
  const [pendingDraw, setPendingDraw] = useState<PendingDrawPick | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- clear subscription state when disabled */
    if (!enabled || !sessionId || !seed) {
      setState(null);
      setReady(false);
      setPendingDraw(null);
      return;
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    let unsub: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      try {
        await ensureBoardEconomyState(sessionId, seed);
        if (cancelled) {
          return;
        }
        unsub = subscribeBoardEconomyState(sessionId, (next) => {
          setState(next);
          setReady(true);
        });
      } catch {
        if (!cancelled) {
          setReady(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [enabled, sessionId, seed]);

  const persist = useCallback(
    async (next: BoardEconomyState) => {
      if (!sessionId || !enabled) {
        return;
      }
      setState(next);
      await writeBoardEconomyState(sessionId, next);
    },
    [enabled, sessionId],
  );

  const autoResolveTrivialPicks = useCallback(
    async (
      start: PendingDrawPick | null,
    ): Promise<{
      pending: PendingDrawPick | null;
      state: BoardEconomyState | null;
    }> => {
      let current = start;
      let lastState: BoardEconomyState | null = start?.state ?? null;
      while (
        current &&
        (current.keep === 0 ||
          current.drawn.length === 0 ||
          current.keep >= current.drawn.length)
      ) {
        const keepIds = current.drawn
          .slice(0, current.keep)
          .map((card) => card.instanceId);
        const advanced = continueSequentialRewardPick(current, keepIds);
        lastState = advanced.state;
        if (advanced.pending === null) {
          await persist(advanced.state);
          return { pending: null, state: advanced.state };
        }
        current = advanced.pending;
        setState(advanced.state);
      }
      return { pending: current, state: current?.state ?? lastState };
    },
    [persist],
  );

  const applyAnswerReward = useCallback(
    async (
      toolType: PendingQuestionToolType,
      cardDraw?: number,
      cardKeep?: number,
    ): Promise<{ mustDiscard: number; needsPick: boolean } | null> => {
      if (!enabled || !sessionId || !seed) {
        return null;
      }
      const cycles = rewardCyclesFromPendingCost(toolType, cardDraw, cardKeep);
      if (!cycles) {
        return null;
      }
      const current = await ensureBoardEconomyState(sessionId, seed);
      const started = beginSequentialRewardPick(current, cycles);
      const resolved = await autoResolveTrivialPicks(started);
      setPendingDraw(resolved.pending);
      if (resolved.state) {
        setState(resolved.state);
      }
      const hand = resolved.state?.hand ?? current.hand;
      const handLimit = resolved.state?.handLimit ?? current.handLimit;
      return {
        mustDiscard: enforceHandLimit(hand, handLimit).mustDiscard,
        needsPick: resolved.pending !== null,
      };
    },
    [autoResolveTrivialPicks, enabled, seed, sessionId],
  );

  const confirmDrawPick = useCallback(
    async (keepInstanceIds: readonly string[]): Promise<boolean> => {
      if (!pendingDraw) {
        return false;
      }
      const advanced = continueSequentialRewardPick(
        pendingDraw,
        keepInstanceIds,
      );
      if (advanced.pending === null) {
        setPendingDraw(null);
        await persist(advanced.state);
        return false;
      }
      const resolved = await autoResolveTrivialPicks(advanced.pending);
      setPendingDraw(resolved.pending);
      if (resolved.state) {
        setState(resolved.state);
      }
      return resolved.pending !== null;
    },
    [autoResolveTrivialPicks, pendingDraw, persist],
  );

  const discardCards = useCallback(
    async (instanceIds: readonly string[]) => {
      if (!state) {
        return;
      }
      await persist(discardFromHand(state, instanceIds));
    },
    [persist, state],
  );

  const runExpandHand = useCallback(
    async (
      instanceId: string,
      powerUpId: "expandHand1" | "expandHand2",
    ) => {
      if (!state) {
        return;
      }
      await persist(playExpandHand(state, instanceId, powerUpId));
    },
    [persist, state],
  );

  const runDiscardDraw = useCallback(
    async (
      powerUpInstanceId: string,
      discardInstanceIds: readonly string[],
      drawN: number,
    ) => {
      if (!state) {
        return;
      }
      await persist(
        playDiscardDrawPowerUp(
          state,
          powerUpInstanceId,
          discardInstanceIds,
          drawN,
        ),
      );
    },
    [persist, state],
  );

  const runMove = useCallback(
    async (moveInstanceId: string) => {
      if (!state) {
        return;
      }
      await persist(playMoveCard(state, moveInstanceId));
    },
    [persist, state],
  );

  const runPlayCurse = useCallback(
    async (curseInstanceId: string) => {
      if (!state) {
        return;
      }
      await persist(
        playCurse(state, curseInstanceId, new Date().toISOString()),
      );
    },
    [persist, state],
  );

  const runClearCurse = useCallback(
    async (curseInstanceId: string) => {
      if (!state) {
        return;
      }
      await persist(
        markCurseCleared(state, curseInstanceId, new Date().toISOString()),
      );
    },
    [persist, state],
  );

  return {
    state,
    ready,
    pendingDraw,
    mustDiscard: state
      ? enforceHandLimit(state.hand, state.handLimit).mustDiscard
      : 0,
    applyAnswerReward,
    confirmDrawPick,
    discardCards,
    runExpandHand,
    runDiscardDraw,
    runMove,
    runPlayCurse,
    runClearCurse,
  };
}
