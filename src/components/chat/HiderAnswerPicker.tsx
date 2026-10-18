import { Button, SimpleGrid, Stack, Text } from "@mantine/core";
import { useNamedLoadTask } from "@/hooks/progress/useLoadTask";
import { HIDER_TRUTHS_TASK } from "@/services/core/progress/namedTasks";
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
  onSetHidingZone?: () => void;
}

function HiderSetZonePrompt({
  disabled,
  onSetHidingZone,
}: {
  disabled: boolean;
  onSetHidingZone?: () => void;
}) {
  return (
    <Stack gap={8} mt={8}>
      <Text size="xs" c={jetlagBrand.halt}>
        Set your hiding zone to answer.
      </Text>
      {onSetHidingZone ? (
        <Button
          disabled={disabled}
          onClick={onSetHidingZone}
          size="md"
          radius="sm"
          styles={{
            root: {
              minHeight: "2.75rem",
              border: `1px solid ${jetlagBrand.flag}`,
              backgroundColor: jetlagBrand.flag,
              color: jetlagBrand.flagInk,
              fontWeight: 600,
            },
          }}
        >
          Set hiding zone
        </Button>
      ) : null}
    </Stack>
  );
}

export function HiderAnswerPicker({
  replyOptions,
  truth,
  loading,
  truthReferenceMode,
  disabled = false,
  onSelect,
  onSetHidingZone,
}: HiderAnswerPickerProps) {
  const truthTask = useNamedLoadTask(HIDER_TRUTHS_TASK);
  if (truthReferenceMode === "noHidingZone") {
    return <HiderSetZonePrompt disabled={disabled} onSetHidingZone={onSetHidingZone} />;
  }

  const truthOption =
    truth !== null && !truth.unavailable
      ? replyOptions.find((option) => option.id === truth.replyId)
      : undefined;
  const truthAvailable = truthOption !== undefined;
  const staleTruth = loading && truthAvailable;
  const visibleOptions = truthOption ? [truthOption] : loading ? [] : replyOptions;
  const cols = visibleOptions.length === 2 ? 2 : 1;
  const referenceLabel = hiderTruthReferenceLabel(truthReferenceMode);

  return (
    <Stack gap={8} mt={8}>
      {loading ? (
        <LoadingReadout task={truthTask}>
          {hiderTruthReferenceLoadingLabel(truthReferenceMode)}
        </LoadingReadout>
      ) : truth?.unavailable ? (
        <Text size="xs" c={jetlagBrand.halt}>
          {truth.label}
        </Text>
      ) : truthAvailable && truth ? (
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
        {visibleOptions.map((option) => {
          const isRecommended = truthAvailable;
          const buttonLabel = option.label;

          return (
            <Button
              key={option.id}
              disabled={disabled}
              aria-disabled={staleTruth || undefined}
              onClick={() => {
                if (!staleTruth) {
                  onSelect(option);
                }
              }}
              aria-label={buttonLabel}
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
                  opacity: staleTruth ? 0.5 : undefined,
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
