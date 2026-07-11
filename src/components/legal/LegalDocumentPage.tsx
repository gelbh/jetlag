import { Link } from "react-router-dom";
import { EntryScreenLayout } from "../ui/EntryScreenLayout";
import { ScreenNav } from "../ui/ScreenNav";
import {
  LEGAL_EFFECTIVE_DATE,
  LEGAL_FEEDBACK_URL,
  LEGAL_PRIVACY_PATH,
  LEGAL_TERMS_PATH,
  type LegalSection,
} from "../../domain/legal/legalContact";

interface LegalDocumentPageProps {
  title: string;
  sections: LegalSection[];
  crossLink: "privacy" | "terms";
}

const externalLinkProps = {
  target: "_blank" as const,
  rel: "noopener noreferrer",
};

export function LegalDocumentPage({
  title,
  sections,
  crossLink,
}: LegalDocumentPageProps) {
  const otherPath =
    crossLink === "privacy" ? LEGAL_TERMS_PATH : LEGAL_PRIVACY_PATH;
  const otherLabel = crossLink === "privacy" ? "Terms of Service" : "Privacy Policy";

  return (
    <EntryScreenLayout justify="center">
      <ScreenNav backTo="/" backLabel="Back" />
      <article className="mx-auto w-full max-w-prose space-y-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))]">
        <header className="space-y-2">
          <h1 className="font-display text-balance text-[clamp(2rem,10vw,3rem)] font-bold uppercase leading-[0.92] tracking-tight text-ink">
            {title}
          </h1>
          <p className="text-pretty text-sm text-ink-muted">
            Last updated {LEGAL_EFFECTIVE_DATE}
          </p>
        </header>

        {sections.map((section) => (
          <section key={section.id} className="space-y-2">
            <h2 className="font-display text-base font-semibold uppercase tracking-[0.06em] text-ink">
              {section.title}
            </h2>
            {section.paragraphs.map((paragraph) => (
              <p
                key={paragraph}
                className="text-pretty text-base leading-relaxed text-ink-secondary"
              >
                {paragraph}
              </p>
            ))}
          </section>
        ))}

        <footer className="space-y-3 border-t-2 border-border pt-4">
          <p className="text-pretty text-sm leading-relaxed text-ink-secondary">
            Questions or privacy requests?{" "}
            <a
              href={LEGAL_FEEDBACK_URL}
              {...externalLinkProps}
              className="text-highlight underline-offset-2 hover:underline"
            >
              Open a GitHub issue
            </a>
            .
          </p>
          <p className="text-sm text-ink-muted">
            See also{" "}
            <Link
              to={otherPath}
              className="text-highlight underline-offset-2 hover:underline"
            >
              {otherLabel}
            </Link>
            .
          </p>
        </footer>
      </article>
    </EntryScreenLayout>
  );
}
