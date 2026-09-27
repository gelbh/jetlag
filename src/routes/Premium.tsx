import { Container } from "@mantine/core";
import { EntryHeader } from "@/components/ui/entry/EntryHeader";
import { EntryScreenLayout } from "@/components/ui/layout/EntryScreenLayout";
import { PremiumPageContent } from "./PremiumPageContent";

export function Premium() {
  return (
    <EntryScreenLayout justify="start" skin="plain" flush>
      <EntryHeader title="Premium" />
      <Container size="xs" w="100%" px="md" maw={390} py="lg">
        <PremiumPageContent />
      </Container>
    </EntryScreenLayout>
  );
}
