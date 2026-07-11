import {
  MAP_TOOL_DOCK_ENTRIES,
  baseQuestionCostForTool,
  mapToolDockMenuHint,
} from "../map/mapTools";
import type { TutorialSplitCompare, TutorialStep } from "./tutorialSections";
import type { TutorialProgress } from "./tutorialProgress";

export type QuestionTutorialId =
  | "matching"
  | "measuring"
  | "thermometer"
  | "radar"
  | "tentacle"
  | "photo";

export const QUESTION_TUTORIAL_ORDER: readonly QuestionTutorialId[] = [
  "matching",
  "measuring",
  "thermometer",
  "radar",
  "tentacle",
  "photo",
] as const;

export interface QuestionTutorial {
  id: QuestionTutorialId;
  title: string;
  summary: string;
  steps: TutorialStep[];
}

interface WizardPanelStep {
  id: string;
  label: string;
  body: string;
}

function questionEntry(toolId: QuestionTutorialId) {
  const entry = MAP_TOOL_DOCK_ENTRIES.find((item) => item.id === toolId);
  if (!entry) {
    throw new Error(`Missing map tool dock entry for tutorial question: ${toolId}`);
  }
  return entry;
}

function questionAsset(toolId: QuestionTutorialId, ...segments: string[]) {
  return `/tutorial/questions/${toolId}/${segments.join("/")}`;
}

function hidersCompare(
  toolId: QuestionTutorialId,
  toolName: string,
  soloStepId: string,
  hidersStepId: string,
  soloLabel: string,
  hidersLabel: string,
): TutorialSplitCompare {
  return {
    leftLabel: soloLabel,
    rightLabel: hidersLabel,
    leftSrc: questionAsset(toolId, "wizard", "solo", `${soloStepId}.png`),
    rightSrc: questionAsset(toolId, "wizard", "hiders", `${hidersStepId}.png`),
    leftAlt: `${toolName} — ${soloLabel}`,
    rightAlt: `${toolName} — ${hidersLabel}`,
  };
}

function buildWizardPanelSteps(
  toolId: QuestionTutorialId,
  toolName: string,
  cost: string,
  panels: readonly WizardPanelStep[],
): TutorialStep[] {
  return panels.map((panel) => ({
    id: `wizard-${panel.id}`,
    title: panel.label,
    body: panel.body,
    imageSrc: questionAsset(toolId, "wizard", "solo", `${panel.id}.png`),
    imageAlt: `${toolName} wizard — ${panel.label}`,
    badge: cost,
    toolId,
  }));
}

function buildQuestionTutorial(config: {
  toolId: QuestionTutorialId;
  introBody: string;
  mapBody: string;
  wizardPanels: readonly WizardPanelStep[];
  splitCompare: TutorialSplitCompare;
}): QuestionTutorial {
  const entry = questionEntry(config.toolId);
  const cost = baseQuestionCostForTool(config.toolId);
  const hint = mapToolDockMenuHint(entry);
  return {
    id: config.toolId,
    title: entry.name,
    summary: hint ?? entry.name,
    steps: [
      {
        id: "prompt",
        title: "The question",
        body: hint ? `${hint} ${config.introBody}` : config.introBody,
        imageAlt: `${entry.name} question overview`,
        badge: cost,
        toolId: config.toolId,
      },
      ...buildWizardPanelSteps(
        config.toolId,
        entry.name,
        cost,
        config.wizardPanels,
      ),
      {
        id: "session-mode",
        title: "Solo vs hiders",
        body:
          "Without hiders you can answer on the map for practice. Once a hider joins, the last wizard step sends the question to game chat instead.",
        imageAlt: `${entry.name} solo and hider session comparison`,
        badge: cost,
        toolId: config.toolId,
        splitCompare: config.splitCompare,
      },
      {
        id: "map-context",
        title: "On the map",
        body: "After you answer or send, the result draws on the full map view.",
        imageSrc: questionAsset(config.toolId, "map", "context.png"),
        imageAlt: `${entry.name} result on the full map screen`,
        badge: cost,
        toolId: config.toolId,
      },
      {
        id: "on-map",
        title: "Close up",
        body: config.mapBody,
        imageSrc: questionAsset(config.toolId, "map", "result.png"),
        imageAlt: `${entry.name} elimination result zoomed on the map`,
        badge: cost,
        toolId: config.toolId,
      },
    ],
  };
}

