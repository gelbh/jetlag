import { useEffect, useState } from "react";
import type { SessionRulesInput } from "../../domain/sessionRules";
import {
  selectPrimaryQuestionTimer,
  type ActiveQuestionTimer,
} from "../../domain/questionTimerDisplay";

interface QuestionAlertBannerProps {
  pendingQuestions: readonly import("../../domain/sessionChat").PendingQuestionRecord[];
  sessionRules: SessionRulesInput;
}

export function QuestionAlertBanner({
  pendingQuestions,
  sessionRules,
}: QuestionAlertBannerProps) {
  const [active, setActive] = useState<ActiveQuestionTimer | null>(null);

  useEffect(() => {
    const refresh = () => {
      setActive(selectPrimaryQuestionTimer(pendingQuestions, sessionRules));
    };

    refresh();
    const interval = window.setInterval(refresh, 1000);
    return () => window.clearInterval(interval);
  }, [sessionRules, pendingQuestions]);

  if (!active) {
    return null;
  }

  return (
    <p
      className="map-float-alert pointer-events-auto mx-3 mt-1.5 border-2 border-highlight/50 bg-highlight-soft px-3 py-2 text-center text-sm font-semibold uppercase tracking-wide text-pretty text-highlight"
      role="status"
      aria-live="polite"
    >
      {active.toolLabel} · {active.countdownLabel}
    </p>
  );
}
