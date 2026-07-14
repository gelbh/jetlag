import type { GameSize } from "../session/gameSize";
import { firstUnusedCatalogOption } from "../session/toolSessionOptions";
import type { PendingQuestionRecord } from "../session/sessionChat";
import type { GameReplyOption } from "../session/sessionChat";
import { buildCatalogHelpers } from "./catalogHelpers";

export type PhotoCategoryId =
  | "any_building_from_transit_station"
  | "widest_street"
  | "tree"
  | "tallest_structure_sightline"
  | "you"
  | "the_sky"
  | "tallest_building_from_transit_station"
  | "trace_nearest_street_path"
  | "two_buildings"
  | "restaurant_interior"
  | "park"
  | "grocery_store_aisle"
  | "place_of_worship"
  | "train_platform"
  | "half_mile_streets_traced"
  | "tallest_mountain_from_transit_station"
  | "biggest_body_of_water_in_zone"
  | "five_buildings";

export type PhotoCategoryPhase = 1 | 2 | 3;

export interface PhotoCategoryDefinition {
  id: PhotoCategoryId;
  label: string;
  promptNoun: string;
  ruleSummary: string;
  phase: PhotoCategoryPhase;
}

export type PhotoAnswer =
  | { kind: "photo"; storagePath: string }
  | { kind: "cannot_answer" }
  | { kind: "sent_externally" };

export const PHOTO_CANNOT_ANSWER_ID = "cannot_answer";
export const PHOTO_CANNOT_ANSWER_LABEL = "I cannot answer the question";
export const PHOTO_SENT_EXTERNALLY_ID = "sent_externally";
export const PHOTO_SENT_EXTERNALLY_LABEL = "Mark sent";
export const PHOTO_SENT_EXTERNALLY_SEEKER_LABEL = "Photo sent outside the app";
export const PHOTO_UPLOAD_OUTAGE_NOTICE =
  "In-app photo upload is temporarily unavailable. Send the photo in your group chat (iMessage, WhatsApp, SMS, etc.), then tap Mark sent when done.";

export const PHOTO_REPLY_OPTIONS: readonly GameReplyOption[] = [
  { id: PHOTO_SENT_EXTERNALLY_ID, label: PHOTO_SENT_EXTERNALLY_LABEL },
  { id: PHOTO_CANNOT_ANSWER_ID, label: PHOTO_CANNOT_ANSWER_LABEL },
];

