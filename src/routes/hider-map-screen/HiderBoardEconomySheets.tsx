import { DrawPickSheet } from "@/components/session/board/DrawPickSheet";
import { HiderHandSheet } from "@/components/session/board/HiderHandSheet";
import type { BoardEconomyState } from "@/domain/boardEconomy";
import type { GameSize } from "@/domain/session/size/gameSize";
import type { useBoardEconomy } from "@/hooks/session/useBoardEconomy";

type BoardEconomyApi = ReturnType<typeof useBoardEconomy>;

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

type HiderBoardEconomySheetsProps = {
  economy: BoardEconomyApi;
  gameSize: GameSize;
  handSheetOpen: boolean;
  onHandSheetOpenChange: (open: boolean) => void;
};

export function HiderBoardEconomySheets({
  economy,
  gameSize,
  handSheetOpen,
  onHandSheetOpenChange,
}: HiderBoardEconomySheetsProps) {
  if (!economy.state) {
    return null;
  }
  return (
    <>
      <HiderHandSheet
        open={handSheetOpen && !economy.pendingDraw}
        onClose={() => onHandSheetOpenChange(false)}
        state={economy.state}
        gameSize={gameSize}
        mustDiscard={economy.mustDiscard}
        onDiscard={(id) => void economy.discardCards([id])}
        onPlayExpand={(id, power) => void economy.runExpandHand(id, power)}
        onPlayDiscardDraw={(powerId, discardIds, drawN) =>
          void economy.runDiscardDraw(powerId, discardIds, drawN)
        }
        onPlayCurse={(id) => void economy.runPlayCurse(id)}
        onClearCurse={(id) => void economy.runClearCurse(id)}
        onPlayMove={(id) => void economy.runMove(id)}
      />
      <DrawPickSheet
        pending={economy.pendingDraw}
        gameSize={gameSize}
        onConfirm={(ids) => {
          void economy.confirmDrawPick(ids).then((stillPending) => {
            if (!stillPending) {
              onHandSheetOpenChange(true);
            }
          });
        }}
      />
    </>
  );
}