function buildPhotoTutorial(): QuestionTutorial {
  const entry = questionEntry("photo");
  const cost = baseQuestionCostForTool("photo");
  const hint = mapToolDockMenuHint(entry);
  return {
    id: "photo",
    title: entry.name,
    summary: hint ?? entry.name,
    steps: [
      {
        id: "prompt",
        title: "The question",
        body: hint
          ? `${hint} Unlocks once a hider joins. Send a photo category prompt; the hider uploads or says they cannot answer.`
          : "Unlocks once a hider joins. Send a photo category prompt; the hider uploads or says they cannot answer.",
        imageAlt: "Photo question overview",
        badge: cost,
        toolId: "photo",
      },
      {
        id: "session-mode",
        title: "Hiders required",
        body:
          "Photo stays disabled on the dock until at least one hider joins. After that, seekers send prompts from the panel.",
        imageAlt: "Photo tool disabled without hiders vs enabled with hiders",
        badge: cost,
        toolId: "photo",
        splitCompare: {
          leftLabel: "No hiders",
          rightLabel: "Hiders joined",
          leftSrc: questionAsset("photo", "wizard", "dock", "no-hiders.png"),
          rightSrc: questionAsset("photo", "wizard", "hiders", "panel.png"),
          leftAlt: "Question dock with Photo disabled before a hider joins",
          rightAlt: "Photo question panel after a hider joins",
        },
      },
      {
        id: "map-context",
        title: "On the map",
        body:
          "When the hider responds, the map screen shows that an answer is waiting in chat.",
        imageSrc: questionAsset("photo", "map", "context.png"),
        imageAlt: "Map screen after a photo answer arrives in chat",
        badge: cost,
        toolId: "photo",
      },
      {
        id: "on-map",
        title: "In chat",
        body:
          "Photo answers land in chat with the uploaded image. There is no elimination polygon, but seekers get visual proof.",
        imageSrc: questionAsset("photo", "map", "result.png"),
        imageAlt: "Photo answer shown in game chat on the map screen",
        badge: cost,
        toolId: "photo",
      },
    ],
  };
}

const QUESTION_TUTORIALS: readonly QuestionTutorial[] = [
  buildQuestionTutorial({
    toolId: "matching",
    introBody:
      "Pick a category, place your anchor, confirm the nearest feature, then answer yes or no.",
    mapBody:
      "A yes answer keeps the zone that shares your nearest category match. A no answer eliminates everywhere outside that boundary.",
    wizardPanels: [
      {
        id: "anchor",
        label: "Anchor",
        body: "Tap the map or use GPS to set where you are asking from.",
      },
      {
        id: "category",
        label: "Category",
        body: "Choose the category whose nearest match you want to compare.",
      },
      {
        id: "resolve",
        label: "Feature",
        body: "The app looks up your nearest match in that category before you send or answer.",
      },
    ],
    splitCompare: hidersCompare(
      "matching",
      "Matching",
      "answer",
      "resolve",
      "Solo — you answer",
      "Hiders — send to chat",
    ),
  }),
  buildQuestionTutorial({
    toolId: "measuring",
    introBody:
      "Place your anchor, pick a category or point, set a comparison target, then choose closer or further.",
    mapBody:
      "Closer or further splits the map along the distance comparison between your anchor and the hider.",
    wizardPanels: [
      {
        id: "anchor",
        label: "Anchor",
        body: "Set the seeker anchor that distances are measured from.",
      },
      {
        id: "source",
        label: "Question",
        body: "Pick what you are comparing against, such as a category or landmark type.",
      },
      {
        id: "target",
        label: "Target",
        body: "Place the second point or category anchor for the comparison.",
      },
    ],
    splitCompare: hidersCompare(
      "measuring",
      "Measuring",
      "answer",
      "target",
      "Solo — you answer",
      "Hiders — send to chat",
    ),
  }),
  buildQuestionTutorial({
    toolId: "thermometer",
    introBody:
      "Choose manual pins or a walked path, place both ends on the map, then pick hotter or colder.",
    mapBody:
      "Hotter or colder shades one side of your walked path and eliminates the other.",
    wizardPanels: [
      {
        id: "distance",
        label: "Distance",
        body: "Choose manual pins or record a walked path between two points.",
      },
      {
        id: "placement",
        label: "Anchor",
        body: "Place both ends of the path on the map.",
      },
    ],
    splitCompare: hidersCompare(
      "thermometer",
      "Thermometer",
      "answer",
      "placement",
      "Solo — you answer",
      "Hiders — send to chat",
    ),
  }),
  buildQuestionTutorial({
    toolId: "radar",
    introBody:
      "Drop a circle anchor on the map, pick a distance preset, then answer yes or no about the hider.",
    mapBody:
      "A yes keeps the circle around your anchor. A no clears everything outside it.",
    wizardPanels: [
      {
        id: "anchor",
        label: "Anchor",
        body: "Tap the map to drop the center of your radar circle.",
      },
      {
        id: "distance",
        label: "Distance",
        body: "Pick a preset radius or enter a custom distance.",
      },
    ],
    splitCompare: hidersCompare(
      "radar",
      "Radar",
      "answer",
      "distance",
      "Solo — you answer",
      "Hiders — send to chat",
    ),
  }),
  buildQuestionTutorial({
    toolId: "tentacle",
    introBody:
      "Place your anchor, pick POI categories, review nearby locations, then choose the nearest match.",
    mapBody:
      "The hider's category picks carve out tentacle reaches. Wrong branches disappear from the map.",
    wizardPanels: [
      {
        id: "anchor",
        label: "Anchor",
        body: "Set where the tentacle search starts on the map.",
      },
      {
        id: "category",
        label: "Category",
        body: "Pick the point-of-interest types to reach for within the radius.",
      },
      {
        id: "locations",
        label: "Locations",
        body: "Review nearby matches the hider can pick from or rule out.",
      },
    ],
    splitCompare: hidersCompare(
      "tentacle",
      "Tentacles",
      "answer",
      "locations",
      "Solo — you answer",
      "Hiders — send to chat",
    ),
  }),
  buildPhotoTutorial(),
];

