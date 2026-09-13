import { Button, Container, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { Link } from "react-router-dom";
import { AppLogo } from "@/components/ui/brand/AppLogo";
import { LEGAL_APP_NAME } from "@/domain/legal/legalContact";

export function HomeMantine() {
  return (
    <Container size="sm" py="xl">
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
    </Container>
  );
}
