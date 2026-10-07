import { useCallback, useEffect, useState } from "react";
import {
  ANALYTICS_EVENTS,
  type AnalyticsEventProps,
  track,
} from "@/services/core/analytics/analytics";
import { commitWrite } from "@/services/firestore/commitWrite";
import {
  advanceUntilInteractivePick,
  type BoardEconomyState,
  beginSequentialRewardPick,
  continueSequentialRewardPick,
  discardFromHand,
  enforceHandLimit,
  markCurseCleared,
  playCurse,
  playDiscardDrawPowerUp,
  playExpandHand,
  playMoveCard,
  playQuestionPowerUp,
  type QuestionPowerUpId,
  rewardCyclesFromPendingCost,
} from "../../domain/boardEconomy";
import type { PendingQuestionToolType } from "../../domain/session/activity/sessionChat";
import {
  ensureBoardEconomyState,
  subscribeBoardEconomyState,
  writeBoardEconomyState,
} from "../../services/firestore/boardEconomy";
import { useSessionStore } from "../../state/sessionStore";

export function useBoardEconomy(params: {
  sessionId: string | null;
  enabled: boolean;
  seed: string | null;
}) {
  const { sessionId, enabled, seed } = params;
  const roundNumber = useSessionStore((state) => state.session?.roundNumber ?? 0);
  const roundSeed = seed ? `${seed}:${roundNumber}` : null;
  const [state, setState] = useState<BoardEconomyState | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled || !sessionId || !roundSeed) {
      setState(null);
      setReady(false);
      return;
    }
    let unsub: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      try {
        await ensureBoardEconomyState(sessionId, roundSeed);
        if (cancelled) {
          return;
        }
        unsub = subscribeBoardEconomyState(
          sessionId,
          (next) => {
            setState(next);
            setReady(true);
          },
          () => {
            if (!cancelled) {
              setReady(false);
            }
          },
        );
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
  }, [enabled, sessionId, roundSeed]);

  // Fire-and-track: the subscription sees the local write immediately; card
  // actions must not wait on server ack (they would hang offline).
  const persist = useCallback(
    (next: BoardEconomyState) => {
      if (!sessionId || !enabled) {
        return;
      }
      setState(next);
      commitWrite("economy.update", () => writeBoardEconomyState(sessionId, next));
    },
    [enabled, sessionId],
  );

  /** Engine plays return the same state when the card is not playable. */
  const persistPlay = useCallback(
    (
      current: BoardEconomyState,
      next: BoardEconomyState,
      card: AnalyticsEventProps["hider_card_played"]["card"],
    ) => {
      if (next === current) {
        return;
      }
      persist(next);
      track(ANALYTICS_EVENTS.hider_card_played, { card });
    },
    [persist],
  );

  const applyAnswerReward = useCallback(
    async (
      toolType: PendingQuestionToolType,
      cardDraw?: number,
      cardKeep?: number,
    ): Promise<{ mustDiscard: number; needsPick: boolean } | null> => {
      if (!enabled || !sessionId || !roundSeed) {
        return null;
      }
      const current = await ensureBoardEconomyState(sessionId, roundSeed);
      if (current.pendingPick) {
        return {
          mustDiscard: enforceHandLimit(current.hand, current.handLimit).mustDiscard,
          needsPick: true,
        };
      }
      const cycles = rewardCyclesFromPendingCost(toolType, cardDraw, cardKeep);
      if (!cycles) {
        return null;
      }
      const started = beginSequentialRewardPick(current, cycles);
      const advanced = advanceUntilInteractivePick(started);
      persist(advanced);
      return {
        mustDiscard: enforceHandLimit(advanced.hand, advanced.handLimit).mustDiscard,
        needsPick: advanced.pendingPick !== null,
      };
    },
    [enabled, persist, roundSeed, sessionId],
  );

  /** Reads the stored state: callers play this after the question write lands. */
  const playQuestionCard = useCallback(
    async (powerUpId: QuestionPowerUpId): Promise<void> => {
      if (!enabled || !sessionId || !roundSeed) {
        return;
      }
      const current = await ensureBoardEconomyState(sessionId, roundSeed);
      const card = current.hand.find(
        (entry) => entry.def.kind === "powerUp" && entry.def.id === powerUpId,
      );
      if (!card || current.pendingPick) {
        return;
      }
      persistPlay(current, playQuestionPowerUp(current, card.instanceId, powerUpId), powerUpId);
    },
    [enabled, persistPlay, roundSeed, sessionId],
  );

  const confirmDrawPick = useCallback(
    async (keepInstanceIds: readonly string[]): Promise<boolean> => {
      if (!state?.pendingPick) {
        return false;
      }
      const advanced = advanceUntilInteractivePick(
        continueSequentialRewardPick(state, keepInstanceIds),
      );
      persist(advanced);
      return advanced.pendingPick !== null;
    },
    [persist, state],
  );

  const discardCards = useCallback(
    async (instanceIds: readonly string[]) => {
      if (!state || state.pendingPick) {
        return;
      }
      persist(discardFromHand(state, instanceIds));
    },
    [persist, state],
  );

  const runExpandHand = useCallback(
    async (instanceId: string, powerUpId: "expandHand1" | "expandHand2") => {
      if (!state || state.pendingPick) {
        return;
      }
      persistPlay(state, playExpandHand(state, instanceId, powerUpId), powerUpId);
    },
    [persistPlay, state],
  );

  const runDiscardDraw = useCallback(
    async (powerUpInstanceId: string, discardInstanceIds: readonly string[], drawN: number) => {
      if (!state || state.pendingPick) {
        return;
      }
      const powerUp = state.hand.find((card) => card.instanceId === powerUpInstanceId);
      if (powerUp?.def.kind !== "powerUp") {
        return;
      }
      persistPlay(
        state,
        playDiscardDrawPowerUp(state, powerUpInstanceId, discardInstanceIds, drawN),
        powerUp.def.id,
      );
    },
    [persistPlay, state],
  );

  const runMove = useCallback(
    async (moveInstanceId: string) => {
      if (!state || state.pendingPick) {
        return;
      }
      persistPlay(state, playMoveCard(state, moveInstanceId), "move");
    },
    [persistPlay, state],
  );

  const runPlayCurse = useCallback(
    async (curseInstanceId: string) => {
      if (!state || state.pendingPick) {
        return;
      }
      persistPlay(state, playCurse(state, curseInstanceId, new Date().toISOString()), "curse");
    },
    [persistPlay, state],
  );

  const runClearCurse = useCallback(
    async (curseInstanceId: string) => {
      if (!state || state.pendingPick) {
        return;
      }
      persist(markCurseCleared(state, curseInstanceId, new Date().toISOString()));
    },
    [persist, state],
  );

  return {
    state,
    ready,
    pendingDraw: state?.pendingPick ?? null,
    mustDiscard: state ? enforceHandLimit(state.hand, state.handLimit).mustDiscard : 0,
    applyAnswerReward,
    playQuestionCard,
    confirmDrawPick,
    discardCards,
    runExpandHand,
    runDiscardDraw,
    runMove,
    runPlayCurse,
    runClearCurse,
  };
}
