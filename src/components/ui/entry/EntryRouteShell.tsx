import { Container } from "@mantine/core";
import type { CSSProperties, ReactNode } from "react";
import { EntryHeader } from "@/components/ui/entry/EntryHeader";
import { EntryScreenLayout } from "@/components/ui/layout/EntryScreenLayout";
import { PHONE_SHELL_MAX_WIDTH_PX } from "@/theme/phoneShell";

type EntryRouteShellProps = {
  title: string;
  backTo?: string;
  backLabel?: string;
  children: ReactNode;
  /** Join centers the form column in the remaining viewport. */
  centerBody?: boolean;
};

export function EntryRouteShell({
  title,
  backTo,
  backLabel,
  children,
  centerBody = false,
}: EntryRouteShellProps) {
  const centerStyle: CSSProperties | undefined = centerBody
    ? {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        minHeight: 0,
      }
    : undefined;

  return (
    <EntryScreenLayout justify="start" skin="plain" flush>
      <EntryHeader title={title} backTo={backTo} backLabel={backLabel} />
      <Container
        size="xs"
        w="100%"
        px="md"
        maw={PHONE_SHELL_MAX_WIDTH_PX}
        py="lg"
        style={centerStyle}
      >
        {children}
      </Container>
    </EntryScreenLayout>
  );
}
