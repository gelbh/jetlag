import type { HiderTruthReferenceMode } from "../../../domain/questions/hiderTruth/resolveHiderTruthReference";

export function questionTruthReferenceHint(endGameActive: boolean): string {
  if (endGameActive) {
    return "Hider answers are relative to each hider's frozen end-game location, not live GPS.";
  }

  return "Hider answers are relative to each hider's hiding-zone center, not live GPS.";
}

export function hiderTruthReferenceLoadingLabel(
  mode: HiderTruthReferenceMode,
): string {
  switch (mode) {
    case "endGameFreeze":
      return "Checking end-game location…";
    case "hidingZoneCenter":
      return "Checking hiding-zone center…";
    case "unavailable":
      return "Checking answer reference…";
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

export function hiderTruthReferenceLabel(mode: HiderTruthReferenceMode): string {
  switch (mode) {
    case "endGameFreeze":
      return "At your end-game location";
    case "hidingZoneCenter":
      return "At hiding-zone center";
    case "unavailable":
      return "";
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

export function hiderTruthReferenceMapTooltip(
  mode: HiderTruthReferenceMode,
): string {
  switch (mode) {
    case "endGameFreeze":
      return "Answer reference · End-game location";
    case "hidingZoneCenter":
      return "Answer reference · Hiding-zone center";
    case "unavailable":
      return "Answer reference";
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}
