import { type ReactNode, useState } from "react";
import { AdminConfirm } from "../../components/admin/shared/AdminConfirm";

export type ModerationAction = "end" | "resetBoard" | "cleanupCode";

function confirmCopy(action: ModerationAction, target: string) {
  switch (action) {
    case "end":
      return {
        title: "Start the end game?",
        consequence: `Start the end game for ${target} now?`,
        confirmLabel: "Start end game",
        busyLabel: "Starting…",
      };
    case "resetBoard":
      return {
        title: "Reset the board?",
        consequence: `Clear the board for ${target}? Active annotations are removed, open questions are cancelled and the timer goes back to zero.`,
        confirmLabel: `Reset board for ${target}`,
        busyLabel: "Resetting…",
      };
    case "cleanupCode":
      return {
        title: "End and retire the join code?",
        consequence: `End ${target} and retire its join code? The session is marked ended.`,
        confirmLabel: `End and retire ${target}`,
        busyLabel: "Ending…",
      };
  }
}

/** One confirm step shared by the rail Mod tab and the compact moderation overlay. */
export function useModerationConfirm({
  sessionCode,
  run,
}: {
  sessionCode: string | null;
  run: (action: ModerationAction) => Promise<void>;
}): { request: (action: ModerationAction) => void; confirm: ReactNode } {
  const [pending, setPending] = useState<ModerationAction | null>(null);
  const copy = pending ? confirmCopy(pending, sessionCode ?? "this session") : null;

  const confirm = (
    <AdminConfirm
      opened={pending !== null}
      title={copy?.title ?? ""}
      consequence={copy?.consequence ?? ""}
      confirmLabel={copy?.confirmLabel ?? ""}
      busyLabel={copy?.busyLabel}
      destructive
      onConfirm={async () => {
        if (pending) await run(pending);
      }}
      onClose={() => setPending(null)}
    />
  );

  return { request: setPending, confirm };
}
