import { AppUpdateMapChip } from "../../../components/ui/banners/AppUpdateMapChip";
import { HotfixGraceChip } from "../../../components/incident/HotfixGraceChip";
import { FirestorePersistenceBanner } from "../../../components/session/banners/FirestorePersistenceBanner";

/** Shared status-stack chips under MapStatusRail (seeker / hider). */
export function MapScreenChromeBanners() {
  return (
    <>
      <FirestorePersistenceBanner />
      <AppUpdateMapChip />
      <HotfixGraceChip />
    </>
  );
}
