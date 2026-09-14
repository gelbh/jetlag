import { Container } from "@mantine/core";
import { LegalDocumentIosBody } from "@/components/legal/LegalDocumentIosBody";
import { IosEntryHeader } from "@/components/ui/apple/IosEntryHeader";
import { EntryScreenLayout } from "@/components/ui/layout/EntryScreenLayout";
import { PRIVACY_POLICY_SECTIONS } from "@/domain/legal/privacyPolicyContent";

export function PrivacyMantine() {
  return (
    <EntryScreenLayout justify="start" skin="plain" flush>
      <IosEntryHeader title="Privacy" />
      <Container
        size="xs"
        w="100%"
        px="md"
        maw={390}
        py="lg"
        data-player-ux-world="mantine"
      >
        <LegalDocumentIosBody
          title="Privacy Policy"
          sections={PRIVACY_POLICY_SECTIONS}
          crossLink="privacy"
        />
      </Container>
    </EntryScreenLayout>
  );
}
