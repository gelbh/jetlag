import {
  closerFurtherAnswerOptions,
  hotterColderAnswerOptions,
  yesNoAnswerOptions,
} from "@/components/tools/shared/answers/binaryAnswerOptions";
import { milesToMeters } from "@/domain/map/distance";
import { matchingQuestionFor } from "@/domain/questions/matchingQuestions";
import { BODY_OF_WATER_MEASURING_QUESTION } from "@/domain/questions/measuring/measuringCatalog";
import { measuringQuestionFor } from "@/domain/questions/measuringQuestions";
import {
  PHOTO_REPLY_OPTIONS,
  photoQuestionPrompt,
} from "@/domain/questions/photoQuestions";
import { radarQuestionPrompt } from "@/domain/questions/radarQuestions";
import {
  TENTACLE_NOT_WITHIN_REACH_LABEL,
  tentacleQuestionPrompt,
} from "@/domain/questions/tentacleQuestions";
import { thermometerQuestionPrompt } from "@/domain/questions/thermometerQuestions";
import type {
  GameReplyOption,
  PendingQuestionRecord,
  SessionMessageRecord,
} from "@/domain/session/activity/sessionChat";
import type { SessionActivityEvent } from "@/domain/session/activity/sessionActivityLog";
import type { HiderTruthResult } from "@/domain/questions/ui";
import { tentacleRadiusMeters } from "@/domain/session/size/gameSizeRules";
import { THERMOMETER_WALK_CANCEL_TEXT } from "@/services/firestore/firestoreSessionExtras";

export const DEV_MOCK_SESSION_FEED_KEY = "jl.dev.mockSessionFeed";

