import {
  MAP_TOOL_DOCK_ENTRIES,
  baseQuestionCostForTool,
  mapToolDockMenuHint,
} from "../map/mapTools";
import type { TutorialSplitPanelPreview, TutorialStep } from "./tutorialSections";
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

function questionEntry(toolId: QuestionTutorialId) {
  const entry = MAP_TOOL_DOCK_ENTRIES.find((item) => item.id === toolId);
  if (!entry) {
    throw new Error(`Missing map tool dock entry for tutorial question: ${toolId}`);
  }
  return entry;
}

function buildLiveQuestionTutorial(config: {
  toolId: QuestionTutorialId;
  introBody: string;
  mapBody: string;
  splitPanelPreview: TutorialSplitPanelPreview;
  includeMapSteps?: boolean;
}): QuestionTutorial {
  const { toolId, introBody, mapBody, splitPanelPreview } = config;
  const includeMapSteps = config.includeMapSteps ?? true;
  const entry = questionEntry(toolId);
  const cost = baseQuestionCostForTool(toolId);
  const hint = mapToolDockMenuHint(entry);

  const steps: TutorialStep[] = [
    {
      id: "interactive",
      kind: "interactive-panel",
      title: "Try the wizard",
      body: hint ? `${hint} ${introBody}` : introBody,
      imageAlt: `${entry.name} interactive wizard`,
      badge: cost,
      toolId,
    },
    {
      id: "session-mode",
      kind: "split-panel-preview",
      title: toolId === "photo" ? "Hiders required" : "Solo vs hiders",
      body:
        toolId === "photo"
          ? "Photo stays disabled on the dock until at least one hider joins. After that, seekers send prompts from the panel."
          : "Without hiders you can answer on the map for practice. Once a hider joins, the last wizard step sends the question to game chat instead.",
      imageAlt: `${entry.name} solo and hider session comparison`,
      badge: cost,
      toolId,
      splitPanelPreview,
    },
  ];

  if (includeMapSteps) {
    steps.push(
      {
        id: "map-context",
        kind: "map-preview",
        mapPreviewVariant: "context",
        title: "On the map",
        body: "After you answer or send, the result draws on the full map view.",
        imageAlt: `${entry.name} result on the full map screen`,
        badge: cost,
        toolId,
      },
      {
        id: "on-map",
        kind: "map-preview",
        mapPreviewVariant: "closeUp",
        title: "Close up",
        body: mapBody,
        imageAlt: `${entry.name} elimination result zoomed on the map`,
        badge: cost,
        toolId,
      },
    );
  }

  return {
    id: toolId,
    title: entry.name,
    summary: hint ?? entry.name,
    steps,
  };
}

function buildLivePhotoTutorial(): QuestionTutorial {
  const toolId = "photo";
  const entry = questionEntry(toolId);
  const cost = baseQuestionCostForTool(toolId);
  const hint = mapToolDockMenuHint(entry);
  const introBody =
    "Unlocks once a hider joins. Send a photo category prompt; the hider uploads or says they cannot answer.";

  return {
    id: toolId,
    title: entry.name,
    summary: hint ?? entry.name,
    steps: [
      {
        id: "interactive",
        kind: "interactive-panel",
        title: "Try the panel",
        body: hint ? `${hint} ${introBody}` : introBody,
        imageAlt: "Photo question overview",
        badge: cost,
        toolId,
      },
      {
        id: "session-mode",
        kind: "split-panel-preview",
        title: "Hiders required",
        body:
          "Photo stays disabled on the dock until at least one hider joins. After that, seekers send prompts from the panel.",
        imageAlt: "Photo tool disabled without hiders vs enabled with hiders",
        badge: cost,
        toolId,
        splitPanelPreview: {
          leftLabel: "No hiders",
          rightLabel: "Hiders joined",
          leftAwaitHiderAnswer: false,
          rightAwaitHiderAnswer: true,
        },
      },
      {
        id: "map-context",
        title: "On the map",
        body:
          "When the hider responds, the map screen shows that an answer is waiting in chat.",
        imageAlt: "Map screen after a photo answer arrives in chat",
        badge: cost,
        toolId,
      },
      {
        id: "on-map",
        title: "In chat",
        body:
          "Photo answers land in chat with the uploaded image. There is no elimination polygon, but seekers get visual proof.",
        imageAlt: "Photo answer shown in game chat on the map screen",
        badge: cost,
        toolId,
      },
    ],
  };
}

function buildLiveThermometerTutorial(): QuestionTutorial {
  return buildLiveQuestionTutorial({
    toolId: "thermometer",
    introBody:
      "Choose manual pins or a walked path, place both ends on the map, then pick hotter or colder.",
    mapBody:
      "Hotter or colder shades one side of your walked path and eliminates the other.",
    splitPanelPreview: {
      leftLabel: "Solo — you answer",
      rightLabel: "Hiders — send to chat",
      leftWizardStepId: "answer",
      rightWizardStepId: "placement",
      leftAwaitHiderAnswer: false,
      rightAwaitHiderAnswer: true,
    },
  });
}

