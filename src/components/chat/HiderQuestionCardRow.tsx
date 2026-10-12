import { Button, SimpleGrid, Stack, Text, UnstyledButton, VisuallyHidden } from "@mantine/core";
import { useEffect, useState } from "react";
import { jetlagBrand } from "@/theme/theme";
import type { QuestionPowerUpId } from "../../domain/boardEconomy";
import { powerUpLabel } from "../session/board/boardCardLabels";

const DISARM_AFTER_MS = 4000;

interface HiderQuestionCardRowProps {
  cards: readonly QuestionPowerUpId[];
  disabled?: boolean;
  /** Changing this (e.g. a new pending question id) disarms any armed card. */
  resetKey: string;
  onPlay: (card: QuestionPowerUpId) => void;
}

export function HiderQuestionCardRow({
  cards,
  disabled = false,
  resetKey,
  onPlay,
}: HiderQuestionCardRowProps) {
  const [armed, setArmed] = useState<{ card: QuestionPowerUpId; key: string } | null>(null);
  if (disabled && armed !== null) {
    setArmed(null);
  }
  const armedCard = armed && armed.key === resetKey && !disabled ? armed.card : null;

  useEffect(() => {
    if (!armedCard) {
      return;
    }
    const timer = window.setTimeout(() => setArmed(null), DISARM_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [armedCard]);

  return (
    <Stack gap={6} mt={4} pt={8} style={{ borderTop: `1px solid ${jetlagBrand.rule}` }}>
      <Text size="xs" c={jetlagBrand.fieldInkMuted}>
        Or play a card
      </Text>
      <SimpleGrid cols={cards.length > 1 ? 2 : 1} spacing={8}>
        {cards.map((card) => {
          const label = powerUpLabel(card);
          const isArmed = armedCard === card;
          return (
            <Button
              key={card}
              disabled={disabled}
              size="md"
              radius="sm"
              onClick={() => {
                if (isArmed) {
                  setArmed(null);
                  onPlay(card);
                  return;
                }
                setArmed({ card, key: resetKey });
              }}
              styles={{
                root: {
                  minHeight: "2.75rem",
                  height: "auto",
                  paddingBlock: 8,
                  paddingInline: 12,
                  border: `1px solid ${isArmed ? jetlagBrand.halt : jetlagBrand.rule}`,
                  backgroundColor: isArmed
                    ? `oklch(from ${jetlagBrand.halt} l c h / 0.16)`
                    : jetlagBrand.canvas,
                  color: jetlagBrand.fieldInk,
                  fontWeight: 600,
                  opacity: disabled ? 0.5 : undefined,
                },
                label: {
                  whiteSpace: "normal",
                  overflow: "visible",
                  textAlign: "center",
                  lineHeight: 1.25,
                },
              }}
            >
              {isArmed ? `Tap again to play ${label}` : `Play ${label}`}
            </Button>
          );
        })}
      </SimpleGrid>
      {armedCard ? (
        <UnstyledButton
          onClick={() => setArmed(null)}
          style={{
            alignSelf: "flex-start",
            minHeight: "2.75rem",
            color: jetlagBrand.fieldInkMuted,
            textDecoration: "underline",
            fontSize: "var(--mantine-font-size-sm)",
          }}
        >
          Cancel
        </UnstyledButton>
      ) : null}
      <VisuallyHidden role="status" aria-live="polite">
        {armedCard ? `Tap again to play ${powerUpLabel(armedCard)}` : ""}
      </VisuallyHidden>
    </Stack>
  );
}
