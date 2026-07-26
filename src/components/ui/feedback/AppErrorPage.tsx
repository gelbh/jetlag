import type { ReactNode } from "react";
import { AppLink } from "../../navigation/AppLink";
import { AppLogo } from "../brand/AppLogo";
import { EntryScreenLayout } from "../layout/EntryScreenLayout";

export type AppErrorPrimaryAction = {
  label: string;
  onClick: () => void;
};

export type AppErrorSecondaryAction = {
  label: string;
  to: string;
};

export type AppErrorPageProps = {
  title: string;
  message: string;
  detail?: ReactNode;
  primaryAction?: AppErrorPrimaryAction | null;
  secondaryAction?: AppErrorSecondaryAction | null;
  /** Use for crash fallbacks; omit on navigational 404. */
  assertive?: boolean;
};

export function AppErrorPage({
  title,
  message,
  detail,
  primaryAction = null,
  secondaryAction = null,
  assertive = false,
}: AppErrorPageProps) {
  const body = (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5 text-center">
      <AppLogo variant="lockup" size="md" className="justify-center" />
      <div className="space-y-2">
        <h1 className="font-display text-balance text-[clamp(1.75rem,7vw,2.5rem)] font-bold uppercase leading-[0.95] tracking-tight text-ink">
          {title}
        </h1>
        {message ? (
          <p className="text-pretty text-base leading-relaxed text-ink-dim">
            {message}
          </p>
        ) : null}
      </div>
      {detail ? <div className="w-full">{detail}</div> : null}
      {primaryAction || secondaryAction ? (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {primaryAction ? (
            <button
              type="button"
              className="btn-primary px-4 py-2 text-sm"
              onClick={primaryAction.onClick}
            >
              {primaryAction.label}
            </button>
          ) : null}
          {secondaryAction ? (
            <AppLink
              to={secondaryAction.to}
              className="btn-secondary border border-border px-4 py-2 text-sm"
            >
              {secondaryAction.label}
            </AppLink>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  return (
    <EntryScreenLayout justify="center">
      {assertive ? <div role="alert">{body}</div> : body}
    </EntryScreenLayout>
  );
}
