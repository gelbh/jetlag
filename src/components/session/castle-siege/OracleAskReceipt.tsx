import { EntryAsyncButton } from "@/components/ui/entry/EntryAsyncButton";
import {
  type CastleSiegeOracleReceipt,
  formatOracleAskReceiptLabel,
} from "@/domain/session/castleSiege/oracleAskReceipt";

export type OracleAskReceiptProps = {
  receipt: CastleSiegeOracleReceipt;
  busy?: boolean;
  onConfirmSend: () => void;
  onCancel?: () => void;
};

export function OracleAskReceipt({
  receipt,
  busy = false,
  onConfirmSend,
  onCancel,
}: OracleAskReceiptProps) {
  const label = formatOracleAskReceiptLabel(receipt);

  return (
    <section
      aria-label="Oracle ask receipt"
      data-testid="castle-siege-oracle-ask-receipt"
      className="rounded-md border px-3 py-2.5"
      style={{
        borderColor: "var(--color-rule)",
        background: "oklch(from var(--color-canvas) l c h / 92%)",
        color: "var(--color-field-ink)",
        boxShadow: "var(--shadow-hud-float)",
      }}
    >
      <p
        className="m-0 text-[0.6875rem] font-semibold uppercase tracking-[0.08em]"
        style={{ color: "var(--color-flag)" }}
      >
        Oracle receipt
      </p>
      <p
        className="m-0 mt-2 text-sm font-medium"
        data-testid="castle-siege-oracle-ask-receipt-answer"
        style={{ color: "var(--color-signal)" }}
      >
        {label}
      </p>
      <div className="mt-2 flex flex-col gap-2">
        <EntryAsyncButton
          type="button"
          busy={busy}
          idleLabel="Confirm send"
          busyLabel="Sending…"
          fullWidth
          onClick={onConfirmSend}
        />
        {onCancel ? (
          <button
            type="button"
            className="min-h-11 rounded-sm border text-sm"
            style={{
              borderColor: "var(--color-rule)",
              background: "transparent",
              color: "var(--color-field-ink-muted)",
            }}
            onClick={onCancel}
            disabled={busy}
          >
            Back
          </button>
        ) : null}
      </div>
    </section>
  );
}