export function getQuestionTutorials(): readonly QuestionTutorial[] {
  return QUESTION_TUTORIALS;
}

export function getQuestionTutorial(id: QuestionTutorialId): QuestionTutorial {
  const tutorial = QUESTION_TUTORIALS.find((item) => item.id === id);
  if (!tutorial) {
    throw new Error(`Unknown question tutorial: ${id}`);
  }
  return tutorial;
}

export function nextQuestionTutorialId(
  id: QuestionTutorialId,
): QuestionTutorialId | null {
  const index = QUESTION_TUTORIAL_ORDER.indexOf(id);
  if (index < 0 || index >= QUESTION_TUTORIAL_ORDER.length - 1) {
    return null;
  }
  return QUESTION_TUTORIAL_ORDER[index + 1] ?? null;
}

export function defaultQuestionProgress(): Record<QuestionTutorialId, number> {
  return {
    matching: -1,
    measuring: -1,
    thermometer: -1,
    radar: -1,
    tentacle: -1,
    photo: -1,
  };
}

export function isQuestionTutorialComplete(
  id: QuestionTutorialId,
  stepCount: number,
  progress: TutorialProgress,
): boolean {
  return progress.questions[id] >= stepCount - 1;
}

export function questionTutorialStartIndex(
  id: QuestionTutorialId,
  stepCount: number,
  progress: TutorialProgress,
): number {
  if (isQuestionTutorialComplete(id, stepCount, progress)) {
    return 0;
  }
  const last = progress.questions[id];
  if (last < 0) {
    return 0;
  }
  return Math.min(last + 1, stepCount - 1);
}

export function completedQuestionCount(progress: TutorialProgress): number {
  return QUESTION_TUTORIAL_ORDER.filter((id) => {
    const tutorial = getQuestionTutorial(id);
    return isQuestionTutorialComplete(id, tutorial.steps.length, progress);
  }).length;
}

export function isQuestionsHubComplete(progress: TutorialProgress): boolean {
  return completedQuestionCount(progress) === QUESTION_TUTORIAL_ORDER.length;
}

export function questionsHubStatusLabel(progress: TutorialProgress): string {
  if (isQuestionsHubComplete(progress)) {
    return "Complete";
  }
  const done = completedQuestionCount(progress);
  if (done > 0) {
    return `${done}/${QUESTION_TUTORIAL_ORDER.length}`;
  }
  return `${QUESTION_TUTORIAL_ORDER.length} questions`;
}

export function markQuestionStepComplete(
  id: QuestionTutorialId,
  stepIndex: number,
  progress: TutorialProgress,
): TutorialProgress {
  return {
    ...progress,
    questions: {
      ...progress.questions,
      [id]: Math.max(progress.questions[id], stepIndex),
    },
  };
}