export function isDevMockSessionFeedEnabled(): boolean {
  if (!import.meta.env.DEV) {
    return false;
  }
  try {
    return localStorage.getItem(DEV_MOCK_SESSION_FEED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setDevMockSessionFeedEnabled(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.setItem(DEV_MOCK_SESSION_FEED_KEY, "1");
    } else {
      localStorage.removeItem(DEV_MOCK_SESSION_FEED_KEY);
    }
  } catch {
    // ignore quota / private mode
  }
}

const HOST = "mock-host";
const SEEKER = "mock-seeker";
const SEEKER_B = "mock-seeker-b";
const HIDER = "mock-hider";

/** Stable demo session id used by the chat/log gallery and in-map mock feed. */
export const MOCK_SESSION_FEED_ID = "mock-session";

const UNIT = "imperial" as const;
const GAME_SIZE = "medium" as const;

const YES_NO: GameReplyOption[] = yesNoAnswerOptions.map((option) => ({
  id: option.value,
  label: option.label,
}));

const CLOSER_FURTHER: GameReplyOption[] = closerFurtherAnswerOptions.map(
  (option) => ({
    id: option.value,
    label: option.label,
  }),
);

const HOTTER_COLDER: GameReplyOption[] = hotterColderAnswerOptions.map(
  (option) => ({
    id: option.value,
    label: option.label,
  }),
);

const MATCHING_MUSEUM = matchingQuestionFor("museum");
const MATCHING_AIRPORT = matchingQuestionFor("commercial_airport");
const MEASURING_MUSEUM = measuringQuestionFor("location", "museum");
const MEASURING_WATER = BODY_OF_WATER_MEASURING_QUESTION;

const RADAR_1MI = radarQuestionPrompt(milesToMeters(1), UNIT);
const RADAR_025MI = radarQuestionPrompt(milesToMeters(0.25), UNIT);
const THERMO_HALF = thermometerQuestionPrompt(milesToMeters(0.5), UNIT);
const THERMO_WALK_START = `Thermometer walk started. ${THERMO_HALF}`;
const TENTACLE_MUSEUM = tentacleQuestionPrompt(
  "museum",
  UNIT,
  tentacleRadiusMeters("museum", GAME_SIZE),
);
const PHOTO_TREE = photoQuestionPrompt("tree", UNIT);
const PHOTO_WIDEST = photoQuestionPrompt("widest_street", UNIT);

const TENTACLE_POIS: GameReplyOption[] = [
  { id: "poi-british-museum", label: "British Museum" },
  { id: "poi-natural-history", label: "Natural History Museum" },
  { id: "poi-tate-modern", label: "Tate Modern" },
  { id: "out-of-reach", label: TENTACLE_NOT_WITHIN_REACH_LABEL },
];

function ago(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

function yesNoLabel(id: "yes" | "no"): string {
  return YES_NO.find((option) => option.id === id)?.label ?? id;
}

/**
 * Dev mock feed shaped like production Jet Lag questions/answers.
 * Covers matching, measuring, radar, thermometer (walk + ask), tentacle,
 * photo, cancel, late, and expired-pending for Chat + Session log polish.
 */
export function buildMockChatMessages(
  sessionId: string = MOCK_SESSION_FEED_ID,
): SessionMessageRecord[] {
  return [
    {
      id: "mock-social-1",
      sessionId,
      channel: "social",
      senderUid: SEEKER,
      senderRole: "seeker",
      createdAt: ago(55 * 60_000),
      text: "Anyone near the river yet?",
    },
    {
      id: "mock-social-2",
      sessionId,
      channel: "social",
      senderUid: HIDER,
      senderRole: "hider",
      createdAt: ago(53 * 60_000),
      text: "No spoilers. Good luck.",
    },
    {
      id: "mock-social-3",
      sessionId,
      channel: "social",
      senderUid: SEEKER_B,
      senderRole: "seeker",
      createdAt: ago(50 * 60_000),
      text: "Joint radar at the bridge in 5?",
    },
    {
      id: "mock-social-4",
      sessionId,
      channel: "social",
      senderUid: SEEKER,
      senderRole: "seeker",
      createdAt: ago(49 * 60_000),
      text: "On my way.",
    },

    // Matching · answered Yes
    {
      id: "mock-q-matching-museum",
      sessionId,
      channel: "game",
      senderUid: SEEKER,
      senderRole: "seeker",
      createdAt: ago(48 * 60_000),
      kind: "question",
      pendingQuestionId: "mock-pq-matching-museum",
      toolType: "matching",
      promptText: MATCHING_MUSEUM.prompt,
      replyOptions: YES_NO,
      status: "answered",
      selectedReply: "yes",
    },

    // Radar · answered No
    {
      id: "mock-q-radar-1mi",
      sessionId,
      channel: "game",
      senderUid: SEEKER_B,
      senderRole: "seeker",
      createdAt: ago(42 * 60_000),
      kind: "question",
      pendingQuestionId: "mock-pq-radar-1mi",
      toolType: "radar",
      promptText: RADAR_1MI,
      replyOptions: YES_NO,
      status: "answered",
      selectedReply: "no",
    },

    // Measuring · body of water · answered Further
    {
      id: "mock-q-measuring-water",
      sessionId,
      channel: "game",
      senderUid: SEEKER,
      senderRole: "seeker",
      createdAt: ago(36 * 60_000),
      kind: "question",
      pendingQuestionId: "mock-pq-measuring-water",
      toolType: "measuring",
      promptText: MEASURING_WATER.prompt,
      replyOptions: CLOSER_FURTHER,
      status: "answered",
      selectedReply: "further",
    },

    // Matching · null option · answered Null
    {
      id: "mock-q-matching-airport",
      sessionId,
      channel: "game",
      senderUid: SEEKER_B,
      senderRole: "seeker",
      createdAt: ago(30 * 60_000),
      kind: "question",
      pendingQuestionId: "mock-pq-matching-airport",
      toolType: "matching",
      promptText: MATCHING_AIRPORT.prompt,
      replyOptions: [
        ...YES_NO,
        { id: "null", label: "Null (not in play area)" },
      ],
      status: "answered",
      selectedReply: "null",
    },

    // Measuring · cancelled
    {
      id: "mock-q-measuring-museum",
      sessionId,
      channel: "game",
      senderUid: SEEKER,
      senderRole: "seeker",
      createdAt: ago(26 * 60_000),
      kind: "question",
      pendingQuestionId: "mock-pq-measuring-museum",
      toolType: "measuring",
      promptText: MEASURING_MUSEUM.prompt,
      replyOptions: CLOSER_FURTHER,
      status: "cancelled",
    },

    // Thermometer walk start (system) + later ask answered Hotter
    {
      id: "mock-sys-thermo-walk",
      sessionId,
      channel: "game",
      senderUid: SEEKER_B,
      senderRole: "seeker",
      createdAt: ago(22 * 60_000),
      kind: "system",
      text: THERMO_WALK_START,
    },
    {
      id: "mock-q-thermo",
      sessionId,
      channel: "game",
      senderUid: SEEKER_B,
      senderRole: "seeker",
      createdAt: ago(18 * 60_000),
      kind: "question",
      pendingQuestionId: "mock-pq-thermo",
      toolType: "thermometer",
      promptText: THERMO_HALF,
      replyOptions: HOTTER_COLDER,
      status: "answered",
      selectedReply: "hotter",
    },

    // Tentacle · POI answer
    {
      id: "mock-q-tentacle-poi",
      sessionId,
      channel: "game",
      senderUid: SEEKER,
      senderRole: "seeker",
      createdAt: ago(14 * 60_000),
      kind: "question",
      pendingQuestionId: "mock-pq-tentacle-poi",
      toolType: "tentacle",
      promptText: TENTACLE_MUSEUM,
      replyOptions: TENTACLE_POIS,
      status: "answered",
      selectedReply: "poi-tate-modern",
    },

    // Tentacle · Not within reach
    {
      id: "mock-q-tentacle-oor",
      sessionId,
      channel: "game",
      senderUid: SEEKER_B,
      senderRole: "seeker",
      createdAt: ago(11 * 60_000),
      kind: "question",
      pendingQuestionId: "mock-pq-tentacle-oor",
      toolType: "tentacle",
      promptText: TENTACLE_MUSEUM,
      replyOptions: TENTACLE_POIS,
      status: "answered",
      selectedReply: "out-of-reach",
    },

    // Photo · answered uploaded
    {
      id: "mock-q-photo-tree",
      sessionId,
      channel: "game",
      senderUid: SEEKER,
      senderRole: "seeker",
      createdAt: ago(9 * 60_000),
      kind: "question",
      pendingQuestionId: "mock-pq-photo-tree",
      toolType: "photo",
      promptText: PHOTO_TREE,
      replyOptions: [...PHOTO_REPLY_OPTIONS],
      status: "answered",
      selectedReply: "photo",
    },

    // Photo · cannot answer
    {
      id: "mock-q-photo-street",
      sessionId,
      channel: "game",
      senderUid: SEEKER_B,
      senderRole: "seeker",
      createdAt: ago(7 * 60_000),
      kind: "question",
      pendingQuestionId: "mock-pq-photo-street",
      toolType: "photo",
      promptText: PHOTO_WIDEST,
      replyOptions: [...PHOTO_REPLY_OPTIONS],
      status: "answered",
      selectedReply: "cannot_answer",
    },

    // Radar · answered late
    {
      id: "mock-q-radar-late",
      sessionId,
      channel: "game",
      senderUid: SEEKER,
      senderRole: "seeker",
      createdAt: ago(5 * 60_000),
      kind: "question",
      pendingQuestionId: "mock-pq-radar-late",
      toolType: "radar",
      promptText: RADAR_025MI,
      replyOptions: YES_NO,
      status: "answered",
      selectedReply: "yes",
    },

    // Thermometer walk cancelled (system)
    {
      id: "mock-sys-thermo-cancel",
      sessionId,
      channel: "game",
      senderUid: SEEKER_B,
      senderRole: "seeker",
      createdAt: ago(3 * 60_000),
      kind: "system",
      text: THERMOMETER_WALK_CANCEL_TEXT.manual,
    },

    // Radar · expired pending (seeker can dismiss)
    {
      id: "mock-q-radar-expired",
      sessionId,
      channel: "game",
      senderUid: SEEKER,
      senderRole: "seeker",
      createdAt: ago(2 * 60_000),
      kind: "question",
      pendingQuestionId: "mock-pq-radar-expired",
      toolType: "radar",
      promptText: RADAR_1MI,
      replyOptions: YES_NO,
      status: "pending",
    },

    // Photo · still pending (upload / mark sent / cannot answer)
    {
      id: "mock-q-photo-pending",
      sessionId,
      channel: "game",
      senderUid: SEEKER_B,
      senderRole: "seeker",
      createdAt: ago(90_000),
      kind: "question",
      pendingQuestionId: "mock-pq-photo-pending",
      toolType: "photo",
      promptText: PHOTO_TREE,
      replyOptions: [...PHOTO_REPLY_OPTIONS],
      status: "pending",
    },

    // Matching · open for hider to answer (primary answer demo)
    {
      id: "mock-q-matching-answerable",
      sessionId,
      channel: "game",
      senderUid: SEEKER,
      senderRole: "seeker",
      createdAt: ago(45_000),
      kind: "question",
      pendingQuestionId: "mock-pq-matching-answerable",
      toolType: "matching",
      promptText: MATCHING_MUSEUM.prompt,
      replyOptions: YES_NO,
      status: "pending",
    },

    // Radar · open for hider to answer
    {
      id: "mock-q-radar-answerable",
      sessionId,
      channel: "game",
      senderUid: SEEKER_B,
      senderRole: "seeker",
      createdAt: ago(20_000),
      kind: "question",
      pendingQuestionId: "mock-pq-radar-answerable",
      toolType: "radar",
      promptText: RADAR_1MI,
      replyOptions: YES_NO,
      status: "pending",
    },

    {
      id: "mock-social-5",
      sessionId,
      channel: "social",
      senderUid: HOST,
      senderRole: "seeker",
      createdAt: ago(60_000),
      text: "Keep pushing. Photo still open.",
    },
    {
      id: "mock-social-6",
      sessionId,
      channel: "social",
      senderUid: HIDER,
      senderRole: "hider",
      createdAt: ago(30_000),
      text: "Working through the queue.",
    },
  ];
}

export function buildMockPendingQuestions(
  sessionId: string = MOCK_SESSION_FEED_ID,
): PendingQuestionRecord[] {
  return [
    {
      id: "mock-pq-matching-museum",
      sessionId,
      toolType: "matching",
      createdByUid: SEEKER,
      createdAt: ago(48 * 60_000),
      status: "answered",
      placement: { geometryJson: "{}", metadata: { matchingCategory: "museum" } },
      replyOptions: YES_NO,
      promptText: MATCHING_MUSEUM.prompt,
      answer: "yes",
      cardDraw: 3,
      cardKeep: 1,
    },
    {
      id: "mock-pq-radar-1mi",
      sessionId,
      toolType: "radar",
      createdByUid: SEEKER_B,
      createdAt: ago(42 * 60_000),
      status: "answered",
      placement: {
        geometryJson: "{}",
        metadata: { radiusMeters: milesToMeters(1), radarChooseCustom: false },
      },
      replyOptions: YES_NO,
      promptText: RADAR_1MI,
      answer: "no",
      cardDraw: 2,
      cardKeep: 1,
    },
    {
      id: "mock-pq-measuring-water",
      sessionId,
      toolType: "measuring",
      createdByUid: SEEKER,
      createdAt: ago(36 * 60_000),
      status: "answered",
      placement: {
        geometryJson: "{}",
        metadata: { measuringSubject: "location" },
      },
      replyOptions: CLOSER_FURTHER,
      promptText: MEASURING_WATER.prompt,
      answer: "further",
      cardDraw: 3,
      cardKeep: 1,
    },
    {
      id: "mock-pq-matching-airport",
      sessionId,
      toolType: "matching",
      createdByUid: SEEKER_B,
      createdAt: ago(30 * 60_000),
      status: "answered",
      placement: {
        geometryJson: "{}",
        metadata: {
          matchingCategory: "commercial_airport",
          matchingNullAnswer: true,
        },
      },
      replyOptions: [
        ...YES_NO,
        { id: "null", label: "Null (not in play area)" },
      ],
      promptText: MATCHING_AIRPORT.prompt,
      answer: null,
      cardDraw: 3,
      cardKeep: 1,
    },
    {
      id: "mock-pq-measuring-museum",
      sessionId,
      toolType: "measuring",
      createdByUid: SEEKER,
      createdAt: ago(26 * 60_000),
      status: "cancelled",
      placement: { geometryJson: "{}", metadata: {} },
      replyOptions: CLOSER_FURTHER,
      promptText: MEASURING_MUSEUM.prompt,
      cardDraw: 3,
      cardKeep: 1,
    },
    {
      id: "mock-pq-thermo-walk",
      sessionId,
      toolType: "thermometer",
      createdByUid: SEEKER_B,
      createdAt: ago(22 * 60_000),
      status: "walking",
      placement: {
        geometryJson: "{}",
        metadata: { thermometerDistanceMeters: milesToMeters(0.5) },
      },
      replyOptions: [],
      promptText: THERMO_WALK_START,
      cardDraw: 2,
      cardKeep: 1,
    },
    {
      id: "mock-pq-thermo",
      sessionId,
      toolType: "thermometer",
      createdByUid: SEEKER_B,
      createdAt: ago(18 * 60_000),
      status: "answered",
      placement: {
        geometryJson: "{}",
        metadata: { thermometerDistanceMeters: milesToMeters(0.5) },
      },
      replyOptions: HOTTER_COLDER,
      promptText: THERMO_HALF,
      answer: "hotter",
      cardDraw: 2,
      cardKeep: 1,
    },
    {
      id: "mock-pq-tentacle-poi",
      sessionId,
      toolType: "tentacle",
      createdByUid: SEEKER,
      createdAt: ago(14 * 60_000),
      status: "answered",
      placement: {
        geometryJson: "{}",
        metadata: { tentacleCategoryId: "museum" },
      },
      replyOptions: TENTACLE_POIS,
      promptText: TENTACLE_MUSEUM,
      answer: "poi-tate-modern",
      cardDraw: 4,
      cardKeep: 2,
    },
    {
      id: "mock-pq-tentacle-oor",
      sessionId,
      toolType: "tentacle",
      createdByUid: SEEKER_B,
      createdAt: ago(11 * 60_000),
      status: "answered",
      placement: {
        geometryJson: "{}",
        metadata: {
          tentacleCategoryId: "museum",
          tentacleOutOfReach: true,
        },
      },
      replyOptions: TENTACLE_POIS,
      promptText: TENTACLE_MUSEUM,
      answer: "out-of-reach",
      cardDraw: 4,
      cardKeep: 2,
    },
    {
      id: "mock-pq-photo-tree",
      sessionId,
      toolType: "photo",
      createdByUid: SEEKER,
      createdAt: ago(9 * 60_000),
      status: "answered",
      placement: { geometryJson: "{}", metadata: {} },
      replyOptions: [...PHOTO_REPLY_OPTIONS],
      promptText: PHOTO_TREE,
      answer: {
        kind: "photo",
        storagePath: "sessions/mock-session/photos/mock-tree.jpg",
      },
      cardDraw: 1,
      cardKeep: 1,
    },
    {
      id: "mock-pq-photo-street",
      sessionId,
      toolType: "photo",
      createdByUid: SEEKER_B,
      createdAt: ago(7 * 60_000),
      status: "answered",
      placement: { geometryJson: "{}", metadata: {} },
      replyOptions: [...PHOTO_REPLY_OPTIONS],
      promptText: PHOTO_WIDEST,
      answer: { kind: "cannot_answer" },
      cardDraw: 1,
      cardKeep: 1,
    },
    {
      id: "mock-pq-radar-late",
      sessionId,
      toolType: "radar",
      createdByUid: SEEKER,
      createdAt: ago(5 * 60_000),
      status: "answered",
      placement: {
        geometryJson: "{}",
        metadata: {
          radiusMeters: milesToMeters(0.25),
          radarChooseCustom: false,
        },
      },
      replyOptions: YES_NO,
      promptText: RADAR_025MI,
      answer: "yes",
      answeredLate: true,
      cardDraw: 2,
      cardKeep: 1,
    },
    {
      id: "mock-pq-radar-expired",
      sessionId,
      toolType: "radar",
      createdByUid: SEEKER,
      createdAt: ago(2 * 60_000),
      status: "pending",
      placement: {
        geometryJson: "{}",
        metadata: { radiusMeters: milesToMeters(1), radarChooseCustom: false },
      },
      replyOptions: YES_NO,
      promptText: RADAR_1MI,
      answerableAt: ago(2 * 60_000),
      deadlineExpiredAt: ago(30_000),
      cardDraw: 2,
      cardKeep: 1,
    },
    {
      id: "mock-pq-photo-pending",
      sessionId,
      toolType: "photo",
      createdByUid: SEEKER_B,
      createdAt: ago(90_000),
      status: "pending",
      placement: { geometryJson: "{}", metadata: {} },
      replyOptions: [...PHOTO_REPLY_OPTIONS],
      promptText: PHOTO_TREE,
      answerableAt: ago(90_000),
      cardDraw: 1,
      cardKeep: 1,
    },
    {
      id: "mock-pq-matching-answerable",
      sessionId,
      toolType: "matching",
      createdByUid: SEEKER,
      createdAt: ago(45_000),
      status: "pending",
      placement: { geometryJson: "{}", metadata: { matchingCategory: "museum" } },
      replyOptions: YES_NO,
      promptText: MATCHING_MUSEUM.prompt,
      answerableAt: ago(45_000),
      cardDraw: 3,
      cardKeep: 1,
    },
    {
      id: "mock-pq-radar-answerable",
      sessionId,
      toolType: "radar",
      createdByUid: SEEKER_B,
      createdAt: ago(20_000),
      status: "pending",
      placement: {
        geometryJson: "{}",
        metadata: { radiusMeters: milesToMeters(1), radarChooseCustom: false },
      },
      replyOptions: YES_NO,
      promptText: RADAR_1MI,
      answerableAt: ago(20_000),
      cardDraw: 2,
      cardKeep: 1,
    },
  ];
}

/** Recommended truth labels for open hider-answer demos. */
export function buildMockHiderTruths(): ReadonlyMap<string, HiderTruthResult> {
  return new Map([
    [
      "mock-pq-matching-answerable",
      { replyId: "no", label: "No" },
    ],
    [
      "mock-pq-radar-answerable",
      { replyId: "yes", label: "Yes" },
    ],
  ]);
}

export function buildMockActivityEvents(
  sessionId: string = MOCK_SESSION_FEED_ID,
): SessionActivityEvent[] {
  return [
    {
      id: "session_started",
      sessionId,
      type: "session_started",
      createdAt: ago(100 * 60_000),
      createdByUid: HOST,
      payload: {},
    },
    {
      id: "hiding_timer_started",
      sessionId,
      type: "hiding_timer_started",
      createdAt: ago(98 * 60_000),
      createdByUid: HOST,
      payload: {},
    },
    {
      id: "seeking_started",
      sessionId,
      type: "seeking_started",
      createdAt: ago(95 * 60_000),
      createdByUid: HOST,
      payload: {},
    },
    {
      id: "mock-act-matching-ask",
      sessionId,
      type: "question_asked",
      createdAt: ago(48 * 60_000),
      createdByUid: SEEKER,
      payload: {
        toolType: "matching",
        promptText: MATCHING_MUSEUM.prompt,
        pendingQuestionId: "mock-pq-matching-museum",
      },
    },
    {
      id: "mock-act-matching-ans",
      sessionId,
      type: "question_answered",
      createdAt: ago(47 * 60_000),
      createdByUid: HIDER,
      payload: {
        toolType: "matching",
        promptText: MATCHING_MUSEUM.prompt,
        pendingQuestionId: "mock-pq-matching-museum",
        answerSummary: yesNoLabel("yes"),
      },
    },
    {
      id: "mock-act-radar-ask",
      sessionId,
      type: "question_asked",
      createdAt: ago(42 * 60_000),
      createdByUid: SEEKER_B,
      payload: {
        toolType: "radar",
        promptText: RADAR_1MI,
        pendingQuestionId: "mock-pq-radar-1mi",
      },
    },
    {
      id: "mock-act-radar-ans",
      sessionId,
      type: "question_answered",
      createdAt: ago(41 * 60_000),
      createdByUid: HIDER,
      payload: {
        toolType: "radar",
        promptText: RADAR_1MI,
        pendingQuestionId: "mock-pq-radar-1mi",
        answerSummary: yesNoLabel("no"),
      },
    },
    {
      id: "mock-act-measuring-water-ask",
      sessionId,
      type: "question_asked",
      createdAt: ago(36 * 60_000),
      createdByUid: SEEKER,
      payload: {
        toolType: "measuring",
        promptText: MEASURING_WATER.prompt,
        pendingQuestionId: "mock-pq-measuring-water",
      },
    },
    {
      id: "mock-act-measuring-water-ans",
      sessionId,
      type: "question_answered",
      createdAt: ago(35 * 60_000),
      createdByUid: HIDER,
      payload: {
        toolType: "measuring",
        promptText: MEASURING_WATER.prompt,
        pendingQuestionId: "mock-pq-measuring-water",
        answerSummary: "Further",
      },
    },
    {
      id: "mock-act-matching-airport-ask",
      sessionId,
      type: "question_asked",
      createdAt: ago(30 * 60_000),
      createdByUid: SEEKER_B,
      payload: {
        toolType: "matching",
        promptText: MATCHING_AIRPORT.prompt,
        pendingQuestionId: "mock-pq-matching-airport",
      },
    },
    {
      id: "mock-act-matching-airport-ans",
      sessionId,
      type: "question_answered",
      createdAt: ago(29 * 60_000),
      createdByUid: HIDER,
      payload: {
        toolType: "matching",
        promptText: MATCHING_AIRPORT.prompt,
        pendingQuestionId: "mock-pq-matching-airport",
        answerSummary: "Null (not in play area)",
      },
    },
    {
      id: "mock-act-measuring-museum-ask",
      sessionId,
      type: "question_asked",
      createdAt: ago(26 * 60_000),
      createdByUid: SEEKER,
      payload: {
        toolType: "measuring",
        promptText: MEASURING_MUSEUM.prompt,
        pendingQuestionId: "mock-pq-measuring-museum",
      },
    },
    {
      id: "mock-act-measuring-museum-cancel",
      sessionId,
      type: "question_cancelled",
      createdAt: ago(25 * 60_000),
      createdByUid: SEEKER,
      payload: {
        toolType: "measuring",
        promptText: MEASURING_MUSEUM.prompt,
        pendingQuestionId: "mock-pq-measuring-museum",
      },
    },
    {
      id: "mock-act-thermo-walk",
      sessionId,
      type: "thermometer_walk_started",
      createdAt: ago(22 * 60_000),
      createdByUid: SEEKER_B,
      payload: {
        pendingQuestionId: "mock-pq-thermo-walk",
        promptText: THERMO_HALF,
      },
    },
    {
      id: "mock-act-thermo-ready",
      sessionId,
      type: "thermometer_walk_separated",
      createdAt: ago(19 * 60_000),
      createdByUid: SEEKER_B,
      payload: {
        pendingQuestionId: "mock-pq-thermo",
        promptText: THERMO_HALF,
      },
    },
    {
      id: "mock-act-thermo-ask",
      sessionId,
      type: "question_asked",
      createdAt: ago(18 * 60_000),
      createdByUid: SEEKER_B,
      payload: {
        toolType: "thermometer",
        promptText: THERMO_HALF,
        pendingQuestionId: "mock-pq-thermo",
      },
    },
    {
      id: "mock-act-thermo-ans",
      sessionId,
      type: "question_answered",
      createdAt: ago(17 * 60_000),
      createdByUid: HIDER,
      payload: {
        toolType: "thermometer",
        promptText: THERMO_HALF,
        pendingQuestionId: "mock-pq-thermo",
        answerSummary: "Hotter",
      },
    },
    {
      id: "mock-act-tentacle-ask",
      sessionId,
      type: "question_asked",
      createdAt: ago(14 * 60_000),
      createdByUid: SEEKER,
      payload: {
        toolType: "tentacle",
        promptText: TENTACLE_MUSEUM,
        pendingQuestionId: "mock-pq-tentacle-poi",
      },
    },
    {
      id: "mock-act-tentacle-ans",
      sessionId,
      type: "question_answered",
      createdAt: ago(13 * 60_000),
      createdByUid: HIDER,
      payload: {
        toolType: "tentacle",
        promptText: TENTACLE_MUSEUM,
        pendingQuestionId: "mock-pq-tentacle-poi",
        answerSummary: "Tate Modern",
      },
    },
    {
      id: "mock-act-tentacle-oor-ask",
      sessionId,
      type: "question_asked",
      createdAt: ago(11 * 60_000),
      createdByUid: SEEKER_B,
      payload: {
        toolType: "tentacle",
        promptText: TENTACLE_MUSEUM,
        pendingQuestionId: "mock-pq-tentacle-oor",
      },
    },
    {
      id: "mock-act-tentacle-oor-ans",
      sessionId,
      type: "question_answered",
      createdAt: ago(10 * 60_000),
      createdByUid: HIDER,
      payload: {
        toolType: "tentacle",
        promptText: TENTACLE_MUSEUM,
        pendingQuestionId: "mock-pq-tentacle-oor",
        answerSummary: TENTACLE_NOT_WITHIN_REACH_LABEL,
      },
    },
    {
      id: "mock-act-photo-tree-ask",
      sessionId,
      type: "photo_asked",
      createdAt: ago(9 * 60_000),
      createdByUid: SEEKER,
      payload: {
        pendingQuestionId: "mock-pq-photo-tree",
        promptText: PHOTO_TREE,
      },
    },
    {
      id: "mock-act-photo-tree-ans",
      sessionId,
      type: "photo_answered",
      createdAt: ago(8 * 60_000),
      createdByUid: HIDER,
      payload: {
        pendingQuestionId: "mock-pq-photo-tree",
        promptText: PHOTO_TREE,
        answerSummary: "Photo received",
      },
    },
    {
      id: "mock-act-photo-street-ask",
      sessionId,
      type: "photo_asked",
      createdAt: ago(7 * 60_000),
      createdByUid: SEEKER_B,
      payload: {
        pendingQuestionId: "mock-pq-photo-street",
        promptText: PHOTO_WIDEST,
      },
    },
    {
      id: "mock-act-photo-street-ans",
      sessionId,
      type: "photo_answered",
      createdAt: ago(6 * 60_000),
      createdByUid: HIDER,
      payload: {
        pendingQuestionId: "mock-pq-photo-street",
        promptText: PHOTO_WIDEST,
        answerSummary: "I cannot answer the question",
      },
    },
    {
      id: "mock-act-radar-late-ask",
      sessionId,
      type: "question_asked",
      createdAt: ago(5 * 60_000),
      createdByUid: SEEKER,
      payload: {
        toolType: "radar",
        promptText: RADAR_025MI,
        pendingQuestionId: "mock-pq-radar-late",
      },
    },
    {
      id: "mock-act-radar-late-ans",
      sessionId,
      type: "question_answered",
      createdAt: ago(4 * 60_000),
      createdByUid: HIDER,
      payload: {
        toolType: "radar",
        promptText: RADAR_025MI,
        pendingQuestionId: "mock-pq-radar-late",
        answerSummary: yesNoLabel("yes"),
        answeredLate: true,
      },
    },
    {
      id: "mock-act-photo-pending",
      sessionId,
      type: "photo_asked",
      createdAt: ago(90_000),
      createdByUid: SEEKER_B,
      payload: {
        pendingQuestionId: "mock-pq-photo-pending",
        promptText: PHOTO_TREE,
      },
    },
    {
      id: "mock-act-matching-answerable",
      sessionId,
      type: "question_asked",
      createdAt: ago(45_000),
      createdByUid: SEEKER,
      payload: {
        toolType: "matching",
        promptText: MATCHING_MUSEUM.prompt,
        pendingQuestionId: "mock-pq-matching-answerable",
      },
    },
    {
      id: "mock-act-radar-answerable",
      sessionId,
      type: "question_asked",
      createdAt: ago(20_000),
      createdByUid: SEEKER_B,
      payload: {
        toolType: "radar",
        promptText: RADAR_1MI,
        pendingQuestionId: "mock-pq-radar-answerable",
      },
    },
  ];
}
