import { Anchor, Container } from "@mantine/core";
import { Link } from "react-router-dom";
import { LegalDocumentPage } from "../components/legal/LegalDocumentPage";
import { PRIVACY_POLICY_SECTIONS } from "../domain/legal/privacyPolicyContent";

export function PrivacyMantine() {
  return (
    <Container size="sm" py="xl" data-player-ux-world="mantine">
      <Anchor component={Link} to="/" size="sm" mb="md" display="inline-block">
        Back
      </Anchor>
      <LegalDocumentPage
        title="Privacy Policy"
        sections={PRIVACY_POLICY_SECTIONS}
        crossLink="privacy"
        layout="content"
      />
    </Container>
  );
}
