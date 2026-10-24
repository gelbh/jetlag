import { Box, ScrollArea, Text, Tooltip } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import type {
  PendingQuestionRecord,
  PendingQuestionStatus,
} from "@/domain/session/activity/sessionChat";
import { useMotionProfile } from "@/hooks/motion/useMotionProfile";
import type { StatusTone } from "@/theme/adminTone";
import { DESK_HAIRLINE, RAISED_BG } from "../shared/adminSurface";

const STATUS: Record<PendingQuestionStatus, { tone: StatusTone; word: string; label: string }> = {
  answered: { tone: "ok", word: "answered", label: "Answered" },
  resolved: { tone: "ok", word: "answered", label: "Answered" },
  pending: { tone: "live", word: "waiting", label: "Waiting" },
  walking: { tone: "live", word: "walking", label: "Walking" },
  cancelled: { tone: "neutral", word: "cancelled", label: "Cancelled" },
};

const PILL_BACKGROUND: Record<StatusTone, string> = {
  ok: "var(--color-trail-soft)",
  live: "var(--color-signal-soft)",
  info: "var(--color-brand-blue-soft)",
  mispunch: "var(--color-halt-soft)",
  neutral: RAISED_BG,
};

const STAMP = { animation: "admin-stamp 220ms cubic-bezier(0.16, 1, 0.3, 1)" };

/** An empty list this long after mount is a fresh game, not a listener still loading. */
export const LEG_STRIP_SETTLE_MS = 1500;

const PROMPT_LIMIT = 28;

function idsOf(questions: readonly PendingQuestionRecord[]): ReadonlySet<string> {
  return new Set(questions.map((q) => q.id));
}

function toolLabel(toolType: string): string {
  const text = toolType.replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function shortPrompt(text: string): string {
  return text.length > PROMPT_LIMIT ? `${text.slice(0, PROMPT_LIMIT - 1)}…` : text;
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
    <Box
      data-testid="admin-question-strip"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: 6,
        pointerEvents: "auto",
        background: "color-mix(in oklch, var(--color-canvas) 90%, transparent)",
        backdropFilter: "blur(20px) saturate(1.4)",
        border: DESK_HAIRLINE,
        borderRadius: 16,
      }}
    >
      <Box
        component="span"
        style={{
          padding: "0 6px",
          flex: "none",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--color-ink-muted)",
        }}
      >
        Questions
      </Box>
      <ScrollArea type="hover" scrollbarSize={4} viewportRef={viewportRef} style={{ flex: 1 }}>
        <Box
          role="list"
          aria-label="Leg strip"
          style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "nowrap" }}
        >
          {legs.map((q, index) => {
            const { tone, word, label } = STATUS[q.status];
            const stamp = baseline !== null && !baseline.has(q.id);
            const latest = index === legs.length - 1;
            return (
              <Tooltip key={q.id} label={`${q.toolType}: ${q.promptText}`}>
                <Box
                  role="listitem"
                  aria-label={`Question ${index + 1}, ${q.toolType}, ${word}: ${q.promptText}`}
                  data-tone={tone}
                  data-latest={latest || undefined}
                  data-stamp={stamp || undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flex: "none",
                    padding: "6px 10px",
                    borderRadius: 10,
                    fontSize: 13,
                    whiteSpace: "nowrap",
                    color: "var(--color-ink)",
                    background: PILL_BACKGROUND[tone],
                    textDecoration: q.status === "cancelled" ? "line-through" : undefined,
                    boxShadow: latest ? "inset 0 0 0 1px var(--color-flag)" : undefined,
                    ...(stamp && decorativeAnimate ? STAMP : null),
                  }}
                >
                  <Box component="b" style={{ color: "var(--color-flag)", fontWeight: 600 }}>
                    {toolLabel(q.toolType)}
                  </Box>
                  <span>
                    {shortPrompt(q.promptText)} · {label}
                  </span>
                </Box>
              </Tooltip>
            );
          })}
          {legs.length === 0 ? (
            <Text size="sm" c="var(--color-ink-muted)" style={{ whiteSpace: "nowrap" }}>
              No questions yet
            </Text>
          ) : null}
        </Box>
      </ScrollArea>
    </Box>
  );
}
