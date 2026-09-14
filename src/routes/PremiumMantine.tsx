import { Anchor, Container, Stack } from "@mantine/core";
import { useAppNavigate } from "../hooks/navigation/useAppNavigate";
import { PremiumPageContent } from "./PremiumPageContent";

export function PremiumMantine() {
  const navigate = useAppNavigate();

  return (
    <Container size="sm" py="xl" data-player-ux-world="mantine">
      <Stack gap="md">
        <Anchor
          component="button"
          type="button"
          size="sm"
          onClick={() => navigate("/")}
          style={{ alignSelf: "flex-start", background: "none", border: 0 }}
        >
          Back
        </Anchor>
        <div data-player-ux-world="survey" className="flex flex-col gap-4">
          <PremiumPageContent headerOffset={false} />
        </div>
      </Stack>
    </Container>
  );
}
