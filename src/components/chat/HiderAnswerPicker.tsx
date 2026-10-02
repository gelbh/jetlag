import { Button, SimpleGrid, Stack, Text } from "@mantine/core";
import { jetlagBrand } from "@/theme/theme";
import {
  hiderTruthReferenceLabel,
  hiderTruthReferenceLoadingLabel,
} from "../../domain/questions/hiderTruth/hiderTruthReferenceCopy";
import type { HiderTruthReferenceMode } from "../../domain/questions/hiderTruth/resolveHiderTruthReference";
import type { HiderTruthResult } from "../../domain/questions/ui";
import type { GameReplyOption } from "../../domain/session/activity/sessionChat";
import { LoadingReadout } from "../tools/shared/readout/LoadingReadout";

interface HiderAnswerPickerProps {
  replyOptions: readonly GameReplyOption[];
  truth: HiderTruthResult | null;
  loading: boolean;
  truthReferenceMode: HiderTruthReferenceMode;
  disabled?: boolean;
  onSelect: (option: GameReplyOption) => void;
}

function sendAnswerLabel(optionLabel: string): string {
  return `Send answer: ${optionLabel}`;
}

export function HiderAnswerPicker({
  replyOptions,
  truth,
  loading,
  truthReferenceMode,
  disabled = false,
  onSelect,
}: HiderAnswerPickerProps) {
  const truthAvailable = truth !== null && !truth.unavailable && truth.replyId.length > 0;
  const cols = replyOptions.length > 2 ? 1 : 2;
  const referenceLabel = hiderTruthReferenceLabel(truthReferenceMode);

  return (
    <Stack gap={8} mt={8}>
      {loading ? (
        <LoadingReadout>{hiderTruthReferenceLoadingLabel(truthReferenceMode)}</LoadingReadout>
      ) : truth?.unavailable ? (
        <Text size="xs" c={jetlagBrand.halt}>
          {truth.label}
        </Text>
      ) : truthAvailable ? (
        <Text size="xs" c={jetlagBrand.fieldInkMuted}>
          <Text span fw={600} c={jetlagBrand.signal}>
            {referenceLabel}
          </Text>
          {" · "}
          <Text span c={jetlagBrand.fieldInk}>
            {truth.label}
          </Text>
        </Text>
      ) : null}

      <SimpleGrid cols={cols} spacing={8}>
        {replyOptions.map((option) => {
          const isRecommended = truthAvailable && option.id === truth.replyId;
          const buttonLabel = sendAnswerLabel(option.label);

          return (
            <Button
              key={option.id}
              disabled={disabled}
              onClick={() => onSelect(option)}
              aria-label={
                isRecommended
                  ? `${buttonLabel} (recommended ${referenceLabel.toLowerCase()})`
                  : buttonLabel
              }
              size="md"
              radius="sm"
              styles={{
                root: {
                  minHeight: "2.75rem",
                  border: isRecommended
                    ? `1px solid ${jetlagBrand.flag}`
                    : `1px solid ${jetlagBrand.rule}`,
                  backgroundColor: isRecommended ? jetlagBrand.flag : jetlagBrand.canvas,
                  color: isRecommended ? jetlagBrand.flagInk : jetlagBrand.fieldInk,
                  fontWeight: 600,
                  "&:disabled": { opacity: 0.5 },
                },
              }}
            >
              {buttonLabel}
            </Button>
          );
        })}
      </SimpleGrid>
    </Stack>
  );
}
