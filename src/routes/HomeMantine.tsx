import {
  Alert,
  Anchor,
  Button,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  Crown,
  ChartBar,
  PlusCircle,
  SignIn,
  SquaresFour,
  Trophy,
  UsersThree,
} from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import {
  IosInsetGroup,
  IosSectionLabel,
} from "@/components/ui/apple/iosEntryChrome";
import { iosFilledStyles } from "@/components/ui/apple/iosEntryStyles";
import { IosInsetRow } from "@/components/ui/apple/IosInsetRow";
import { AppLogo } from "@/components/ui/brand/AppLogo";
import { BootSplash } from "@/components/ui/feedback/BootSplash";
import { EntryScreenLayout } from "@/components/ui/layout/EntryScreenLayout";
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
  const showPremium = isFirebaseConfigured();

  if (
    isFirebaseConfigured() &&
    !authBootstrapReady &&
    routeTransitionPhase === "idle"
  ) {
    return <BootSplash label="Starting…" />;
  }

  return (
    <EntryScreenLayout viewport viewportLayout="center" skin="plain">
      <Container
        size="xs"
        w="100%"
        px={0}
        maw={390}
        data-player-ux-world="mantine"
      >
        <Stack gap={28}>
          <Stack gap={10}>
            <Group gap="sm" align="center">
              <AppLogo variant="mark" size="md" />
              <Title
                order={1}
                c="var(--color-field-ink)"
                fw={700}
                style={{
                  fontSize: "2.125rem",
                  lineHeight: 1.15,
                  letterSpacing: "-0.03em",
                }}
              >
                {LEGAL_APP_NAME}
              </Title>
            </Group>
            <Text
              c="var(--color-field-ink-muted)"
              size="sm"
              style={{ lineHeight: 1.35, textWrap: "pretty", maxWidth: "22rem" }}
            >
              Unofficial fan companion for Jet Lag: The Game.
            </Text>
          </Stack>

          <Stack gap={22}>
            {session ? (
              <Stack gap={8}>
                <Text
                  size="xs"
                  c="var(--color-field-ink-muted)"
                  fw={590}
                  style={{ letterSpacing: "-0.01em", paddingInline: 4 }}
                >
                  Active session
                  {myRole ? ` · ${playerRoleLabel(myRole)}` : ""}
                </Text>
                <Button
                  fullWidth
                  loading={continuing}
                  onClick={() => void handleContinue()}
                  aria-busy={continuing}
                  aria-label={
                    continuing
                      ? `Verifying session ${session.code}`
                      : `Return to map for session ${session.code}`
                  }
                  styles={iosFilledStyles}
                >
                  Continue
                </Button>
                <Text
                  ta="center"
                  size="sm"
                  c="var(--color-field-ink-muted)"
                  ff="monospace"
                  style={{ letterSpacing: "0.16em" }}
                >
                  {session.code}
                </Text>
                {continueError ? (
                  <Alert color="red" title="Could not continue" radius={14}>
                    {continueError}
                  </Alert>
                ) : null}
              </Stack>
            ) : null}

            <Stack gap={8}>
              <IosSectionLabel>Play</IosSectionLabel>
              <IosInsetGroup>
                <IosInsetRow
                  to="/join"
                  label="Join session"
                  icon={<SignIn size={22} weight="regular" />}
                />
                <IosInsetRow
                  showSeparator
                  to="/create"
                  label="Create session"
                  icon={<PlusCircle size={22} weight="regular" />}
                />
                <IosInsetRow
                  showSeparator
                  to="/presets"
                  label="Browse presets"
                  icon={<SquaresFour size={22} weight="regular" />}
                />
              </IosInsetGroup>
            </Stack>

            <Stack gap={8}>
              <IosSectionLabel>More</IosSectionLabel>
              <IosInsetGroup>
                <IosInsetRow
                  to="/friends"
                  label="Friends"
                  icon={<UsersThree size={22} weight="regular" />}
                />
                <IosInsetRow
                  showSeparator
                  to="/leaderboard"
                  label="Leaderboard"
                  icon={<Trophy size={22} weight="regular" />}
                />
                <IosInsetRow
                  showSeparator
                  to="/stats"
                  label="Stats"
                  icon={<ChartBar size={22} weight="regular" />}
                />
                {showPremium ? (
                  <IosInsetRow
                    showSeparator
                    to="/premium"
                    label="Premium"
                    icon={<Crown size={22} weight="regular" />}
                  />
                ) : null}
              </IosInsetGroup>
            </Stack>

            <Group
              gap="xs"
              justify="center"
              component="nav"
              aria-label="Legal and feedback"
            >
              <Anchor
                component={Link}
                to="/privacy"
                size="sm"
                aria-label="Privacy Policy"
              >
                Privacy
              </Anchor>
              <Text size="sm" c="dimmed" aria-hidden="true">
                ·
              </Text>
              <Anchor
                component={Link}
                to="/terms"
                size="sm"
                aria-label="Terms of Service"
              >
                Terms
              </Anchor>
              <Text size="sm" c="dimmed" aria-hidden="true">
                ·
              </Text>
              <Anchor
                component={Link}
                to="/feedback"
                size="sm"
                aria-label="Feedback and suggestions"
              >
                Feedback
              </Anchor>
            </Group>
          </Stack>
        </Stack>
      </Container>
    </EntryScreenLayout>
  );
}
