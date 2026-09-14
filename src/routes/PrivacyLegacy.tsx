import { LegalDocumentPage } from "../components/legal/LegalDocumentPage";
import { PRIVACY_POLICY_SECTIONS } from "../domain/legal/privacyPolicyContent";

export function PrivacyLegacy() {
  return (
    <LegalDocumentPage
      title="Privacy Policy"
      sections={PRIVACY_POLICY_SECTIONS}
      crossLink="privacy"
    />
  );
}
