import { useEffect, useState } from "react";
import type { SessionRulesInput } from "../../domain/session/sessionRules";
import {
  selectPrimaryQuestionTimer,
  type ActiveQuestionTimer,
} from "../../domain/questions";
import { HudBanner } from "../ui/HudBanner";
import { MapFloatAlert } from "../ui/MapFloatAlert";

interface QuestionAlertBannerProps {
  pendingQuestions: readonly import("../../domain/session/sessionChat").PendingQuestionRecord[];
  sessionRules: SessionRulesInput;
}

export function QuestionAlertBanner({
  pendingQuestions,
  sessionRules,
}: QuestionAlertBannerProps) {
  const [visible, setVisible] = useState(false);
  const [content, setContent] = useState<ActiveQuestionTimer | null>(null);

  useEffect(() => {
    const refresh = () => {
      const next = selectPrimaryQuestionTimer(pendingQuestions, sessionRules);
      setVisible(Boolean(next));
      if (next) {
        setContent(next);
      }
    };

    refresh();
    const interval = window.setInterval(refresh, 1000);
    return () => window.clearInterval(interval);
  }, [sessionRules, pendingQuestions]);

  return (
    <HudBanner
      visible={visible}
      onDismiss={() => setContent(null)}
      className="pointer-events-auto mx-3 mt-1.5"
    >
      {content ? (
        <MapFloatAlert>
          {content.toolLabel} · {content.countdownLabel}
        </MapFloatAlert>
      ) : null}
    </HudBanner>
  );
}
