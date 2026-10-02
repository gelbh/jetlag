import { Button, Group, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";
import { filledStyles, grayStyles } from "@/components/ui/entry/entryStyles";
import { AppLink } from "../../navigation/AppLink";
import { AppLogo } from "../brand/AppLogo";
import { EntryScreenLayout } from "../layout/EntryScreenLayout";

export type AppErrorPrimaryAction = {
  label: string;
  onClick: () => void;
};

export type AppErrorSecondaryAction = {
  label: string;
  to: string;
};

export type AppErrorPageProps = {
  title: string;
  message: string;
  detail?: ReactNode;
  primaryAction?: AppErrorPrimaryAction | null;
  secondaryAction?: AppErrorSecondaryAction | null;
  /** Use for crash fallbacks; omit on navigational 404. */
  assertive?: boolean;
};

export function AppErrorPage({
  title,
  message,
  detail,
  primaryAction = null,
  secondaryAction = null,
  assertive = false,
}: AppErrorPageProps) {
  const body = (
    <Stack gap="lg" align="center" ta="center" maw={420} mx="auto" w="100%">
      <AppLogo variant="lockup" size="md" className="justify-center" />
      <Stack gap={8} align="center">
        <Title
          order={1}
          c="var(--color-field-ink)"
          fw={700}
          style={{
            fontSize: "clamp(1.75rem, 7vw, 2.5rem)",
            lineHeight: 0.95,
            letterSpacing: "-0.03em",
            textWrap: "balance",
          }}
        >
          {title}
        </Title>
        {message ? (
          <Text
            c="var(--color-field-ink-muted)"
            size="md"
            style={{ lineHeight: 1.5, textWrap: "pretty" }}
          >
            {message}
          </Text>
        ) : null}
      </Stack>
      {detail ? <div className="w-full">{detail}</div> : null}
      {primaryAction || secondaryAction ? (
        <Group gap="sm" justify="center" wrap="wrap">
          {primaryAction ? (
            <Button styles={filledStyles} onClick={primaryAction.onClick}>
              {primaryAction.label}
            </Button>
          ) : null}
          {secondaryAction ? (
            <Button component={AppLink} to={secondaryAction.to} styles={grayStyles}>
              {secondaryAction.label}
            </Button>
          ) : null}
        </Group>
      ) : null}
    </Stack>
  );

  return (
    <EntryScreenLayout justify="center">
      {assertive ? <div role="alert">{body}</div> : body}
    </EntryScreenLayout>
  );
}
