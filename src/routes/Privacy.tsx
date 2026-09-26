import { Container } from "@mantine/core";
import { LegalDocumentBody } from "@/components/legal/LegalDocumentBody";
import { EntryHeader } from "@/components/ui/entry/EntryHeader";
import { EntryScreenLayout } from "@/components/ui/layout/EntryScreenLayout";
import { PRIVACY_POLICY_SECTIONS } from "@/domain/legal/privacyPolicyContent";

export function Privacy() {
  return (
    <EntryScreenLayout justify="start" skin="plain" flush>
      <EntryHeader title="Privacy" />
      <Container
        size="xs"
        w="100%"
        px="md"
        maw={390}
        py="lg"
      >
        <LegalDocumentBody
          title="Privacy Policy"
          sections={PRIVACY_POLICY_SECTIONS}
          crossLink="privacy"
        />
      </Container>
    </EntryScreenLayout>
  );
}
