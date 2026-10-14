import { Badge, Group, ScrollArea, Text, Tooltip } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import type {
  PendingQuestionRecord,
  PendingQuestionStatus,
} from "@/domain/session/activity/sessionChat";
import { useMotionProfile } from "@/hooks/motion/useMotionProfile";
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

export function AdminLegStrip({
  sessionId,
  questions,
}: {
  sessionId: string;
  questions: readonly PendingQuestionRecord[];
}) {
  // The question listener hands back the previous course for a render after a switch.
  const course = questions.filter((q) => q.sessionId === sessionId);
  // Questions on the board at mount, or in the first snapshot, are history, not punches.
  const [baseline, setBaseline] = useState<ReadonlySet<string> | null>(() =>
    course.length > 0 ? idsOf(course) : null,
  );
  const { decorativeAnimate } = useMotionProfile();
  const viewportRef = useRef<HTMLDivElement>(null);
  const legs = course.toSorted((a, b) => a.createdAt.localeCompare(b.createdAt));

  if (baseline === null && course.length > 0) {
    setBaseline(idsOf(course));
  }

  useEffect(() => {
    if (baseline !== null) return;
    const timer = setTimeout(() => setBaseline(new Set()), LEG_STRIP_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [baseline]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (legs.length === 0 || !viewport) return;
    viewport.scrollTo?.({
      left: viewport.scrollWidth,
      behavior: decorativeAnimate ? "smooth" : "auto",
    });
  }, [legs.length, decorativeAnimate]);

  return (
    <ScrollArea type="hover" scrollbarSize={4} viewportRef={viewportRef}>
      <Group role="list" aria-label="Leg strip" gap={6} wrap="nowrap" px="sm" py={6}>
        <Badge role="listitem" aria-label="Start" data-tone="neutral" miw={28} px={6} flex="none">
          S
        </Badge>
        {legs.map((q, index) => {
          const { tone, word } = STATUS[q.status];
          const stamp = baseline !== null && !baseline.has(q.id);
          return (
            <Tooltip key={q.id} label={`${q.toolType}: ${q.promptText}`}>
              <Badge
                role="listitem"
                aria-label={`Question ${index + 1}, ${q.toolType}, ${word}: ${q.promptText}`}
                data-tone={tone}
                data-latest={index === legs.length - 1 || undefined}
                data-stamp={stamp || undefined}
                td={q.status === "cancelled" ? "line-through" : undefined}
                miw={28}
                px={6}
                flex="none"
                style={stamp && decorativeAnimate ? STAMP : undefined}
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
