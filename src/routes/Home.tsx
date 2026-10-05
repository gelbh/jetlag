import { Alert, Anchor, Badge, Container, Group, Stack, Text, Title } from "@mantine/core";
import {
  ChartBarIcon,
  CrownIcon,
  PlusCircleIcon,
  SignInIcon,
  SquaresFourIcon,
  TrophyIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { AppLogo } from "@/components/ui/brand/AppLogo";
import { EntryAsyncButton } from "@/components/ui/entry/EntryAsyncButton";
import { InsetGroup, SectionLabel } from "@/components/ui/entry/entryChrome";
import { filledStyles } from "@/components/ui/entry/entryStyles";
import { InsetRow } from "@/components/ui/entry/InsetRow";
import { EntryScreenLayout } from "@/components/ui/layout/EntryScreenLayout";
import { VersionChangelogSheet } from "@/components/ui/sheets/VersionChangelogSheet";
import { APP_VERSION } from "@/domain/device/changelog";
import { LEGAL_APP_NAME } from "@/domain/legal/legalContact";
import { playerRoleLabel } from "@/domain/session/players/playerRole";
import { useContinueActiveSession } from "@/hooks/session/useContinueActiveSession";
import { isFirebaseConfigured } from "@/services/core/firebase/authBootstrapState";
import { PHONE_SHELL_MAX_WIDTH_PX } from "@/theme/phoneShell";

// 44px tap height without adding visual weight next to the Play actions.
const learnLinkStyle = { display: "inline-flex", alignItems: "center", minHeight: 44 } as const;

export function Home() {
  const { session, myRole, continueError, continuing, handleContinue } = useContinueActiveSession();
  const showPremium = isFirebaseConfigured();
  const [changelogOpen, setChangelogOpen] = useState(false);

  return (
    <>
      <EntryScreenLayout viewport viewportLayout="center" skin="plain">
        <Container size="xs" w="100%" px={0} maw={PHONE_SHELL_MAX_WIDTH_PX}>
          <Stack gap={28}>
            <Group gap="sm" align="flex-start" wrap="nowrap">
              <Stack gap={8} align="center" className="shrink-0">
                <AppLogo variant="mark" size="md" />
                <Badge
                  component="button"
                  type="button"
                  variant="light"
                  color="gray"
                  radius="xl"
                  size="xs"
                  mih={24}
                  onClick={() => setChangelogOpen(true)}
                  aria-label={`Version ${APP_VERSION}. Open changelog`}
                  styles={{
                    root: {
                      cursor: "pointer",
                      paddingInline: "0.5rem",
                      fontFamily: "var(--mantine-font-family-monospace)",
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      textTransform: "none",
                      color: "var(--color-field-ink-muted)",
                      "&:focus-visible": {
                        outline: "2px solid var(--color-action)",
                        outlineOffset: 1,
                      },
                    },
                  }}
                >
                  v{APP_VERSION}
                </Badge>
              </Stack>
              <Stack gap={6} style={{ minWidth: 0, flex: 1 }}>
                <Title
                  order={1}
                  c="var(--color-field-ink)"
                  fw={700}
                  fz="1.875rem"
                  style={{
                    lineHeight: 1.15,
                    letterSpacing: "-0.03em",
                    minWidth: 0,
                  }}
                >
                  {LEGAL_APP_NAME}
                </Title>
                <Text
                  c="var(--color-field-ink-muted)"
                  size="sm"
                  style={{
                    lineHeight: 1.35,
                    textWrap: "pretty",
                    maxWidth: "22rem",
                  }}
                >
                  Unofficial fan companion for Jet Lag: The Game.
                </Text>
              </Stack>
            </Group>

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
                  <EntryAsyncButton
                    fullWidth
                    busy={continuing}
                    idleLabel="Continue"
                    busyLabel="Verifying…"
                    statusMessage={`Verifying session ${session.code}`}
                    aria-label={
                      continuing
                        ? `Verifying session ${session.code}`
                        : `Return to map for session ${session.code}`
                    }
                    styles={filledStyles}
                    onClick={() => void handleContinue()}
                  />
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
                <SectionLabel>Play</SectionLabel>
                <InsetGroup>
                  <InsetRow
                    to="/join"
                    label="Join session"
                    icon={<SignInIcon size={22} weight="regular" />}
                  />
                  <InsetRow
                    showSeparator
                    to="/create"
                    label="Create session"
                    icon={<PlusCircleIcon size={22} weight="regular" />}
                  />
                  <InsetRow
                    showSeparator
                    to="/presets"
                    label="Browse presets"
                    icon={<SquaresFourIcon size={22} weight="regular" />}
                  />
                </InsetGroup>
              </Stack>

              <Stack gap={8}>
                <SectionLabel>More</SectionLabel>
                <InsetGroup>
                  <InsetRow
                    to="/friends"
                    label="Friends"
                    icon={<UsersThreeIcon size={22} weight="regular" />}
                  />
                  <InsetRow
                    showSeparator
                    to="/leaderboard"
                    label="Leaderboard"
                    icon={<TrophyIcon size={22} weight="regular" />}
                  />
                  <InsetRow
                    showSeparator
                    to="/stats"
                    label="Stats"
                    icon={<ChartBarIcon size={22} weight="regular" />}
                  />
                  {showPremium ? (
                    <InsetRow
                      showSeparator
                      to="/premium"
                      label="Premium"
                      icon={<CrownIcon size={22} weight="regular" />}
                    />
                  ) : null}
                </InsetGroup>
              </Stack>

              <Stack gap={0} align="center">
                <Group gap="xs" justify="center" component="nav" aria-label="Learn how to play">
                  <Anchor component={Link} to="/guide" size="sm" style={learnLinkStyle}>
                    How to play
                  </Anchor>
                  <Text size="sm" c="dimmed" aria-hidden="true">
                    ·
                  </Text>
                  <Anchor component={Link} to="/tools" size="sm" style={learnLinkStyle}>
                    Question tools
                  </Anchor>
                  <Text size="sm" c="dimmed" aria-hidden="true">
                    ·
                  </Text>
                  <Anchor component={Link} to="/faq" size="sm" style={learnLinkStyle}>
                    FAQ
                  </Anchor>
                </Group>
                <Group gap="xs" justify="center" component="nav" aria-label="Legal and feedback">
                  <Anchor component={Link} to="/privacy" size="sm" aria-label="Privacy Policy">
                    Privacy
                  </Anchor>
                  <Text size="sm" c="dimmed" aria-hidden="true">
                    ·
                  </Text>
                  <Anchor component={Link} to="/terms" size="sm" aria-label="Terms of Service">
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
          </Stack>
        </Container>
      </EntryScreenLayout>
      <VersionChangelogSheet open={changelogOpen} onClose={() => setChangelogOpen(false)} />
    </>
  );
}
