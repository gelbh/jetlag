import { Container } from "@mantine/core";
import { LegalDocumentPage } from "../components/legal/LegalDocumentPage";
import { TERMS_OF_SERVICE_SECTIONS } from "../domain/legal/termsOfServiceContent";

export function TermsMantine() {
  return (
    <Container size="sm" py="xl" data-player-ux-world="mantine">
      <LegalDocumentPage
        title="Terms of Service"
        sections={TERMS_OF_SERVICE_SECTIONS}
        crossLink="terms"
      />
    </Container>
  );
}
