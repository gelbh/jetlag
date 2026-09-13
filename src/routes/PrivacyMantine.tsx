import { Container } from "@mantine/core";
import { LegalDocumentPage } from "../components/legal/LegalDocumentPage";
import { PRIVACY_POLICY_SECTIONS } from "../domain/legal/privacyPolicyContent";

export function PrivacyMantine() {
  return (
    <Container size="sm" py="xl" data-player-ux-world="mantine">
      <LegalDocumentPage
        title="Privacy Policy"
        sections={PRIVACY_POLICY_SECTIONS}
        crossLink="privacy"
      />
    </Container>
  );
}
