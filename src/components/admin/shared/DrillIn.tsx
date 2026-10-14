import { Button, Stack, Title } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { type ReactNode, useEffect, useRef } from "react";

/** A dialog or menu that does not contain the drill-in owns its own Escape. */
function otherDialogOpen(root: HTMLElement | null) {
  const hosts = [
    document.activeElement?.closest('[role="dialog"], [role="menu"]'),
    ...document.querySelectorAll('[aria-modal="true"]'),
  ];
  return hosts.some((host) => host != null && !host.contains(root));
}

export function DrillIn({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    backRef.current?.focus();
  }, []);

  useHotkeys([
    [
      "Escape",
      (event) => {
        if (otherDialogOpen(rootRef.current)) return;
        event.preventDefault();
        onBack();
      },
      { preventDefault: false },
    ],
  ]);

  return (
    <Stack ref={rootRef} gap="sm">
      <Button
        ref={backRef}
        type="button"
        variant="subtle"
        w="fit-content"
        mih={44}
        onClick={onBack}
      >
        Back
      </Button>
      <Title order={2}>{title}</Title>
      {children}
    </Stack>
  );
}
