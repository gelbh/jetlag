import {
  Button,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { Link } from "react-router-dom";
import { AppLogo } from "@/components/ui/brand/AppLogo";
import { LEGAL_APP_NAME } from "@/domain/legal/legalContact";

export function HomeMantine() {
  return (
    <Container size="sm" py="xl">
      {/* impeccable-variants-start eb3575b4 */}
      <div
        data-impeccable-variants="eb3575b4"
        data-impeccable-variant-count="1"
        style={{ display: "contents" }}
      >
        <div data-impeccable-variant="original" style={{ display: "none" }}>
          <Paper p="lg" radius="md" withBorder>
            <Stack gap="md">
              <AppLogo />
              <Title order={1}>{LEGAL_APP_NAME}</Title>
              <Text c="dimmed">Mantine player UI (flag on)</Text>
              <Group grow>
                <Button component={Link} to="/join" variant="filled">
                  Join
                </Button>
                <Button component={Link} to="/create" variant="light">
                  Create
                </Button>
              </Group>
              <Button component={Link} to="/presets" variant="default">
                Presets
              </Button>
            </Stack>
          </Paper>
        </div>
        {/* Variants: insert below this line */}
        <style data-impeccable-css="eb3575b4">{`
          @scope ([data-impeccable-variant="1"]) {
            :scope > [data-with-border] {
              background-color: var(--color-canvas) !important;
              background-image: none !important;
            }
          }
        `}</style>
        <div data-impeccable-variant="1">
          <Paper
            p="lg"
            radius="md"
            withBorder
            style={{ backgroundColor: "var(--color-canvas)" }}
          >
            <Stack gap="md">
              <AppLogo />
              <Title order={1}>{LEGAL_APP_NAME}</Title>
              <Text c="dimmed">Mantine player UI (flag on)</Text>
              <Group grow>
                <Button component={Link} to="/join" variant="filled">
                  Join
                </Button>
                <Button component={Link} to="/create" variant="light">
                  Create
                </Button>
              </Group>
              <Button component={Link} to="/presets" variant="default">
                Presets
              </Button>
            </Stack>
          </Paper>
        </div>
      </div>
      {/* impeccable-variants-end eb3575b4 */}
    </Container>
  );
}