export const PHOTO_CATEGORIES = [
  {
    id: "any_building_from_transit_station",
    label: "Any Building Visible from Transit Station",
    promptNoun: "any building visible from a transit station",
    ruleSummary:
      "Must stand directly outside a station entrance. If multiple, choose one. Must include roof and both sides, with the top of the building in the top 1/3 of the frame.",
    phase: 1,
  },
  {
    id: "widest_street",
    label: "Widest Street",
    promptNoun: "the widest street",
    ruleSummary:
      "Must include both sides of the street; background not required.",
    phase: 1,
  },
  {
    id: "tree",
    label: "Tree",
    promptNoun: "a tree",
    ruleSummary: "Must include the entire tree.",
    phase: 1,
  },
  {
    id: "tallest_structure_sightline",
    label: "Tallest Structure In Your Current Sightline",
    promptNoun: "the tallest structure in your current sightline",
    ruleSummary:
      "Tallest building from your perspective, not objectively tallest. Must include top and both sides. Top must be in top 1/3 of the frame.",
    phase: 1,
  },
  {
    id: "you",
    label: "You",
    promptNoun: "you",
    ruleSummary:
      "Selfie mode, perpendicular to ground, arm extended, default lens, no zoom.",
    phase: 1,
  },
  {
    id: "the_sky",
    label: "The Sky",
    promptNoun: "the sky",
    ruleSummary:
      "Place phone on ground, shoot directly up, no zoom.",
    phase: 1,
  },
  {
    id: "tallest_building_from_transit_station",
    label: "Tallest Building Visible from Transit Station",
    promptNoun: "the tallest building visible from a transit station",
    ruleSummary:
      "Same as any building from transit station, but must stand directly outside a station entrance. In general, the transit station itself cannot count as the tallest building visible from the station, unless unrelated (e.g., MetLife building atop Grand Central Station).",
    phase: 2,
  },
  {
    id: "trace_nearest_street_path",
    label: "Trace Nearest Street/Path",
    promptNoun: "a trace of the nearest street or path",
    ruleSummary:
      "Street/path must be visible on mapping app; trace intersection to intersection (use photo editing app or tracing on paper).",
    phase: 2,
  },
  {
    id: "two_buildings",
    label: "2 Buildings",
    promptNoun: "2 buildings",
    ruleSummary: "Bottom to up to four stories.",
    phase: 2,
  },
  {
    id: "restaurant_interior",
    label: "Restaurant Interior",
    promptNoun: "a restaurant interior",
    ruleSummary:
      "No zoom. Take picture through the window from outside.",
    phase: 2,
  },
  {
    id: "park",
    label: "Park",
    promptNoun: "a park",
    ruleSummary:
      "No zoom, perpendicular to ground. Must stand 5 feet from any obstruction.",
    phase: 2,
  },
  {
    id: "grocery_store_aisle",
    label: "Grocery Store Aisle",
    promptNoun: "a grocery store aisle",
    ruleSummary:
      "No zoom. Stand at the end of the aisle, shoot directly down.",
    phase: 2,
  },
  {
    id: "place_of_worship",
    label: "Place of Worship",
    promptNoun: "a place of worship",
    ruleSummary:
      "5' x 5' section with 3 distinct elements. The litmus test: can someone match it if they visit the spot?",
    phase: 2,
  },
  {
    id: "train_platform",
    label: "Train Platform",
    promptNoun: "a train platform",
    ruleSummary:
      "5' x 5' section with 3 distinct elements.",
    phase: 2,
  },
  {
    id: "half_mile_streets_traced",
    label: "1/2 Mile of Streets Traced",
    promptNoun: "½ mile of streets traced",
    ruleSummary:
      "Must be continuous, include 5 turns, no doubling back. North-south oriented. Must be traceable on a map.",
    phase: 3,
  },
  {
    id: "tallest_mountain_from_transit_station",
    label: "Tallest Mountain Visible from Transit Station",
    promptNoun: "the tallest mountain visible from a transit station",
    ruleSummary:
      "Tallest from your perspective. Max 3x zoom; top in top 1/3 of frame.",
    phase: 3,
  },
  {
    id: "biggest_body_of_water_in_zone",
    label: "Biggest Body of Water in Your Zone",
    promptNoun: "the biggest body of water in your zone",
    ruleSummary:
      "Max 3x zoom. Must include both sides or horizon. Partially counted if only a portion is inside.",
    phase: 3,
  },
  {
    id: "five_buildings",
    label: "5 Buildings",
    promptNoun: "5 buildings",
    ruleSummary: "Bottom to up to four stories.",
    phase: 3,
  },
] as const satisfies readonly PhotoCategoryDefinition[];

function maxPhaseForGameSize(gameSize: GameSize): PhotoCategoryPhase {
  if (gameSize === "large") {
    return 3;
  }
  if (gameSize === "medium") {
    return 2;
  }
  return 1;
}

export function getPhotoCategory(
  categoryId: PhotoCategoryId,
): PhotoCategoryDefinition {
  const category = PHOTO_CATEGORIES.find((item) => item.id === categoryId);
  if (!category) {
    throw new Error(`Unknown photo category: ${categoryId}`);
  }
  return category;
}

export function photoCategoryLabel(categoryId: PhotoCategoryId): string {
  return getPhotoCategory(categoryId).label;
}

export function isPhotoCategoryAvailableForGameSize(
  gameSize: GameSize,
  categoryId: PhotoCategoryId,
): boolean {
  return getPhotoCategory(categoryId).phase <= maxPhaseForGameSize(gameSize);
}

export function photoCategoriesForGameSize(
  gameSize: GameSize,
): readonly PhotoCategoryDefinition[] {
  const maxPhase = maxPhaseForGameSize(gameSize);
  return PHOTO_CATEGORIES.filter((category) => category.phase <= maxPhase);
}

