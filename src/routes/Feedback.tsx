import { Link } from "react-router-dom";
import { AppLogo } from "../components/ui/AppLogo";
import {
  githubBugReportUrl,
  githubBugsBrowseUrl,
  githubIdeasBrowseUrl,
  githubIdeaSubmitUrl,
} from "../domain/device/githubFeedback";

const externalLinkProps = {
  target: "_blank" as const,
  rel: "noopener noreferrer",
};

export function Feedback() {
  return (
    <main className="home-poster home-terminal-accent flex min-h-[100dvh] flex-col justify-between px-5 py-8">
      <div className="space-y-3 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="flex items-start justify-between gap-3">
          <AppLogo variant="lockup" size="lg" />
          <Link
            to="/"
            className="hud-chrome shrink-0 px-2.5 py-1.5 text-xs font-semibold tracking-wide text-ink-muted"
          >
            Home
          </Link>
        </div>
        <h1 className="font-display text-balance text-[clamp(2rem,10vw,3rem)] font-bold uppercase leading-[0.92] tracking-tight text-ink">
          Feedback
        </h1>
        <p className="max-w-sm text-pretty text-base leading-relaxed text-ink-muted">
          Search existing threads before posting so bugs and ideas stay in one
          place.
        </p>
      </div>

      <div className="home-enter-actions space-y-2.5 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
          Improvement ideas
        </p>
        <a
          href={githubIdeasBrowseUrl()}
          {...externalLinkProps}
          aria-label="Browse improvement ideas on GitHub"
          className="home-card-btn home-card-btn-secondary"
        >
          <span>Browse ideas</span>
          <span className="home-card-btn-hint">GitHub Discussions</span>
        </a>
        <a
          href={githubIdeaSubmitUrl()}
          {...externalLinkProps}
          aria-label="Suggest an improvement on GitHub"
          className="home-card-btn home-card-btn-primary"
        >
          <span>Suggest improvement</span>
          <span className="home-card-btn-hint">New idea thread</span>
        </a>

        <p className="pt-2 font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
          Bug reports
        </p>
        <a
          href={githubBugsBrowseUrl()}
          {...externalLinkProps}
          aria-label="Browse bug reports on GitHub"
          className="home-card-btn home-card-btn-secondary"
        >
          <span>Browse bugs</span>
          <span className="home-card-btn-hint">GitHub Issues</span>
        </a>
        <a
          href={githubBugReportUrl()}
          {...externalLinkProps}
          aria-label="Report a bug on GitHub"
          className="home-card-btn home-card-btn-primary"
        >
          <span>Report a bug</span>
          <span className="home-card-btn-hint">Bug report form</span>
        </a>
      </div>
    </main>
  );
}
