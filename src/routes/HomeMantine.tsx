import {
  Alert,
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
import { BootSplash } from "@/components/ui/feedback/BootSplash";
import { LEGAL_APP_NAME } from "@/domain/legal/legalContact";
import { playerRoleLabel } from "@/domain/session/players/playerRole";
import { useAuthBootstrapReady } from "@/hooks/app/useAuthBootstrapReady";
import { useContinueActiveSession } from "@/hooks/session/useContinueActiveSession";
import { useRouteTransition } from "@/navigation/useRouteTransition";
import { isFirebaseConfigured } from "@/services/core/firebase/firebase";

export function HomeMantine() {
  const { session, myRole, continueError, continuing, handleContinue } =
    useContinueActiveSession();
  const authBootstrapReady = useAuthBootstrapReady();
  const { phase: routeTransitionPhase } = useRouteTransition();

  if (
    isFirebaseConfigured() &&
    !authBootstrapReady &&
    routeTransitionPhase === "idle"
  ) {
    return <BootSplash label="Starting…" />;
  }

  return (
    <Container size="sm" py="xl">
      <Paper p="lg" radius="md" withBorder>
        <Stack gap="md">
          <AppLogo />
          <Title order={1}>{LEGAL_APP_NAME}</Title>
          <Text c="dimmed">Mantine player UI (flag on)</Text>
          {session ? (
            <Stack gap="xs">
              <Button
                loading={continuing}
                onClick={() => void handleContinue()}
                aria-busy={continuing}
                aria-label={
                  continuing
                    ? `Verifying session ${session.code}`
                    : `Return to map for session ${session.code}`
                }
              >
                Active session · {myRole ? playerRoleLabel(myRole) : "player"}
                {" · "}
                {session.code}
              </Button>
              {continueError ? (
                <Alert color="red" title="Could not continue">
                  {continueError}
                </Alert>
              ) : null}
            </Stack>
          ) : null}
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
