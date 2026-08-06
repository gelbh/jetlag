/**
 * Ask Map HUD mode registry — cues, mode bodies, and primed-commit readiness.
 * Spec: `.cursor/specs/2026-08-05-ask-surface-kit-design.md` (rev 2026-08-05b).
 * Visual: Figma MWCG8276A8eF2UwW79GSvT node 153:1186.
 */

export type AskHudSurface =
  | "radar"
  | "matching"
  | "measuring"
  | "thermometer"
  | "tentacle"
  | "photo"
  | "hiding-zone-create"
  | "hiding-zone-move";

/** Single mode body under GlanceVerb — never stack rail + chips + walk. */
export type AskHudModeBody =
  | "chipIsland"
  | "catalogRail"
  | "walkBanner"
  | "methodChipIsland"
  | "none";

export type AskHudCommitKind = "send" | "ask" | "confirm" | "endWalk";

export type AskHudDefinition = {
  surface: AskHudSurface;
  modeBody: AskHudModeBody;
  /** Default GlanceVerb when no step-specific cue applies. */
  defaultCue: string;
  commitKind: AskHudCommitKind;
};

/**
 * Pure readiness flags from tool hooks. Domain does not inspect map/GeoJSON.
 * Callers map panel state → these booleans before querying `canCommit`.
 */
export type AskHudReadiness = {
  surface: AskHudSurface;
  /** Map center / seeker point / zone place set as required by the surface. */
  placementReady: boolean;
  /** Distance, category, photo category, method, types, etc. */
  configureReady: boolean;
  /**
   * Matching/tentacle feature resolve, thermo walk complete, etc.
   * Surfaces without a mid-step treat this as true when unused.
   */
  resolveReady: boolean;
  /**
   * Solo play needs a recorded answer before ask commit; multiplayer send
   * skips this. Hider confirm ignores it.
   */
  answerReady: boolean;
  awaitHiderAnswer: boolean;
  isSubmitting: boolean;
  viewOnly?: boolean;
};

const DEFINITIONS: Record<AskHudSurface, AskHudDefinition> = {
  radar: {
    surface: "radar",
    modeBody: "chipIsland",
    defaultCue: "TAP MAP TO SET CENTER",
    commitKind: "send",
  },
  matching: {
    surface: "matching",
    modeBody: "catalogRail",
    defaultCue: "PICK CATEGORY",
    commitKind: "send",
  },
  measuring: {
    surface: "measuring",
    modeBody: "chipIsland",
    defaultCue: "SET YOUR ANCHOR",
    commitKind: "send",
  },
  thermometer: {
    surface: "thermometer",
    modeBody: "walkBanner",
    defaultCue: "",
    commitKind: "endWalk",
  },
  tentacle: {
    surface: "tentacle",
    modeBody: "catalogRail",
    defaultCue: "PICK TYPES",
    commitKind: "send",
  },
  photo: {
    surface: "photo",
    modeBody: "chipIsland",
    defaultCue: "PICK A PHOTO ASK",
    commitKind: "send",
  },
  "hiding-zone-create": {
    surface: "hiding-zone-create",
    modeBody: "methodChipIsland",
    defaultCue: "PLACE YOUR ZONE",
    commitKind: "confirm",
  },
  "hiding-zone-move": {
    surface: "hiding-zone-move",
    modeBody: "none",
    defaultCue: "TAP NEW STATION",
    commitKind: "confirm",
  },
};

export function askHudDefinition(surface: AskHudSurface): AskHudDefinition {
  return DEFINITIONS[surface];
}

export function askHudSurfaces(): readonly AskHudSurface[] {
  return Object.keys(DEFINITIONS) as AskHudSurface[];
}

/**
 * Verb-only GlanceVerb ticker. Must never include DnPm / cost tokens.
 */
export function activeModeCue(input: {
  surface: AskHudSurface;
  placementReady: boolean;
  configureReady: boolean;
  resolveReady: boolean;
}): string {
  const def = DEFINITIONS[input.surface];
  switch (input.surface) {
    case "radar":
      return input.placementReady
        ? input.configureReady
          ? "READY TO SEND"
          : "PICK A DISTANCE"
        : def.defaultCue;
    case "matching":
      if (!input.configureReady) return "PICK CATEGORY";
      if (!input.resolveReady) return "RESOLVE ON MAP";
      return "READY TO SEND";
    case "measuring":
      if (!input.placementReady) return "SET YOUR ANCHOR";
      if (!input.resolveReady) return "SET YOUR TARGET";
      return "READY TO SEND";
    case "thermometer":
      // Walk banner owns status; empty cue keeps ticker quiet.
      return def.defaultCue;
    case "tentacle":
      if (!input.configureReady) return "PICK TYPES";
      if (!input.placementReady) return "SET CENTER ON MAP";
      if (!input.resolveReady) return "PICK LOCATIONS";
      return "READY TO SEND";
    case "photo":
      return input.configureReady ? "READY TO SEND" : def.defaultCue;
    case "hiding-zone-create":
      if (!input.configureReady) return "CHOOSE A METHOD";
      if (!input.placementReady) return "PLACE YOUR ZONE";
      return "READY TO CONFIRM";
    case "hiding-zone-move":
      return input.placementReady ? "READY TO CONFIRM" : def.defaultCue;
    default: {
      const _exhaustive: never = input.surface;
      return _exhaustive;
    }
  }
}

