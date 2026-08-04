import { useCallback, useEffect, useState } from "react";
import {
  applySequentialRewards,
  enforceHandLimit,
  playCurse,
  playDiscardDrawPowerUp,
  playExpandHand,
  playMoveCard,
  markCurseCleared,
  discardFromHand,
  rewardCyclesFromPendingCost,
  type BoardEconomyState,
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

  useEffect(() => {
    if (!enabled || !sessionId || !seed) {
      setState(null);
      setReady(false);
      return;
    }
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

  const applyAnswerReward = useCallback(
    async (
      toolType: PendingQuestionToolType,
      cardDraw?: number,
      cardKeep?: number,
    ) => {
      if (!state || !enabled) {
        return null;
      }
      const cycles = rewardCyclesFromPendingCost(toolType, cardDraw, cardKeep);
      if (!cycles) {
        return null;
      }
      const { state: rewarded } = applySequentialRewards(state, cycles);
      const limit = enforceHandLimit(rewarded.hand, rewarded.handLimit);
      await persist(rewarded);
      return limit;
    },
    [enabled, persist, state],
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
    mustDiscard: state
      ? enforceHandLimit(state.hand, state.handLimit).mustDiscard
      : 0,
    applyAnswerReward,
    discardCards,
    runExpandHand,
    runDiscardDraw,
    runMove,
    runPlayCurse,
    runClearCurse,
  };
}
