import { Button, Stack, Title } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import type { ReactNode } from "react";

export function DrillIn({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
}) {
  useHotkeys([["Escape", onBack]]);

  return (
    <Stack gap="sm">
      <Button type="button" variant="subtle" w="fit-content" onClick={onBack}>
        Back
      </Button>
      <Title order={2}>{title}</Title>
      {children}
    </Stack>
  );
}
