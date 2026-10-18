import { useEffect, useRef } from "react";
import { captureException } from "@/services/core/analytics/clientErrors";
import { createLoadTask } from "@/services/core/progress/loadTask";
import type { AnnotationRecord, GameArea } from "../../domain/map/annotations";
import type { DistanceUnit } from "../../domain/map/distance";
import type {
  PendingQuestionRecord,
  PendingQuestionToolType,
  RandomizedTo,
} from "../../domain/session/activity/sessionChat";
import { isPlaceholderGameArea } from "../../domain/session/join/joinPreviewGameArea";
import type { SessionRulesInput } from "../../domain/session/rules";
import {
  buildRandomizedQuestion,
  HEAVY_RANDOMIZE_TOOLS,
  type RandomizedQuestionInput,
} from "../../services/questions/buildRandomizedQuestion";

export interface UseRandomizeAutoAskParams {
  sessionId: string | undefined;
  uid: string | null;
  enabled: boolean;
  pendingQuestions: readonly PendingQuestionRecord[];
  sessionRules: SessionRulesInput;
  annotations: readonly AnnotationRecord[];
  gameArea: GameArea;
  distanceUnit: DistanceUnit;
  canSubmitQuestion: boolean;
  submitToolQuestion: (
    toolType: PendingQuestionToolType,
    input: RandomizedQuestionInput,
  ) => Promise<string | undefined>;
  onManual: (toolType: PendingQuestionToolType, label: string, presetKey?: string | number) => void;
}

function handledStorageKey(sessionId: string): string {
  return `jetlag:randomize-handled:${sessionId}`;
}

function loadHandled(storageKey: string): Set<string> {
  if (typeof sessionStorage === "undefined") {
    return new Set();
  }

  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) {
      return new Set();
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set();
    }

    return new Set(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return new Set();
  }
}

function saveHandled(storageKey: string, handled: ReadonlySet<string>): void {
  if (typeof sessionStorage === "undefined") {
    return;
  }

  try {
    sessionStorage.setItem(storageKey, JSON.stringify([...handled]));
  } catch {
    // Quota / security errors: the in-memory guard still prevents a double send in this tab.
  }
}

/** Exported for tests: the cancelled randomize this seeker still owes, or null. */
export function nextRandomizedQuestion(
  pendingQuestions: readonly PendingQuestionRecord[],
  uid: string,
  handled: ReadonlySet<string>,
): (PendingQuestionRecord & { randomizedTo: RandomizedTo }) | null {
  let newest: PendingQuestionRecord | null = null;
  for (const question of pendingQuestions) {
    if (question.createdByUid === uid && (!newest || question.createdAt > newest.createdAt)) {
      newest = question;
    }
  }
  if (!newest || newest.status !== "cancelled" || handled.has(newest.id)) {
    return null;
  }
  const { randomizedTo } = newest;
  return randomizedTo ? { ...newest, randomizedTo } : null;
}

/** On the asking seeker's device, sends the question the hider's Randomize rolled, once per original. */
export function useRandomizeAutoAsk({
  sessionId,
  uid,
  enabled,
  pendingQuestions,
  sessionRules,
  annotations,
  gameArea,
  distanceUnit,
  canSubmitQuestion,
  submitToolQuestion,
  onManual,
}: UseRandomizeAutoAskParams): void {
  const handledRef = useRef(new Set<string>());
  const canSubmitRef = useRef(canSubmitQuestion);

  useEffect(() => {
    canSubmitRef.current = canSubmitQuestion;
  }, [canSubmitQuestion]);

  useEffect(() => {
    if (!enabled || !sessionId || !uid || !canSubmitQuestion) {
      return;
    }

    const storageKey = handledStorageKey(sessionId);
    const handled = new Set([...handledRef.current, ...loadHandled(storageKey)]);
    const original = nextRandomizedQuestion(pendingQuestions, uid, handled);
    if (!original) {
      return;
    }
    if (HEAVY_RANDOMIZE_TOOLS.has(original.toolType) && isPlaceholderGameArea(gameArea)) {
      return;
    }

    handled.add(original.id);
    handledRef.current = handled;
    saveHandled(storageKey, handled);

    const fallBackToManual = () => onManual(original.toolType, original.randomizedTo.label);
    const task = HEAVY_RANDOMIZE_TOOLS.has(original.toolType)
      ? createLoadTask({ label: "Picking a random question", global: true, cancellable: false })
      : undefined;
    void buildRandomizedQuestion(original, original.randomizedTo, {
      session: sessionRules,
      annotations,
      pendingQuestions,
      gameArea,
      distanceUnit,
      task,
    })
      .then(async (built) => {
        task?.complete();
        if (built.kind === "manual") {
          onManual(original.toolType, built.label, built.presetKey);
          return;
        }
        if (!canSubmitRef.current) {
          return;
        }
        const questionId = await submitToolQuestion(built.toolType, built.input);
        if (questionId === undefined) {
          fallBackToManual();
        }
      })
      .catch((error: unknown) => {
        task?.fail(error);
        captureException(error);
        fallBackToManual();
      });
  }, [
    enabled,
    sessionId,
    uid,
    canSubmitQuestion,
    pendingQuestions,
    sessionRules,
    annotations,
    gameArea,
    distanceUnit,
    submitToolQuestion,
    onManual,
  ]);
}
