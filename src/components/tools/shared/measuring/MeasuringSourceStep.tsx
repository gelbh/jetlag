import {
  BASE_MEASURING_CATALOG,
  MEASURING_GROUPS,
  measuringQuestionFor,
  type MeasuringCatalogOption,
  type MeasuringFromKind,
  type MeasuringLocationCategory,
  type MeasuringSubject,
} from "@/domain/questions";
import { GroupedSelectField } from "@/components/ui/forms/GroupedSelectField";
import { CatalogExhaustedMessage } from "../readout/CatalogExhaustedMessage";
import { QuestionPromptBlock } from "../controls/QuestionPromptBlock";
import { ToolSection } from "../panels/ToolSection";

interface MeasuringSourceStepProps {
  measureFrom: MeasuringFromKind;
  optionChosen: boolean;
  usedMeasuringFromKinds: ReadonlySet<MeasuringFromKind>;
  unavailableMeasuringFromKinds?: ReadonlySet<MeasuringFromKind>;
  catalogOptions?: readonly MeasuringCatalogOption[];
  subject: MeasuringSubject;
  locationCategory?: MeasuringLocationCategory;
  onMeasureFromChange: (kind: MeasuringFromKind) => void;
}

export function MeasuringSourceStep({
  measureFrom,
  optionChosen,
  usedMeasuringFromKinds,
  unavailableMeasuringFromKinds = new Set<MeasuringFromKind>(),
  catalogOptions,
  subject,
  locationCategory,
  onMeasureFromChange,
}: MeasuringSourceStepProps) {
  const measureCatalog = catalogOptions ?? BASE_MEASURING_CATALOG;
  const availableGroups = MEASURING_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    options: measureCatalog
      .filter((option) => option.groupId === group.id)
      .map((option) => ({
        value: option.id,
        label: option.label,
        disabled:
          (usedMeasuringFromKinds.has(option.id) ||
            unavailableMeasuringFromKinds.has(option.id)) &&
          !(optionChosen && option.id === measureFrom),
      })),
  })).filter((group) => group.options.length > 0);
  const hasAvailableMeasureOptions = measureCatalog.some(
    (option) =>
      !usedMeasuringFromKinds.has(option.id) &&
      !unavailableMeasuringFromKinds.has(option.id),
  );
  const question =
    optionChosen && locationCategory
      ? measuringQuestionFor(subject, locationCategory)
      : null;

  return (
    <ToolSection first compact status="active">
      {hasAvailableMeasureOptions ? null : (
        <CatalogExhaustedMessage message="Every measure category has already been added to this session." />
      )}
      <GroupedSelectField
        label="Measuring from"
        value={optionChosen ? measureFrom : ""}
        placeholder="Choose what to measure"
        groups={availableGroups}
        onChange={(value) => onMeasureFromChange(value as MeasuringFromKind)}
        disabled={!hasAvailableMeasureOptions}
      />
      {question ? (
        <QuestionPromptBlock
          prompt={question.prompt}
          ruleSummary={question.ruleSummary}
        />
      ) : null}
    </ToolSection>
  );
}
