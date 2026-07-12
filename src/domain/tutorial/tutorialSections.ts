import { isFirebaseConfigured } from "../../services/core/firebase";
import {
  MAP_TOOL_DOCK_ENTRIES,
  mapToolDockMenuHint,
  type DockableMapTool,
} from "../map/mapTools";

export type TutorialSectionId = "core" | "tools" | "hider" | "extras";

export interface TutorialSplitCompare {
  leftLabel: string;
  rightLabel: string;
  leftSrc: string;
  rightSrc: string;
  leftAlt: string;
  rightAlt: string;
}

export type TutorialStepKind =
  | "legacy"
  | "interactive-panel"
  | "split-panel-preview"
  | "map-preview"
  | "dock-preview";

export interface TutorialSplitPanelPreview {
  leftLabel: string;
  rightLabel: string;
  leftWizardStepId?: string;
  rightWizardStepId?: string;
  leftAwaitHiderAnswer?: boolean;
  rightAwaitHiderAnswer?: boolean;
}

export interface TutorialStep {
  id: string;
  title: string;
  body: string;
  imageSrc?: string;
  imageAlt: string;
  badge?: string;
  toolId?: DockableMapTool;
  splitCompare?: TutorialSplitCompare;
  kind?: TutorialStepKind;
  mapPreviewVariant?: "context" | "closeUp";
  splitPanelPreview?: TutorialSplitPanelPreview;
}

export interface TutorialSection {
  id: TutorialSectionId;
  title: string;
  summary: string;
  steps: TutorialStep[];
  recommendedAfter?: TutorialSectionId;
}

function toolStep(
  toolId: DockableMapTool,
  body: string,
  imageAlt: string,
): TutorialStep {
  const entry = MAP_TOOL_DOCK_ENTRIES.find((item) => item.id === toolId)!;
  const hint = mapToolDockMenuHint(entry);
  return {
    id: toolId,
    title: entry.name,
    body: hint ? `${hint} ${body}` : body,
    imageSrc: `/tutorial/tools/${toolId}.png`,
    imageAlt,
    badge: entry.cost,
    toolId,
  };
}

const CORE_SECTION: TutorialSection = {
  id: "core",
  title: "Core",
  summary: "Create a session, pick a role, and learn the map layout.",
  steps: [
    {
      id: "welcome",
      title: "Map companion",
      body:
        "Jet Lag Hide+Seek syncs questions, zones, and pins across every player in real time. The map stays center stage; tools live on the bottom dock.",
      imageAlt: "Jet Lag Hide+Seek home screen",
      imageSrc: "/tutorial/core/home.png",
    },
    {
      id: "create-join",
      title: "Create or join",
      body:
        "Hosts create a session and frame the play area. Everyone else joins with the 4-letter code from the host.",
      imageAlt: "Join session screen with code entry",
      imageSrc: "/tutorial/core/join.png",
    },
    {
      id: "roles",
      title: "Pick your role",
      body:
        "Seekers ask questions on the map and draw elimination zones. Hiders answer, set a hiding zone, and watch the search. You can switch roles between sessions.",
      imageAlt: "Seeker and hider roles in a live session",
    },
    {
      id: "host-setup",
      title: "Host setup",
      body:
        "Search for a place, confirm the play area, and pick a game size. Hiding period and zone radius follow the size unless you override them in advanced settings.",
      imageAlt: "Create session play area panel",
      imageSrc: "/tutorial/core/create-hud.png",
    },
    {
      id: "map-dock",
      title: "Map and dock",
      body:
        "The status rail shows your code and timer. Question tools sit on the bottom bar. Zone and pin live under Draw; layers, timer, and settings under Setup (or More on narrow phones).",
      imageAlt: "Map screen with bottom tool dock",
      imageSrc: "/tutorial/core/tool-dock.png",
    },
    {
      id: "more-tools",
      title: "More tools",
      body:
        "On smaller screens, overflow tools open in a sheet: Draw markup, Setup, chat, and undo history.",
      imageAlt: "More tools overflow sheet on the map",
      imageSrc: "/tutorial/core/tool-overflow.png",
    },
    {
      id: "phases",
      title: "Session phases",
      body:
        "During the hiding period, hiders place their zone and seekers wait. When it ends, seekers ask questions until someone finds the hider or time runs out. Rules lock after the timer starts.",
      imageAlt: "Session timer phases from hiding to seek",
    },
  ],
};

