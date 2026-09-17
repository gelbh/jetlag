import { Button, Stack, Text, UnstyledButton } from "@mantine/core";
import {
  IosInsetGroup,
  iosGrayStyles,
} from "@/components/ui/apple/iosEntryChrome";

export interface RoleCodeStampProps {
  roleLabel: string;
  code: string | null;
  busy?: boolean;
  onReveal: () => void;
  onRegenerate: () => void;
  onCopy: () => void;
}

const MASKED_CODE = "••••";

export function RoleCodeStamp({
  roleLabel,
  code,
  busy = false,
  onReveal,
  onRegenerate,
  onCopy,
}: RoleCodeStampProps) {
  const revealed = code != null;

  return (
    <Stack gap="xs">
      <IosInsetGroup>
        <UnstyledButton
          type="button"
          disabled={busy}
          onClick={() => {
            if (revealed) {
              onCopy();
              return;
            }
            onReveal();
          }}
          aria-label={revealed ? `Copy ${roleLabel}` : `Reveal ${roleLabel}`}
          styles={{
            root: {
              display: "block",
              width: "100%",
              paddingInline: "1rem",
              paddingBlock: "0.75rem",
              textAlign: "center",
              opacity: busy ? 0.5 : 1,
              cursor: busy ? "not-allowed" : "pointer",
            },
          }}
        >
          <Text
            size="xs"
            fw={590}
            tt="uppercase"
            style={{
              letterSpacing: "0.08em",
              color: "var(--color-field-ink-muted)",
            }}
          >
            {roleLabel}
          </Text>
          <Text
            className="jl-stamp-code"
            style={{
              marginTop: "0.35rem",
              fontSize: "1.5rem",
              letterSpacing: "0.28em",
              color: "var(--color-field-ink)",
            }}
          >
            {revealed ? code : MASKED_CODE}
          </Text>
        </UnstyledButton>
      </IosInsetGroup>
      <Button
        type="button"
        fullWidth
        disabled={busy}
        styles={iosGrayStyles}
        onClick={onRegenerate}
        aria-label={`Regenerate ${roleLabel}`}
      >
        Regenerate
      </Button>
    </Stack>
  );
}
