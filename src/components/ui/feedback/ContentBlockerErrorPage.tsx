import { AppErrorPage } from "./AppErrorPage";

function allowlistHost(): string {
  if (typeof window === "undefined") {
    return "this site";
  }
  return window.location.host || "this site";
}

export function ContentBlockerErrorPage() {
  const host = allowlistHost();

  return (
    <AppErrorPage
      title="Content blocker detected"
      message="This app needs Google security scripts (App Check). Content blockers on Safari often block them and break sign-in, join, and premium."
      assertive
      detail={
        <ol className="mx-auto max-w-sm list-decimal space-y-2 pl-5 text-left text-sm leading-relaxed text-ink-dim">
          <li>
            On iPhone or iPad: Settings → Apps → Safari → Content Blockers —
            turn blockers off, or allow this site.
          </li>
          <li>
            On Mac Safari: Safari → Settings → Websites (or Extensions) — allow
            this site, or disable the blocker.
          </li>
          <li>
            Other browsers: open your ad/content-blocker settings and allow{" "}
            <span className="whitespace-nowrap">{host}</span>.
          </li>
          <li>Come back here and tap Try again.</li>
        </ol>
      }
      primaryAction={{
        label: "Try again",
        onClick: () => window.location.reload(),
      }}
    />
  );
}