const TOOLS_SECTION: TutorialSection = {
  id: "tools",
  title: "Markup",
  summary: "Zone and pin tools on the dock.",
  recommendedAfter: "core",
  steps: [
    toolStep(
      "zone",
      "Draw an elimination boundary on the map. No card cost.",
      "Zone markup tool drawing on the map",
    ),
    toolStep(
      "pin",
      "Drop a note on the map for your team. No card cost.",
      "Pin markup tool on the map",
    ),
  ],
};

const HIDER_SECTION: TutorialSection = {
  id: "hider",
  title: "Hider playbook",
  summary: "Zone placement, watching seekers, and answering on time.",
  recommendedAfter: "core",
  steps: [
    {
      id: "zone-wizard",
      title: "Hiding zone",
      body:
        "During the hiding period, open the zone wizard. Pick a transit station or tap the map, then confirm your radius.",
      imageSrc: "/tutorial/hider/zone-wizard.png",
      imageAlt: "Hiding zone wizard with station search",
    },
    {
      id: "watching",
      title: "Watch the search",
      body:
        "After your zone is set, watch seeker questions eliminate areas on the map. Your live position stays private until seekers close in.",
      imageSrc: "/tutorial/hider/map.png",
      imageAlt: "Hider map with hiding zone and seeker overlays",
    },
    {
      id: "answering",
      title: "Answer questions",
      body:
        "Open chat when a question arrives. Tap your answer before the deadline. Late answers pause the hiding timer and forfeit the hider's card draw.",
      imageSrc: "/tutorial/hider/chat.png",
      imageAlt: "Hider chat with a pending question and answer buttons",
    },
    {
      id: "relocation",
      title: "Moving your zone",
      body:
        "If game rules allow a move card, you can relocate your hiding zone mid-round. Confirm the new placement before seekers resume.",
      imageAlt: "Hider zone relocation confirmation",
    },
  ],
};

function buildExtrasSection(): TutorialSection {
  const steps: TutorialStep[] = [
    {
      id: "presets",
      title: "Custom presets",
      body:
        "Save host templates on this device: play area, game size, disabled tools, and custom catalogs. Load a preset when creating a session.",
      imageSrc: "/tutorial/extras/presets.png",
      imageAlt: "Custom game presets list",
    },
  ];

  if (isFirebaseConfigured()) {
    steps.push({
      id: "premium",
      title: "Premium",
      body:
        "Premium sessions unlock live transit hosting and larger play areas. Credits and subscriptions sync to your signed-in account.",
      imageSrc: "/tutorial/extras/premium.png",
      imageAlt: "Premium sessions screen",
    });
  }

  steps.push(
    {
      id: "settings",
      title: "Advanced settings",
      body:
        "Hosts can disable tools, import custom matching areas, add POI categories, and tune answer deadlines before the timer starts.",
      imageSrc: "/tutorial/extras/settings.png",
      imageAlt: "Map settings sheet with advanced options",
    },
    {
      id: "feedback",
      title: "Feedback",
      body:
        "Found a bug or have an idea? Use the Feedback link on Home to browse or open GitHub issues.",
      imageAlt: "Feedback and suggestions entry on Home",
    },
  );

  return {
    id: "extras",
    title: "Extras",
    summary: "Presets, premium, and power-user settings.",
    recommendedAfter: "core",
    steps,
  };
}

export function getTutorialSections(): TutorialSection[] {
  return [CORE_SECTION, TOOLS_SECTION, HIDER_SECTION, buildExtrasSection()];
}

export function getTutorialSection(id: TutorialSectionId): TutorialSection {
  const section = getTutorialSections().find((item) => item.id === id);
  if (!section) {
    throw new Error(`Unknown tutorial section: ${id}`);
  }
  return section;
}

const TUTORIAL_SECTION_ORDER: TutorialSectionId[] = [
  "core",
  "tools",
  "hider",
  "extras",
];

export function nextTutorialSectionId(
  sectionId: TutorialSectionId,
): TutorialSectionId | null {
  const index = TUTORIAL_SECTION_ORDER.indexOf(sectionId);
  if (index < 0 || index >= TUTORIAL_SECTION_ORDER.length - 1) {
    return null;
  }
  return TUTORIAL_SECTION_ORDER[index + 1] ?? null;
}
