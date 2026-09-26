import { LegalDocumentBody } from "@/components/legal/LegalDocumentBody";
import { EntryRouteShell } from "@/components/ui/entry/EntryRouteShell";
import { TERMS_OF_SERVICE_SECTIONS } from "@/domain/legal/termsOfServiceContent";

export function Terms() {
  return (
    <EntryRouteShell title="Terms">
      <LegalDocumentBody
        title="Terms of Service"
        sections={TERMS_OF_SERVICE_SECTIONS}
        crossLink="terms"
      />
    </EntryRouteShell>
  );
}
