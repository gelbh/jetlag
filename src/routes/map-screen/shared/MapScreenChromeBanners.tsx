import { AppUpdateMapChip } from "../../../components/ui/banners/AppUpdateMapChip";
import { MeasuringRefineMapChip } from "../../../components/ui/banners/MeasuringRefineMapChip";
import { HotfixGraceChip } from "../../../components/incident/HotfixGraceChip";
import { FirestorePersistenceBanner } from "../../../components/session/banners/FirestorePersistenceBanner";

export type MapRefineChip = {
  visible: boolean;
  title: string;
  body: string;
};

export type MapRefineChipCopy = MapRefineChip;

const MEASURING_REFINE: MapRefineChip = {
  visible: true,
  title: "Refining measure",
  body: "Adding detail to the shaded area…",
};

export function selectMapRefineChip(input: {
  catalogHydrating: boolean;
  measuringActiveAndRefining: boolean;
  shadeRefining: boolean;
}): MapRefineChip {
  if (input.catalogHydrating) {
    return {
      visible: true,
      title: "Loading places",
      body: "Adding remaining areas to the map…",
    };
  }
  if (input.measuringActiveAndRefining) {
    return {
      visible: true,
      title: "Refining measure",
      body: "Adding detail to the shaded area…",
    };
  }
  if (input.shadeRefining) {
    return {
      visible: true,
      title: "Refining shade",
      body: "Adding detail to the shaded area…",
    };
  }
  return {
    visible: false,
    title: "Refining measure",
    body: "Adding detail to the shaded area…",
  };
}

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

  return (
    <>
      <FirestorePersistenceBanner />
      <MeasuringRefineMapChip
        visible={chip.visible}
        title={chip.title}
        body={chip.body}
      />
      <AppUpdateMapChip />
      <HotfixGraceChip />
    </>
  );
}