const QUESTION_TUTORIALS: readonly QuestionTutorial[] = [
  buildLiveQuestionTutorial({
    toolId: "matching",
    introBody:
      "Pick a category, place your anchor, confirm the nearest feature, then answer yes or no.",
    mapBody:
      "A yes answer keeps the zone that shares your nearest category match. A no answer eliminates everywhere outside that boundary.",
    splitPanelPreview: {
      leftLabel: "Solo — you answer",
      rightLabel: "Hiders — send to chat",
      leftWizardStepId: "answer",
      rightWizardStepId: "resolve",
      leftAwaitHiderAnswer: false,
      rightAwaitHiderAnswer: true,
    },
  }),
  buildLiveQuestionTutorial({
    toolId: "measuring",
    introBody:
      "Place your anchor, pick a category or point, set a comparison target, then choose closer or further.",
    mapBody:
      "Closer or further splits the map along the distance comparison between your anchor and the hider.",
    splitPanelPreview: {
      leftLabel: "Solo — you answer",
      rightLabel: "Hiders — send to chat",
      leftWizardStepId: "answer",
      rightWizardStepId: "target",
      leftAwaitHiderAnswer: false,
      rightAwaitHiderAnswer: true,
    },
  }),
  buildLiveThermometerTutorial(),
  buildLiveQuestionTutorial({
    toolId: "radar",
    introBody:
      "Drop a circle anchor on the map, pick a distance preset, then answer yes or no about the hider.",
    mapBody:
      "A yes keeps the circle around your anchor. A no clears everything outside it.",
    splitPanelPreview: {
      leftLabel: "Solo — you answer",
      rightLabel: "Hiders — send to chat",
      leftWizardStepId: "answer",
      rightWizardStepId: "distance",
      leftAwaitHiderAnswer: false,
      rightAwaitHiderAnswer: true,
    },
  }),
  buildLiveQuestionTutorial({
    toolId: "tentacle",
    introBody:
      "Place your anchor, pick POI categories, review nearby locations, then choose the nearest match.",
    mapBody:
      "The hider's category picks carve out tentacle reaches. Wrong branches disappear from the map.",
    splitPanelPreview: {
      leftLabel: "Solo — you answer",
      rightLabel: "Hiders — send to chat",
      leftWizardStepId: "answer",
      rightWizardStepId: "locations",
      leftAwaitHiderAnswer: false,
      rightAwaitHiderAnswer: true,
    },
  }),
  buildLivePhotoTutorial(),
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

export function questionWalkthroughSteps(
  steps: readonly TutorialStep[],
): TutorialStep[] {
  return steps.filter((step) => step.kind !== "interactive-panel");
}

export function questionWalkthroughStepCount(
  steps: readonly TutorialStep[],
): number {
  return questionWalkthroughSteps(steps).length;
}

export function walkthroughIndexForFullStep(
  steps: readonly TutorialStep[],
  fullStepIndex: number,
): number | null {
  const step = steps[fullStepIndex];
  if (!step || step.kind === "interactive-panel") {
    return null;
  }

  return questionWalkthroughSteps(steps).findIndex(
    (walkthroughStep) => walkthroughStep.id === step.id,
  );
}

export function fullStepIndexForWalkthroughStep(
  steps: readonly TutorialStep[],
  walkthroughIndex: number,
): number {
  const walkthroughStep = questionWalkthroughSteps(steps)[walkthroughIndex];
  if (!walkthroughStep) {
    return 0;
  }

  return steps.findIndex((step) => step.id === walkthroughStep.id);
}

export function isQuestionTutorialComplete(
  id: QuestionTutorialId,
  _stepCount: number,
  progress: TutorialProgress,
): boolean {
  const tutorial = getQuestionTutorial(id);
  const walkthroughCount = questionWalkthroughStepCount(tutorial.steps);
  return progress.questions[id] >= walkthroughCount - 1;
}

export function questionTutorialStartIndex(
  id: QuestionTutorialId,
  _stepCount: number,
  progress: TutorialProgress,
): number {
  const tutorial = getQuestionTutorial(id);
  const walkthroughSteps = questionWalkthroughSteps(tutorial.steps);

  if (isQuestionTutorialComplete(id, walkthroughSteps.length, progress)) {
    return 0;
  }

  const last = progress.questions[id];
  if (last < 0) {
    return 0;
  }

  const nextWalkthroughIndex = Math.min(last + 1, walkthroughSteps.length - 1);
  return fullStepIndexForWalkthroughStep(
    tutorial.steps,
    nextWalkthroughIndex,
  );
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

export function markQuestionTutorialComplete(
  id: QuestionTutorialId,
  _stepCount: number,
  progress: TutorialProgress,
): TutorialProgress {
  const tutorial = getQuestionTutorial(id);
  const lastWalkthroughIndex = questionWalkthroughStepCount(tutorial.steps) - 1;
  return markQuestionStepComplete(
    id,
    fullStepIndexForWalkthroughStep(tutorial.steps, lastWalkthroughIndex),
    progress,
  );
}

export function markQuestionStepComplete(
  id: QuestionTutorialId,
  stepIndex: number,
  progress: TutorialProgress,
): TutorialProgress {
  const tutorial = getQuestionTutorial(id);
  const walkthroughIndex = walkthroughIndexForFullStep(tutorial.steps, stepIndex);
  if (walkthroughIndex === null) {
    return progress;
  }

  return {
    ...progress,
    questions: {
      ...progress.questions,
      [id]: Math.max(progress.questions[id], walkthroughIndex),
    },
  };
}
