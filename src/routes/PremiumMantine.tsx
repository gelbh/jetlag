import { Anchor, Container, Stack } from "@mantine/core";
import { Link } from "react-router-dom";
import { PremiumPageContent } from "./PremiumPageContent";

export function PremiumMantine() {
  return (
    <Container size="sm" py="xl" data-player-ux-world="mantine">
      <Stack gap="md">
        <Anchor component={Link} to="/" size="sm">
          Back
        </Anchor>
        <div data-player-ux-world="survey" className="flex flex-col gap-4">
          <PremiumPageContent />
        </div>
      </Stack>
    </Container>
  );
}
