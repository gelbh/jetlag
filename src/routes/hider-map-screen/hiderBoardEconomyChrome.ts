import type { BoardEconomyState } from "@/domain/boardEconomy";

export function hiderBoardEconomyDockProps(state: BoardEconomyState | null): {
  handLabel?: string;
  hasMoveCard: boolean;
} {
  if (!state) {
    return { hasMoveCard: false };
  }
  return {
    handLabel: `Hand ${state.hand.length}/${state.handLimit}`,
    hasMoveCard: state.hand.some((card) => card.def.kind === "move"),
  };
}

export function hiderBoardEconomyZoneOpts(
  enabled: boolean,
  state: BoardEconomyState | null,
  runMove: (instanceId: string) => Promise<void>,
): {
  hasMoveCard?: () => boolean;
  consumeMoveCard?: () => Promise<void>;
} {
  if (!enabled) {
    return {};
  }
  return {
    hasMoveCard: () => hiderBoardEconomyDockProps(state).hasMoveCard,
    consumeMoveCard: async () => {
      const move = state?.hand.find((card) => card.def.kind === "move");
      if (move) {
        await runMove(move.instanceId);
      }
    },
  };
}
