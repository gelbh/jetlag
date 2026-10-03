import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { showEphemeralPlayerNotification } from "@/components/ui/notifications/showEphemeralPlayerNotification";
import {
  selectFailedEntries,
  useWriteLedgerStore,
  type WriteLabel,
} from "@/state/writeLedgerStore";

const LABEL_COPY: Record<WriteLabel, string> = {
  "chat.send": "Your message",
  "question.ask": "Your question",
  "question.answer": "Your answer",
  "question.cancel": "Cancelling your question",
  "endgame.start": "Starting the End Game",
  "found.request": "Your found request",
  "found.confirm": "Confirming the find",
  "found.decline": "Declining the find",
  "timetrap.place": "Time trap",
  "economy.update": "Card change",
  "session.end": "Ending the game",
  "move.intent": "Move",
  "zone.write": "Hiding zone",
  "system.message": "Game update",
  "timer.update": "Timer change",
  restored: "An earlier change",
};

/** Surfaces server rejections of queued writes so nothing drops silently. Mount once (App root). */
export function WriteFailureNotifier() {
  const failed = useWriteLedgerStore(useShallow(selectFailedEntries));
  const remove = useWriteLedgerStore((state) => state.remove);

  useEffect(() => {
    if (failed.length === 0) {
      return;
    }
    // A reconnect can reject several queued writes at once: one toast, not a stack.
    const [first] = failed;
    showEphemeralPlayerNotification({
      id: `write-failed:${first!.id}`,
      title:
        failed.length === 1
          ? `${LABEL_COPY[first!.label]} didn't sync`
          : `${failed.length} changes didn't sync`,
      message: "The game didn't accept it. Check the current state and try again.",
    });
    for (const entry of failed) {
      remove(entry.id);
    }
  }, [failed, remove]);

  return null;
}
