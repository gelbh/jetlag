import { Container } from "@mantine/core";
import { LegalDocumentBody } from "@/components/legal/LegalDocumentBody";
import { EntryHeader } from "@/components/ui/entry/EntryHeader";
import { EntryScreenLayout } from "@/components/ui/layout/EntryScreenLayout";
import { TERMS_OF_SERVICE_SECTIONS } from "@/domain/legal/termsOfServiceContent";

export function Terms() {
  return (
    <EntryScreenLayout justify="start" skin="plain" flush>
      <EntryHeader title="Terms" />
      <Container
        size="xs"
        w="100%"
        px="md"
        maw={390}
        py="lg"
      >
        <LegalDocumentBody
          title="Terms of Service"
          sections={TERMS_OF_SERVICE_SECTIONS}
          crossLink="terms"
        />
      </Container>
    </EntryScreenLayout>
  );
}
