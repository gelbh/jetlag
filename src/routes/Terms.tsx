import { LegalDocumentPage } from "../components/legal/LegalDocumentPage";
import { TERMS_OF_SERVICE_SECTIONS } from "../domain/legal/termsOfServiceContent";

export function Terms() {
  return (
    <LegalDocumentPage
      title="Terms of Service"
      sections={TERMS_OF_SERVICE_SECTIONS}
      crossLink="terms"
    />
  );
}
