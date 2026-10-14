import { Badge, Group, ScrollArea, Text, Tooltip } from "@mantine/core";
import { useReducedMotion } from "@mantine/hooks";
import { useEffect, useRef, useState } from "react";
import type {
  PendingQuestionRecord,
  PendingQuestionStatus,
} from "@/domain/session/activity/sessionChat";
import type { StatusTone } from "@/theme/adminTone";

const STATUS: Record<PendingQuestionStatus, { tone: StatusTone; word: string }> = {
  answered: { tone: "ok", word: "answered" },
  resolved: { tone: "ok", word: "answered" },
  pending: { tone: "live", word: "waiting" },
  walking: { tone: "live", word: "walking" },
  cancelled: { tone: "neutral", word: "cancelled" },
};

const STAMP = { animation: "adm-stamp 220ms cubic-bezier(0.16, 1, 0.3, 1)" };

/** An empty list this long after mount is a fresh game, not a listener still loading. */
export const LEG_STRIP_SETTLE_MS = 1500;

function idsOf(questions: readonly PendingQuestionRecord[]): ReadonlySet<string> {
  return new Set(questions.map((q) => q.id));
}

export function AdminLegStrip({ questions }: { questions: readonly PendingQuestionRecord[] }) {
  // Questions on the board at mount, or in the first snapshot, are history, not punches.
  const [baseline, setBaseline] = useState<ReadonlySet<string> | null>(() =>
    questions.length > 0 ? idsOf(questions) : null,
  );
  const reduceMotion = useReducedMotion();
  const viewportRef = useRef<HTMLDivElement>(null);
  const legs = questions.toSorted((a, b) => a.createdAt.localeCompare(b.createdAt));

  if (baseline === null && questions.length > 0) {
    setBaseline(idsOf(questions));
  }

  useEffect(() => {
    if (baseline !== null) return;
    const timer = setTimeout(() => setBaseline(new Set()), LEG_STRIP_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [baseline]);

  // Keep the newest control in view as the course grows.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (legs.length === 0 || !viewport) return;
    viewport.scrollTo?.({ left: viewport.scrollWidth, behavior: reduceMotion ? "auto" : "smooth" });
  }, [legs.length, reduceMotion]);

  return (
    <ScrollArea type="hover" scrollbarSize={4} viewportRef={viewportRef}>
      <Group role="list" aria-label="Leg strip" gap={6} wrap="nowrap" px="sm" py={6}>
        <Badge role="listitem" aria-label="Start" data-tone="neutral" miw={28}>
          S
        </Badge>
        {legs.map((q, index) => {
          const { tone, word } = STATUS[q.status];
          const stamp = baseline !== null && !baseline.has(q.id);
          return (
            <Tooltip key={q.id} label={`${q.toolType}: ${q.promptText}`}>
              <Badge
                role="listitem"
                aria-label={`Question ${index + 1}, ${q.toolType}, ${word}`}
                data-tone={tone}
                data-latest={index === legs.length - 1 || undefined}
                data-stamp={stamp || undefined}
                td={q.status === "cancelled" ? "line-through" : undefined}
                miw={28}
                style={stamp && !reduceMotion ? STAMP : undefined}
              >
                {index + 1}
              </Badge>
            </Tooltip>
          );
        })}
        {legs.length === 0 ? (
          <Text size="sm" c="dimmed">
            No questions yet
          </Text>
        ) : null}
      </Group>
    </ScrollArea>
  );
}
