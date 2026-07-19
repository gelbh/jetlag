import {
  LEADERBOARD_METRICS,
  LEADERBOARD_ROLES,
  leaderboardMetricLabel,
} from "../../domain/game/leaderboard";
import type { LeaderboardBoardSelection } from "../../domain/game/leaderboardBoardPrefs";
import { GAME_SIZE_OPTIONS, gameSizeLabel } from "../../domain/session/gameSize";
import { playerRoleLabel } from "../../domain/session/playerRole";
import { MotionSheet } from "../motion/MotionSheet";
import { SegmentControl } from "../ui/SegmentControl";
import { SheetHeader } from "../ui/SheetHeader";

interface LeaderboardBoardSheetProps {
  open: boolean;
  onClose: () => void;
  selection: LeaderboardBoardSelection;
  onChange: (selection: LeaderboardBoardSelection) => void;
}

export function LeaderboardBoardSheet({
  open,
  onClose,
  selection,
  onChange,
}: LeaderboardBoardSheetProps) {
  return (
    <MotionSheet
      open={open}
      onClose={onClose}
      ariaLabel="Choose board"
      sheetClassName="mx-auto max-w-lg"
      maxHeightClassName="max-h-[min(70dvh,520px)]"
    >
      <SheetHeader title="Choose board" onClose={onClose} />

      <div className="space-y-4">
        <SegmentControl
          value={selection.gameSize}
          options={GAME_SIZE_OPTIONS.map((value) => ({
            value,
            label: gameSizeLabel(value).label,
          }))}
          onChange={(gameSize) => onChange({ ...selection, gameSize })}
          aria-label="Game size"
        />
        <SegmentControl
          value={selection.role}
          options={LEADERBOARD_ROLES.map((value) => ({
            value,
            label: playerRoleLabel(value),
          }))}
          onChange={(role) => onChange({ ...selection, role })}
          aria-label="Player role"
        />
        <SegmentControl
          value={selection.metric}
          options={LEADERBOARD_METRICS.map((value) => ({
            value,
            label: leaderboardMetricLabel(value, selection.role),
          }))}
          onChange={(metric) => onChange({ ...selection, metric })}
          variant="chips"
          aria-label="Leaderboard metric"
        />
      </div>
    </MotionSheet>
  );
}
