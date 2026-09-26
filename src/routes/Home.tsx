import { useState } from "react";
import {
  Alert,
  Anchor,
  Button,
  Container,
  Group,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import {
  Crown,
  ChartBar,
  Trophy,
  UsersThree,
} from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import {
  InsetGroup,
  SectionLabel,
} from "@/components/ui/entry/entryChrome";
import { filledStyles } from "@/components/ui/entry/entryStyles";
import { InsetRow } from "@/components/ui/entry/InsetRow";
import { AppLogo } from "@/components/ui/brand/AppLogo";
import { BootSplash } from "@/components/ui/feedback/BootSplash";
import { EntryScreenLayout } from "@/components/ui/layout/EntryScreenLayout";
import { PlayHubSheet } from "@/components/home/PlayHubSheet";
import { VersionChangelogSheet } from "@/components/ui/sheets/VersionChangelogSheet";
import { APP_VERSION } from "@/domain/device/changelog";
import { LEGAL_APP_NAME } from "@/domain/legal/legalContact";
import { playerRoleLabel } from "@/domain/session/players/playerRole";
import { useAuthBootstrapReady } from "@/hooks/app/useAuthBootstrapReady";
import { useAdminAccessState } from "@/hooks/admin/useAdminAccessState";
import { useContinueActiveSession } from "@/hooks/session/useContinueActiveSession";
import { useUserProfile } from "@/hooks/profile/useUserProfile";
import { useRouteTransition } from "@/navigation/useRouteTransition";
import { isFirebaseConfigured } from "@/services/core/firebase/firebase";

export function Home() {
  const { session, myRole, continueError, continuing, handleContinue } =
    useContinueActiveSession();
  const authBootstrapReady = useAuthBootstrapReady();
  const { phase: routeTransitionPhase } = useRouteTransition();
  const showPremium = isFirebaseConfigured();
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [playHubOpen, setPlayHubOpen] = useState(false);
  const {
    user: permanentUser,
    isPermanent,
  } = useAdminAccessState();
  const {
    profile,
    ready: profileReady,
    error: profileError,
  } = useUserProfile(
    permanentUser?.uid,
    isFirebaseConfigured() && isPermanent && permanentUser != null,
  );
  const showUsernamePrompt =
    isPermanent && profileReady && profileError == null && profile == null;

  if (
    isFirebaseConfigured() &&
    !authBootstrapReady &&
    routeTransitionPhase === "idle"
  ) {
    return <BootSplash label="Starting…" />;
  }

  return (
    <>
      <EntryScreenLayout viewport viewportLayout="center" skin="plain">
        <Container size="xs" w="100%" px={0} maw={390}>
          <Stack gap={28}>
            <Stack gap={10}>
              <Group gap="sm" align="center" justify="space-between" wrap="nowrap">
                <Group gap="sm" align="center" wrap="nowrap">
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
                <UnstyledButton
                  onClick={() => setChangelogOpen(true)}
                  aria-label={`Version ${APP_VERSION}. Open changelog`}
                  style={{
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    color: "var(--color-field-ink-muted)",
                    minHeight: "2.75rem",
                    paddingInline: "0.65rem",
                  }}
                >
                  v{APP_VERSION}
                </UnstyledButton>
              </Group>
              <Text
                c="var(--color-field-ink-muted)"
                size="sm"
                style={{ lineHeight: 1.35, textWrap: "pretty", maxWidth: "22rem" }}
              >
                Unofficial fan companion for Jet Lag: The Game.
              </Text>
              {showUsernamePrompt ? (
                <Group
                  justify="space-between"
                  gap="sm"
                  wrap="wrap"
                  style={{
                    borderTop: "1px solid var(--color-rule)",
                    paddingTop: "0.75rem",
                  }}
                >
                  <Text size="sm" c="var(--color-field-ink-muted)" maw="16rem">
                    Choose a username for friends and leaderboards.
                  </Text>
                  <Anchor
                    component={Link}
                    to="/friends"
                    size="sm"
                    fw={600}
                    style={{
                      minHeight: "2.75rem",
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                  >
                    Set username
                  </Anchor>
                </Group>
              ) : null}
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
                    styles={filledStyles}
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

              <Button
                fullWidth
                onClick={() => setPlayHubOpen(true)}
                aria-label="Play - create, join, or custom game"
                aria-haspopup="dialog"
                aria-expanded={playHubOpen}
                styles={filledStyles}
                variant={session ? "default" : undefined}
              >
                Play
              </Button>
              <Text
                size="xs"
                c="var(--color-field-ink-muted)"
                ta="center"
                style={{ marginTop: "-0.85rem" }}
              >
                Create, join, or custom
              </Text>

              <Stack gap={8}>
                <SectionLabel>More</SectionLabel>
                <InsetGroup>
                  <InsetRow
                    to="/friends"
                    label="Friends"
                    icon={<UsersThree size={22} weight="regular" />}
                  />
                  <InsetRow
                    showSeparator
                    to="/leaderboard"
                    label="Leaderboard"
                    icon={<Trophy size={22} weight="regular" />}
                  />
                  <InsetRow
                    showSeparator
                    to="/stats"
                    label="Stats"
                    icon={<ChartBar size={22} weight="regular" />}
                  />
                  {showPremium ? (
                    <InsetRow
                      showSeparator
                      to="/premium"
                      label="Premium"
                      icon={<Crown size={22} weight="regular" />}
                    />
                  ) : null}
                </InsetGroup>
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
      <VersionChangelogSheet
        open={changelogOpen}
        onClose={() => setChangelogOpen(false)}
      />
      <PlayHubSheet open={playHubOpen} onClose={() => setPlayHubOpen(false)} />
    </>
  );
}
