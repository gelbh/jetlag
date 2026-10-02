import { AppLogo } from "../brand/AppLogo";
import { EntryScreenLayout } from "../layout/EntryScreenLayout";
import { LoadingSpinnerRing } from "./LoadingSpinner";

interface BootSplashProps {
  label?: string;
}

export function BootSplash({ label = "Starting…" }: BootSplashProps) {
  return (
    <EntryScreenLayout viewport viewportLayout="center">
      <output
        className="flex min-h-[40dvh] flex-col items-center justify-center gap-4"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={label}
      >
        <AppLogo variant="lockup" size="lg" />
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinnerRing size="md" className="text-signal" />
          <span className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-field-ink-muted">
            {label}
          </span>
        </div>
      </output>
    </EntryScreenLayout>
  );
}
