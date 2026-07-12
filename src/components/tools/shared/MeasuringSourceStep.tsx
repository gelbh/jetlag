import {
  MEASURING_CATALOG,
  MEASURING_GROUPS,
  measuringQuestionFor,
  type MeasuringCatalogOption,
  type MeasuringFromKind,
  type MeasuringLocationCategory,
  type MeasuringSubject,
} from "../../../domain/questions";
import { GroupedSelectField } from "../../ui/GroupedSelectField";
import { CatalogExhaustedMessage } from "./CatalogExhaustedMessage";
import { QuestionPromptBlock } from "./QuestionPromptBlock";
import { ToolSection } from "./ToolSection";

interface MeasuringSourceStepProps {
  measureFrom: MeasuringFromKind;
  optionChosen: boolean;
  usedMeasuringFromKinds: ReadonlySet<MeasuringFromKind>;
  catalogOptions?: readonly MeasuringCatalogOption[];
  subject: MeasuringSubject;
  locationCategory?: MeasuringLocationCategory;
  onMeasureFromChange: (kind: MeasuringFromKind) => void;
}

export function MeasuringSourceStep({
  measureFrom,
  optionChosen,
  usedMeasuringFromKinds,
  catalogOptions,
  subject,
  locationCategory,
  onMeasureFromChange,
}: MeasuringSourceStepProps) {
  const measureCatalog = catalogOptions ?? MEASURING_CATALOG;
  const availableGroups = MEASURING_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    options: measureCatalog
      .filter(
        (option) =>
          option.groupId === group.id && !usedMeasuringFromKinds.has(option.id),
      )
      .map((option) => ({ value: option.id, label: option.label })),
  })).filter((group) => group.options.length > 0);
  const hasAvailableMeasureOptions = availableGroups.length > 0;
  const question =
    optionChosen && locationCategory
      ? measuringQuestionFor(subject, locationCategory)
      : null;

  return (
    <ToolSection first compact status="active">
      <GroupedSelectField
        label="Measuring from"
        value={optionChosen ? measureFrom : ""}
        placeholder="Choose what to measure"
        groups={availableGroups}
        onChange={(value) => onMeasureFromChange(value as MeasuringFromKind)}
        disabled={!hasAvailableMeasureOptions}
      />
      {!hasAvailableMeasureOptions ? (
        <CatalogExhaustedMessage message="Every measure category has already been added to this session." />
      ) : null}
      {question ? (
        <QuestionPromptBlock
          prompt={question.prompt}
          ruleSummary={question.ruleSummary}
        />
      ) : null}
    </ToolSection>
  );
}