export function photoQuestionPrompt(categoryId: PhotoCategoryId): string {
  const category = getPhotoCategory(categoryId);
  return `Send me a photo of ${category.promptNoun}.`;
}

export function photoQuestionFor(
  categoryId: PhotoCategoryId,
): { category: PhotoCategoryId; prompt: string; ruleSummary: string } {
  const category = getPhotoCategory(categoryId);
  return {
    category: categoryId,
    prompt: photoQuestionPrompt(categoryId),
    ruleSummary: category.ruleSummary,
  };
}

export function photoQuestionLabel(categoryId: PhotoCategoryId): string {
  return `Photo · ${photoCategoryLabel(categoryId).toLowerCase()}`;
}

export function readPhotoCategoryId(
  pending: PendingQuestionRecord,
): PhotoCategoryId | null {
  if (pending.toolType !== "photo") {
    return null;
  }

  const categoryId = pending.placement.metadata.photoCategoryId;
  if (typeof categoryId !== "string") {
    return null;
  }

  return categoryId as PhotoCategoryId;
}

function isPhotoPendingQuestionCountable(
  question: PendingQuestionRecord,
): boolean {
  return (
    question.status === "resolved" ||
    question.status === "answered" ||
    question.status === "pending" ||
    question.status === "walking"
  );
}

const photoCatalogHelpers = buildCatalogHelpers<PhotoCategoryId>({
  toolType: "photo",
  readOptionFromAnnotation: () => null,
  readOptionFromPending: readPhotoCategoryId,
  isPendingQuestionCountable: isPhotoPendingQuestionCountable,
});

export function usedPhotoCategoryIds(
  pendingQuestions: readonly PendingQuestionRecord[],
  exceptQuestionId?: string,
): Set<PhotoCategoryId> {
  return photoCatalogHelpers.usedOptionsFromPending(
    pendingQuestions,
    exceptQuestionId,
  );
}

export function photoCategoryUseCount(
  pendingQuestions: readonly PendingQuestionRecord[],
  categoryId: PhotoCategoryId,
  exceptQuestionId?: string,
): number {
  let count = 0;
  for (const question of pendingQuestions) {
    if (question.toolType !== "photo") {
      continue;
    }
    if (exceptQuestionId && question.id === exceptQuestionId) {
      continue;
    }
    if (
      question.status !== "resolved" &&
      question.status !== "answered" &&
      question.status !== "pending"
    ) {
      continue;
    }
    if (readPhotoCategoryId(question) === categoryId) {
      count += 1;
    }
  }
  return count;
}

export function firstAvailablePhotoCategoryId(
  gameSize: GameSize,
  usedCategories: ReadonlySet<PhotoCategoryId>,
): PhotoCategoryId | null {
  return firstUnusedCatalogOption(
    photoCategoriesForGameSize(gameSize),
    usedCategories,
    (categoryId) => isPhotoCategoryAvailableForGameSize(gameSize, categoryId),
  );
}

export function defaultPhotoCategoryId(
  gameSize: GameSize,
  usedCategories: ReadonlySet<PhotoCategoryId> = new Set(),
): PhotoCategoryId {
  return (
    firstAvailablePhotoCategoryId(gameSize, usedCategories) ??
    "any_building_from_transit_station"
  );
}

export function parsePhotoAnswer(answer: unknown): PhotoAnswer | null {
  if (!answer || typeof answer !== "object") {
    return null;
  }

  const record = answer as Record<string, unknown>;
  if (record.kind === "cannot_answer") {
    return { kind: "cannot_answer" };
  }

  if (record.kind === "sent_externally") {
    return { kind: "sent_externally" };
  }

  if (record.kind === "photo" && typeof record.storagePath === "string") {
    return { kind: "photo", storagePath: record.storagePath };
  }

  return null;
}

export function photoAnswerSelectedReply(answer: PhotoAnswer): string {
  if (answer.kind === "cannot_answer") {
    return PHOTO_CANNOT_ANSWER_ID;
  }
  if (answer.kind === "sent_externally") {
    return PHOTO_SENT_EXTERNALLY_ID;
  }
  return "photo";
}
