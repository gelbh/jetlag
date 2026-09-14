import { Anchor, Container } from "@mantine/core";
import { Link } from "react-router-dom";
import { LegalDocumentPage } from "../components/legal/LegalDocumentPage";
import { TERMS_OF_SERVICE_SECTIONS } from "../domain/legal/termsOfServiceContent";

export function TermsMantine() {
  return (
    <Container size="sm" py="xl" data-player-ux-world="mantine">
      <Anchor component={Link} to="/" size="sm" mb="md" display="inline-block">
        Back
      </Anchor>
      <LegalDocumentPage
        title="Terms of Service"
        sections={TERMS_OF_SERVICE_SECTIONS}
        crossLink="terms"
        layout="content"
      />
    </Container>
  );
}
