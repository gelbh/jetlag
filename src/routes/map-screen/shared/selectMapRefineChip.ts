export type MapRefineChip = {
  visible: boolean;
  title: string;
  body: string;
};

export type MapRefineChipCopy = MapRefineChip;

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
