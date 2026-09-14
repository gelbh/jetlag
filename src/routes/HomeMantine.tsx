import {
  Alert,
  Anchor,
  Box,
  Button,
  Container,
  Group,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import {
  CaretRight,
  PlusCircle,
  SignIn,
  SquaresFour,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  IosInsetGroup,
  IosSectionLabel,
  iosFilledStyles,
} from "@/components/ui/apple/iosEntryChrome";
import { AppLogo } from "@/components/ui/brand/AppLogo";
import { BootSplash } from "@/components/ui/feedback/BootSplash";
import { EntryScreenLayout } from "@/components/ui/layout/EntryScreenLayout";
import { LEGAL_APP_NAME } from "@/domain/legal/legalContact";
import { playerRoleLabel } from "@/domain/session/players/playerRole";
import { useAuthBootstrapReady } from "@/hooks/app/useAuthBootstrapReady";
import { useContinueActiveSession } from "@/hooks/session/useContinueActiveSession";
import { useRouteTransition } from "@/navigation/useRouteTransition";
import { isFirebaseConfigured } from "@/services/core/firebase/firebase";

function InsetRow({
  to,
  label,
  icon,
  showSeparator = false,
}: {
  to: string;
  label: string;
  icon: ReactNode;
  showSeparator?: boolean;
}) {
  return (
    <>
      {showSeparator ? (
        <Box
          aria-hidden
          style={{
            height: "0.33px",
            marginInlineStart: "3.25rem",
            backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.14)",
          }}
        />
      ) : null}
      <UnstyledButton
        component={Link}
        to={to}
        styles={{
          root: {
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            width: "100%",
            minHeight: "2.875rem",
            paddingInline: "1rem",
            paddingBlock: "0.625rem",
            color: "var(--color-field-ink)",
            fontWeight: 400,
            fontSize: "1.0625rem",
            letterSpacing: "-0.01em",
            transition:
              "background-color 120ms ease, transform 80ms ease, opacity 80ms ease",
            "&:hover": {
              backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.06)",
            },
            "&:active": {
              backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.12)",
              opacity: 0.88,
              transform: "scale(0.995)",
            },
          },
        }}
      >
        <Box
          component="span"
          c="var(--color-flag)"
          style={{ display: "inline-flex", flexShrink: 0, width: "1.375rem" }}
          aria-hidden
        >
          {icon}
        </Box>
        <Text component="span" style={{ flex: 1, lineHeight: 1.25 }}>
          {label}
        </Text>
        <Box
          component="span"
          c="oklch(from var(--color-field-ink-muted) l c h / 0.85)"
          style={{ display: "inline-flex", flexShrink: 0 }}
          aria-hidden
        >
          <CaretRight size={16} weight="bold" />
        </Box>
      </UnstyledButton>
    </>
  );
}

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
    <EntryScreenLayout viewport viewportLayout="center" skin="plain">
      <Container size="xs" w="100%" px={0} maw={390}>
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
                <InsetRow
                  to="/join"
                  label="Join session"
                  icon={<SignIn size={22} weight="regular" />}
                />
                <InsetRow
                  showSeparator
                  to="/create"
                  label="Create session"
                  icon={<PlusCircle size={22} weight="regular" />}
                />
                <InsetRow
                  showSeparator
                  to="/presets"
                  label="Browse presets"
                  icon={<SquaresFour size={22} weight="regular" />}
                />
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
