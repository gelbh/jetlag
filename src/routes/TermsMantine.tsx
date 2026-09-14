import { Container } from "@mantine/core";
import { LegalDocumentIosBody } from "@/components/legal/LegalDocumentIosBody";
import { IosEntryHeader } from "@/components/ui/apple/IosEntryHeader";
import { EntryScreenLayout } from "@/components/ui/layout/EntryScreenLayout";
import { TERMS_OF_SERVICE_SECTIONS } from "@/domain/legal/termsOfServiceContent";

export function TermsMantine() {
  return (
    <EntryScreenLayout justify="start" skin="plain" flush>
      <IosEntryHeader title="Terms" />
      <Container
        size="xs"
        w="100%"
        px="md"
        maw={390}
        py="lg"
        data-player-ux-world="mantine"
      >
        <LegalDocumentIosBody
          title="Terms of Service"
          sections={TERMS_OF_SERVICE_SECTIONS}
          crossLink="terms"
        />
      </Container>
    </EntryScreenLayout>
  );
}
