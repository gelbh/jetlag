import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  selectFailedEntries,
  useWriteLedgerStore,
  type WriteLabel,
} from "@/state/writeLedgerStore";
import { showEphemeralPlayerNotification } from "@/components/ui/notifications/showEphemeralPlayerNotification";

const LABEL_COPY: Record<WriteLabel, string> = {
  "chat.send": "Your message",
  "question.ask": "Your question",
  "question.answer": "Your answer",
  "question.cancel": "Question cancel",
  "endgame.start": "End Game start",
  "found.request": "Found-hider request",
  "found.confirm": "Found-hider confirmation",
  "found.decline": "Found-hider decline",
  "timetrap.place": "Time trap",
  "economy.update": "Card change",
  "session.end": "Ending the game",
  "move.intent": "Move",
  "zone.write": "Hiding zone",
  "system.message": "Game update",
  "timer.update": "Timer change",
  "restored": "An earlier change",
};

/** Surfaces server rejections of queued writes so nothing drops silently. Mount once (App root). */
export function WriteFailureNotifier() {
  const failed = useWriteLedgerStore(useShallow(selectFailedEntries));
  const remove = useWriteLedgerStore((state) => state.remove);

  useEffect(() => {
    for (const entry of failed) {
      showEphemeralPlayerNotification({
        id: `write-failed:${entry.id}`,
        title: `${LABEL_COPY[entry.label]} didn't sync`,
        message:
          "The game rejected it after reconnecting. Check the current state and try again.",
      });
      remove(entry.id);
    }
  }, [failed, remove]);

  return null;
}
