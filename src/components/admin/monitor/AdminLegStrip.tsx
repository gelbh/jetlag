import { Badge, Group, ScrollArea, Text, Tooltip } from "@mantine/core";
import { useReducedMotion } from "@mantine/hooks";
import { useState } from "react";
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

export function AdminLegStrip({ questions }: { questions: readonly PendingQuestionRecord[] }) {
  // Questions already on the board when the strip mounts are history, not punches.
  const [baseline] = useState(() => new Set(questions.map((q) => q.id)));
  const reduceMotion = useReducedMotion();
  const legs = questions.toSorted((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <ScrollArea type="never" offsetScrollbars={false}>
      <Group role="list" aria-label="Leg strip" gap={6} wrap="nowrap" px="sm" py={6}>
        <Badge role="listitem" aria-label="Start" data-tone="neutral" miw={28}>
          S
        </Badge>
        {legs.map((q, index) => {
          const { tone, word } = STATUS[q.status];
          const stamp = !baseline.has(q.id);
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
