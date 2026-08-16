import { AppUpdateMapChip } from "../../../components/ui/banners/AppUpdateMapChip";
import { MeasuringRefineMapChip } from "../../../components/ui/banners/MeasuringRefineMapChip";
import { HotfixGraceChip } from "../../../components/incident/HotfixGraceChip";
import { FirestorePersistenceBanner } from "../../../components/session/banners/FirestorePersistenceBanner";

/** Shared status-stack chips under MapStatusRail (seeker / hider). */
export function MapScreenChromeBanners({
  measuringLodRefining = false,
}: {
  measuringLodRefining?: boolean;
} = {}) {
  return (
    <>
      <FirestorePersistenceBanner />
      <MeasuringRefineMapChip visible={measuringLodRefining} />
      <AppUpdateMapChip />
      <HotfixGraceChip />
    </>
  );
}
