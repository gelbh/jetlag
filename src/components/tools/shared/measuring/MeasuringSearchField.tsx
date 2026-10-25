import { SearchField } from "@/components/ui/forms/SearchField";
import { useNamedLoadTask } from "@/hooks/progress/useLoadTask";
import { MEASURING_SEARCH_TASK } from "@/services/core/progress/namedTasks";

interface MeasuringSearchFieldProps {
  label: string;
  submitLabel: string;
  value: string;
  loading: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

/** Anchor or target place search, with the running search's progress under it. */
export function MeasuringSearchField(props: MeasuringSearchFieldProps) {
  const searchTask = useNamedLoadTask(MEASURING_SEARCH_TASK);
  return (
    <SearchField
      {...props}
      task={searchTask}
      placeholder="Address, business, or landmark"
      submitClassName="btn-secondary w-full disabled:opacity-40"
    />
  );
}