export function commitKind(
  surface: AskHudSurface,
  awaitHiderAnswer: boolean,
): AskHudCommitKind {
  const def = DEFINITIONS[surface];
  if (def.commitKind === "confirm" || def.commitKind === "endWalk") {
    return def.commitKind;
  }
  // Seeker tools: multiplayer → send; solo → ask (answer already recorded).
  return awaitHiderAnswer ? "send" : "ask";
}

/**
 * PrimedCommitStrip arming. Terracotta only when this returns true.
 */
export function canCommit(readiness: AskHudReadiness): boolean {
  if (readiness.viewOnly || readiness.isSubmitting) {
    return false;
  }

  const needsAnswer =
    readiness.surface !== "hiding-zone-create" &&
    readiness.surface !== "hiding-zone-move" &&
    !readiness.awaitHiderAnswer;

  if (needsAnswer && !readiness.answerReady) {
    return false;
  }

  switch (readiness.surface) {
    case "radar":
    case "photo":
      return readiness.placementReady && readiness.configureReady;
    case "matching":
    case "tentacle":
    case "measuring":
    case "thermometer":
      return (
        readiness.placementReady &&
        readiness.configureReady &&
        readiness.resolveReady
      );
    case "hiding-zone-create":
      return readiness.configureReady && readiness.placementReady;
    case "hiding-zone-move":
      return readiness.placementReady;
    default: {
      const _exhaustive: never = readiness.surface;
      return _exhaustive;
    }
  }
}

/** True when cue string must not carry cost / DnPm fragments. */
export function cueExcludesCostTokens(cue: string): boolean {
  // DnPm patterns: D2P1, D3·P1, etc. Also bare "· D" cost chips.
  return !/\bD\d+\s*[P·.]?\s*P?\d*\b/i.test(cue) && !/·\s*D\d/i.test(cue);
}

/** Short muted-strip hint derived from the current GlanceVerb. */
export function notReadyCommitHint(cue: string): string {
  switch (cue) {
    case "TAP MAP TO SET CENTER":
      return "SET CENTER FIRST";
    case "PICK A DISTANCE":
      return "PICK A DISTANCE";
    case "SET YOUR ANCHOR":
      return "SET ANCHOR FIRST";
    case "SET YOUR TARGET":
      return "SET TARGET FIRST";
    case "PICK CATEGORY":
      return "PICK CATEGORY";
    case "RESOLVE ON MAP":
      return "RESOLVE ON MAP";
    case "PICK TYPES":
      return "PICK TYPES";
    case "SET CENTER ON MAP":
      return "SET CENTER FIRST";
    case "PICK LOCATIONS":
      return "PICK LOCATIONS";
    case "PICK A PHOTO ASK":
      return "PICK A PHOTO ASK";
    case "PLACE YOUR ZONE":
      return "PLACE ZONE FIRST";
    case "CHOOSE A METHOD":
      return "CHOOSE A METHOD";
    case "TAP NEW STATION":
      return "TAP NEW STATION";
    case "READY TO SEND":
    case "READY TO CONFIRM":
      return "NOT READY";
    case "":
      return "NOT READY";
    default:
      return "NOT READY";
  }
}

/**
 * PrimedCommitStrip label — DnPm only when armed; muted strip uses a short hint.
 */
export function primedCommitLabel(input: {
  kind: AskHudCommitKind;
  costLabel: string | null | undefined;
  primed: boolean;
  cue: string;
}): string {
  const verb = (() => {
    switch (input.kind) {
      case "send":
        return "SEND";
      case "ask":
        return "ASK";
      case "confirm":
        return "CONFIRM";
      case "endWalk":
        return "END WALK";
      default: {
        const _exhaustive: never = input.kind;
        return _exhaustive;
      }
    }
  })();

  if (input.primed) {
    return input.costLabel ? `${verb} · ${input.costLabel}` : verb;
  }

  return `${verb} — ${notReadyCommitHint(input.cue)}`;
}

/** Question tools that own AskHudHost (no ToolFloatingPanel). */
export const ASK_HUD_OWNED_TOOLS = [
  "radar",
  "matching",
  "measuring",
  "tentacle",
  "thermometer",
  "photo",
] as const;

export type AskHudOwnedTool = (typeof ASK_HUD_OWNED_TOOLS)[number];

export function isAskHudOwnedTool(tool: string): tool is AskHudOwnedTool {
  return (ASK_HUD_OWNED_TOOLS as readonly string[]).includes(tool);
}

/**
 * Bottom camera padding when AskHudHost is open (cue + mode body + primed strip
 * above dock). Keeps placement geometry in the visible map band (Maps pattern).
 */
export const ASK_HUD_CAMERA_PADDING_PX = 168;
