import { Button, Stack } from "@mantine/core";
import { AskInlineError } from "@/components/tools/shared/readout/AskInlineError";

interface ErrorWithRetryProps {
  error: string;
  onRetry?: () => void;
}

export function ErrorWithRetry({ error, onRetry }: ErrorWithRetryProps) {
  return (
    <Stack gap="sm" className="jl-selectable">
      <AskInlineError message={error} />
      {onRetry ? (
        <Button variant="default" size="compact-md" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </Stack>
  );
}
