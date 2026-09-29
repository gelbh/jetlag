import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  selectFailedEntries,
  useWriteLedgerStore,
  type WriteLabel,
} from "@/state/writeLedgerStore";
import { showEphemeralPlayerNotification } from "@/components/ui/notifications/showEphemeralPlayerNotification";

const LABEL_COPY: Partial<Record<WriteLabel, string>> = {
  "chat.send": "Your message",
  "question.ask": "Your question",
  "question.answer": "Your answer",
  "found.request": "Found-hider request",
  "found.confirm": "Found-hider confirmation",
  "endgame.start": "End Game start",
  "timetrap.place": "Time trap",
  "move.intent": "Move",
};

/** Surfaces server rejections of queued writes so nothing drops silently. */
export function WriteFailureNotifier() {
  const failed = useWriteLedgerStore(useShallow(selectFailedEntries));
  const dismiss = useWriteLedgerStore((state) => state.dismiss);

  useEffect(() => {
    for (const entry of failed) {
      showEphemeralPlayerNotification({
        id: `write-failed:${entry.id}`,
        title: `${LABEL_COPY[entry.label] ?? "A change"} didn't sync`,
        message:
          "The game rejected it after reconnecting. Check the current state and try again.",
      });
      dismiss(entry.id);
    }
  }, [failed, dismiss]);

  return null;
}
