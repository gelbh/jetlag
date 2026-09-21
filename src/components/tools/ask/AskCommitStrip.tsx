/**
 * AskCommitStrip — muted until canCommit; Survey flag Button when armed.
 * Flag on: iOS continuous filled / gray controls.
 * Spec: ask-surface-kit-design rev 2026-08-05b.
 */
import { Button as MantineButton } from "@mantine/core";
import { Button } from "@/components/ui/button";
import {
  iosFilledStyles,
  iosGrayStyles,
} from "@/components/ui/apple/iosEntryChrome";
import { usePlayerUiMantine } from "@/hooks/feature/usePlayerUiMantine";
import { AskInlineError } from "@/components/tools/shared/readout/AskInlineError";

type AskCommitStripProps = {
  canCommit: boolean;
  label: string;
  onCommit: () => void;
  isSubmitting?: boolean;
  error?: string | null;
};

export function AskCommitStrip({
  canCommit,
  label,
  onCommit,
  isSubmitting = false,
  error = null,
}: AskCommitStripProps) {
  const mantinePlayerUi = usePlayerUiMantine();
  const armed = canCommit && !isSubmitting;
  const errorId = "ask-commit-strip-error";
  const buttonLabel = isSubmitting ? "Sending…" : label;

  return (
    <div
      data-testid="ask-commit-strip"
      className="ask-commit-strip pointer-events-auto"
      {...(mantinePlayerUi ? { "data-player-ux-world": "mantine" } : {})}
    >
      {mantinePlayerUi ? (
        <MantineButton
          type="button"
          fullWidth
          data-armed={armed ? "true" : "false"}
          disabled={!armed}
          aria-busy={isSubmitting || undefined}
          aria-describedby={error ? errorId : undefined}
          onClick={onCommit}
          className="ask-commit-strip__btn"
          styles={armed ? iosFilledStyles : iosGrayStyles}
        >
          {buttonLabel}
        </MantineButton>
      ) : (
        <Button
          type="button"
          variant={armed ? "flag" : "default"}
          data-armed={armed ? "true" : "false"}
          disabled={!armed}
          aria-busy={isSubmitting || undefined}
          aria-describedby={error ? errorId : undefined}
          onClick={onCommit}
          className="ask-commit-strip__btn w-full min-h-12 font-display text-xs font-semibold uppercase tracking-[0.06em]"
        >
          {buttonLabel}
        </Button>
      )}
      {error ? <AskInlineError id={errorId} message={error} /> : null}
    </div>
  );
}
