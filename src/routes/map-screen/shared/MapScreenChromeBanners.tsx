import { ELIMINATION_MASK_TASK } from "@/hooks/map/useCombinedEliminationMask";
import { useLoadTask, useNamedLoadTask } from "@/hooks/progress/useLoadTask";
import { HotfixGraceChip } from "../../../components/incident/HotfixGraceChip";
import { FirestorePersistenceBanner } from "../../../components/session/banners/FirestorePersistenceBanner";
import { MeasuringRefineMapChip } from "../../../components/ui/banners/MeasuringRefineMapChip";
import type { MapRefineChip } from "./selectMapRefineChip";

const MEASURING_REFINE: MapRefineChip = {
  visible: true,
  title: "Refining measure",
  body: "Adding detail to the shaded area…",
};

/** Shared status-stack chips under MapStatusRail (seeker / hider). */
export function MapScreenChromeBanners({
  measuringLodRefining = false,
  refineChip,
}: {
  measuringLodRefining?: boolean;
  refineChip?: MapRefineChip;
} = {}) {
  const chip = refineChip ?? {
    ...MEASURING_REFINE,
    visible: measuringLodRefining,
  };
  const maskTask = useNamedLoadTask(ELIMINATION_MASK_TASK);
  const maskSnapshot = useLoadTask(maskTask);
  const showMask = !chip.visible && maskSnapshot?.status === "running";

  return (
    <>
      <FirestorePersistenceBanner />
      {showMask ? (
        <MeasuringRefineMapChip visible title="Updating shaded area" task={maskTask} />
      ) : (
        <MeasuringRefineMapChip visible={chip.visible} title={chip.title} body={chip.body} />
      )}
      <HotfixGraceChip />
    </>
  );
}
