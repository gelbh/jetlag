import { DrawPickSheet } from "@/components/session/board/DrawPickSheet";
import { HiderHandSheet } from "@/components/session/board/HiderHandSheet";
import type { GameSize } from "@/domain/session/size/gameSize";
import type { useBoardEconomy } from "@/hooks/session/useBoardEconomy";

type BoardEconomyApi = ReturnType<typeof useBoardEconomy>;

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
          void economy
            .confirmDrawPick(ids)
            .then((stillPending) => {
              if (!stillPending) {
                onHandSheetOpenChange(true);
              }
            })
            .catch(() => {
              // Persist failed; pendingPick remains in Firestore/subscription for retry.
            });
        }}
      />
    </>
  );
}
