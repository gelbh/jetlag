import {
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  ChartBarIcon,
  MapTrifoldIcon,
  PlusCircleIcon,
  SignInIcon,
  SquaresFourIcon,
  TrophyIcon,
  UserCircleIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { AppLogo } from "@/components/ui/brand/AppLogo";
import { EntryAsyncButton } from "@/components/ui/entry/EntryAsyncButton";
import { EntryConfirm } from "@/components/ui/entry/EntryConfirm";
import { InsetGroup, SectionLabel } from "@/components/ui/entry/entryChrome";
import { filledStyles, homeCardBtnHintOnPrimaryStyle } from "@/components/ui/entry/entryStyles";
import { InsetRow } from "@/components/ui/entry/InsetRow";
import { EntryScreenLayout } from "@/components/ui/layout/EntryScreenLayout";
import { VersionChangelogSheet } from "@/components/ui/sheets/VersionChangelogSheet";
import { APP_VERSION } from "@/domain/device/changelog";
import { appUpdateCopy } from "@/domain/device/updates/appUpdateCopy";
import { LEGAL_APP_NAME } from "@/domain/legal/legalContact";
import type { SessionRecord } from "@/domain/map/annotations";
import { regionPackDisplayLabel } from "@/domain/regions/regionPackDisplayLabel";
import { playerRoleLabel } from "@/domain/session/players/playerRole";
import { useAppUpdateState } from "@/hooks/app/useAppUpdateState";
import { useHydrated } from "@/hooks/app/useHydrated";
import { usePermanentAuthUser } from "@/hooks/billing/usePermanentAuthUser";
import { useContinueActiveSession } from "@/hooks/session/useContinueActiveSession";
import { useLeaveSessionAndUpdate } from "@/hooks/session/useLeaveSessionAndUpdate";
import { expectsPermanentSignIn } from "@/services/core/auth/persistedAuthHint";
import { isFirebaseConfigured } from "@/services/core/firebase/authBootstrapState";
import { PHONE_SHELL_MAX_WIDTH_PX } from "@/theme/phoneShell";

// Footer links: 44px tap height without adding visual weight next to the Play actions.
const footerLinkStyle = { display: "inline-flex", alignItems: "center", minHeight: 44 } as const;

const homePlaySecondaryStyles = {
  root: {
    minHeight: "3.125rem",
    borderRadius: 14,
    border: "0.33px solid var(--color-rule)",
    backgroundColor: "var(--color-canvas)",
    color: "var(--color-field-ink)",
    fontWeight: 590,
    "&:hover": {
      backgroundColor: "oklch(from var(--color-canvas) calc(l + 0.04) c h)",
    },
  },
} as const;
const homePlaySecondaryBaseStyle = {
  border: "0.33px solid var(--color-rule)",
  backgroundColor: "var(--color-canvas)",
  color: "var(--color-field-ink)",
} as const;

function homeSessionPlayAreaLabel(session: SessionRecord): string | null {
  const labeled = session.gameAreaLabel?.trim();
  if (labeled) {
    return labeled;
  }
  if (session.regionPackId) {
    return regionPackDisplayLabel(session.regionPackId);
  }
  return null;
}

type HomeMoreChromeProps = {
  firebaseOn: boolean;
  showGuestAuthEntry: boolean;
  showAccountFeatures: boolean;
};

function HomeMoreChrome({
  firebaseOn,
  showGuestAuthEntry,
  showAccountFeatures,
}: HomeMoreChromeProps) {
  return (
    <Stack gap={8}>
      <SectionLabel>More</SectionLabel>
      <InsetGroup>
        {showGuestAuthEntry ? (
          <InsetRow
            to="/account"
            label="Log in"
            icon={<UserCircleIcon size={22} weight="regular" />}
          />
        ) : showAccountFeatures ? (
          <>
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
            {firebaseOn ? (
              <InsetRow
                showSeparator
                to="/account"
                label="Account"
                icon={<UserCircleIcon size={22} weight="regular" />}
              />
            ) : null}
          </>
        ) : null}
      </InsetGroup>
    </Stack>
  );
}

export function Home() {
  const { session, myRole, continueError, continuing, handleContinue } = useContinueActiveSession();
  const { needsRefresh } = useAppUpdateState();
  const {
    leaving,
    prompt: leaveUpdatePrompt,
    requestLeaveAndUpdate,
    dismissLeaveAndUpdatePrompt,
    confirmLeaveAndUpdate,
  } = useLeaveSessionAndUpdate();
  const { isPermanent, authReady } = usePermanentAuthUser();
  const hydrated = useHydrated();
  const [permanentHint] = useState(expectsPermanentSignIn);
  const firebaseOn = isFirebaseConfigured();
  // Same family as AccountSignInGate: ignore storage hint until hydrated so prerender matches
  // first client paint. Until authReady: hint → signed-in chrome; else guest (no Friends flash).
  const treatAsPermanent = firebaseOn && (isPermanent || (hydrated && !authReady && permanentHint));
  const showGuestAuthEntry = firebaseOn && !treatAsPermanent;
  const showAccountFeatures = !firebaseOn || treatAsPermanent;
  const [changelogOpen, setChangelogOpen] = useState(false);
  const sessionPlayArea = session ? homeSessionPlayAreaLabel(session) : null;
  const sessionRoleLabel = myRole ? playerRoleLabel(myRole) : null;
  // Persist can finish before hydrateRoot; keep Continue + leave-confirm off the
  // hydration paint so the prerendered empty shell stays recoverable-error-free.
  const showContinueSession = hydrated && session != null;

  return (
    <>
      <EntryScreenLayout viewport viewportLayout="center" topBreathing skin="plain">
        <Container size="xs" w="100%" px={0} maw={PHONE_SHELL_MAX_WIDTH_PX}>
          <Stack gap={16}>
            <Group gap="sm" align="flex-start" wrap="nowrap">
              <Stack gap={6} align="center" className="shrink-0">
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
              <Stack gap={4} style={{ minWidth: 0, flex: 1 }}>
                <Title
                  order={1}
                  c="var(--color-field-ink)"
                  fw={700}
                  fz="1.75rem"
                  style={{
                    lineHeight: 1.15,
                    letterSpacing: "-0.03em",
                    minWidth: 0,
                  }}
                >
                  {LEGAL_APP_NAME}
                </Title>
                {showContinueSession ? null : (
                  <Text
                    c="var(--color-field-ink-muted)"
                    size="sm"
                    style={{
                      lineHeight: 1.3,
                      textWrap: "pretty",
                      maxWidth: "22rem",
                    }}
                  >
                    Unofficial fan companion for Jet Lag: The Game.
                  </Text>
                )}
              </Stack>
            </Group>

            <Stack gap={12}>
              {showContinueSession && session ? (
                <Stack gap={8}>
                  <Stack gap={0} align="stretch">
                    {needsRefresh ? (
                      <Box
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          position: "relative",
                          zIndex: 1,
                          marginBottom: -1,
                        }}
                      >
                        <Group
                          justify="space-between"
                          align="center"
                          gap="xs"
                          wrap="nowrap"
                          px="0.7rem"
                          py={5}
                          style={{
                            position: "relative",
                            width: "fit-content",
                            maxWidth: "min(100%, 17.5rem)",
                            borderRadius: 999,
                            backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.1)",
                            border: "0.33px solid oklch(from var(--color-field-ink) l c h / 0.14)",
                            boxShadow: "0 6px 16px oklch(from var(--color-canvas) l c h / 0.35)",
                          }}
                        >
                          <Text
                            size="xs"
                            fw={600}
                            style={{
                              color: "var(--color-highlight)",
                              letterSpacing: "-0.01em",
                              minWidth: 0,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {appUpdateCopy.readyTitle}
                          </Text>
                          <Button
                            type="button"
                            variant="subtle"
                            size="compact-sm"
                            disabled={leaving}
                            onClick={requestLeaveAndUpdate}
                            aria-label={appUpdateCopy.leaveAndUpdateAction}
                            styles={{
                              root: {
                                flexShrink: 0,
                                minHeight: 36,
                                paddingInline: "0.55rem",
                                color: "var(--color-field-ink)",
                                fontWeight: 600,
                              },
                            }}
                          >
                            {leaving
                              ? appUpdateCopy.leaveAndUpdateBusy
                              : appUpdateCopy.leaveAndUpdateAction}
                          </Button>
                          <Box
                            aria-hidden
                            style={{
                              position: "absolute",
                              left: "50%",
                              bottom: -5,
                              width: 10,
                              height: 10,
                              transform: "translateX(-50%) rotate(45deg)",
                              backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.1)",
                              borderRight:
                                "0.33px solid oklch(from var(--color-field-ink) l c h / 0.14)",
                              borderBottom:
                                "0.33px solid oklch(from var(--color-field-ink) l c h / 0.14)",
                            }}
                          />
                        </Group>
                      </Box>
                    ) : null}
                    <EntryAsyncButton
                      fullWidth
                      busy={continuing}
                      leftSection={<MapTrifoldIcon size={22} weight="duotone" aria-hidden="true" />}
                      idleLabel={
                        <Stack gap={2} align="flex-start" justify="center" style={{ minWidth: 0 }}>
                          <Text component="span" fw={600} style={{ lineHeight: 1.15 }}>
                            Continue
                          </Text>
                          <Text
                            component="span"
                            style={{
                              ...homeCardBtnHintOnPrimaryStyle,
                              lineHeight: 1.2,
                              letterSpacing: "0.02em",
                              maxWidth: "100%",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {sessionPlayArea ? `${sessionPlayArea} · ` : null}
                            {sessionRoleLabel ? `${sessionRoleLabel} · ` : null}
                            <Text
                              component="span"
                              ff="monospace"
                              fw={700}
                              style={{ letterSpacing: "0.14em" }}
                            >
                              {session.code}
                            </Text>
                          </Text>
                        </Stack>
                      }
                      busyLabel="Verifying…"
                      statusMessage={`Verifying session ${session.code}`}
                      aria-label={
                        continuing
                          ? `Verifying session ${session.code}`
                          : `Return to map for session ${session.code}${
                              sessionPlayArea ? ` in ${sessionPlayArea}` : ""
                            }`
                      }
                      styles={{
                        root: {
                          ...filledStyles.root,
                          minHeight: "3.5rem",
                          height: "auto",
                          paddingBlock: "0.55rem",
                          justifyContent: "flex-start",
                          paddingInline: "1rem",
                          ...(needsRefresh
                            ? {
                                borderTopLeftRadius: 16,
                                borderTopRightRadius: 16,
                              }
                            : {}),
                        },
                        section: {
                          marginInlineEnd: "0.65rem",
                        },
                        label: {
                          flex: 1,
                          minWidth: 0,
                          justifyContent: "flex-start",
                        },
                      }}
                      onClick={() => void handleContinue()}
                    />
                  </Stack>
                  {continueError ? (
                    <Alert color="red" title="Could not continue" radius={14}>
                      {continueError}
                    </Alert>
                  ) : null}
                </Stack>
              ) : null}

              <Stack gap={8}>
                <SectionLabel>Play</SectionLabel>
                <EntryAsyncButton
                  component={Link}
                  to="/join"
                  busy={false}
                  idleLabel="Join session"
                  busyLabel="Joining session…"
                  leftSection={<SignInIcon size={22} weight="regular" aria-hidden="true" />}
                  styles={filledStyles}
                />
                <Button
                  component={Link}
                  to="/create"
                  leftSection={<PlusCircleIcon size={22} weight="regular" aria-hidden="true" />}
                  style={homePlaySecondaryBaseStyle}
                  styles={homePlaySecondaryStyles}
                >
                  Create session
                </Button>
                <InsetGroup>
                  <InsetRow
                    to="/presets"
                    label="Browse presets"
                    icon={<SquaresFourIcon size={22} weight="regular" />}
                  />
                </InsetGroup>
              </Stack>

              <HomeMoreChrome
                firebaseOn={firebaseOn}
                showGuestAuthEntry={showGuestAuthEntry}
                showAccountFeatures={showAccountFeatures}
              />

              <Stack gap={0} align="center">
                <Group gap="xs" justify="center" component="nav" aria-label="Learn how to play">
                  <Anchor component={Link} to="/guide" size="sm" style={footerLinkStyle}>
                    How to play
                  </Anchor>
                  <Text size="sm" c="dimmed" aria-hidden="true">
                    ·
                  </Text>
                  <Anchor component={Link} to="/tools" size="sm" style={footerLinkStyle}>
                    Question tools
                  </Anchor>
                  <Text size="sm" c="dimmed" aria-hidden="true">
                    ·
                  </Text>
                  <Anchor component={Link} to="/faq" size="sm" style={footerLinkStyle}>
                    FAQ
                  </Anchor>
                </Group>
                <Group gap="xs" justify="center" component="nav" aria-label="Legal and feedback">
                  <Anchor
                    component={Link}
                    to="/privacy"
                    size="sm"
                    style={footerLinkStyle}
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
                    style={footerLinkStyle}
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
                    style={footerLinkStyle}
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
      {hydrated ? (
        <EntryConfirm
          opened={leaveUpdatePrompt !== null}
          title={leaveUpdatePrompt?.title ?? appUpdateCopy.leaveAndUpdateConfirmTitle}
          consequence={leaveUpdatePrompt?.body ?? ""}
          confirmLabel={appUpdateCopy.leaveAndUpdateAction}
          busyLabel={appUpdateCopy.leaveAndUpdateBusy}
          onConfirm={confirmLeaveAndUpdate}
          onClose={dismissLeaveAndUpdatePrompt}
        />
      ) : null}
    </>
  );
}
