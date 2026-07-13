import { AppLink } from "../navigation/AppLink";
import { LEGAL_PRIVACY_PATH, LEGAL_TERMS_PATH } from "../../domain/legal/legalContact";

export function LegalInlineLinks() {
  return (
    <p className="text-pretty text-sm leading-relaxed text-ink-muted">
      See{" "}
      <AppLink
        to={LEGAL_TERMS_PATH}
        className="text-ink-secondary underline-offset-2 hover:text-highlight hover:underline"
      >
        Terms
      </AppLink>{" "}
      and{" "}
      <AppLink
        to={LEGAL_PRIVACY_PATH}
        className="text-ink-secondary underline-offset-2 hover:text-highlight hover:underline"
      >
        Privacy
      </AppLink>
      .
    </p>
  );
}
