import { Link } from "react-router-dom";
import { LEGAL_PRIVACY_PATH, LEGAL_TERMS_PATH } from "../../domain/legal/legalContact";

export function LegalInlineLinks() {
  return (
    <p className="text-pretty text-sm leading-relaxed text-ink-muted">
      See{" "}
      <Link
        to={LEGAL_TERMS_PATH}
        className="text-ink-secondary underline-offset-2 hover:text-highlight hover:underline"
      >
        Terms
      </Link>{" "}
      and{" "}
      <Link
        to={LEGAL_PRIVACY_PATH}
        className="text-ink-secondary underline-offset-2 hover:text-highlight hover:underline"
      >
        Privacy
      </Link>
      .
    </p>
  );
}
