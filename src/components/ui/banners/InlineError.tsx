import type { ReactNode } from "react";
import { Alert } from "@mantine/core";
import {
  askInlineErrorCopy,
  isLocationInlineError,
} from "@/components/tools/shared/readout/AskInlineError";

interface InlineErrorProps {
  children: ReactNode;
  className?: string;
  id?: string;
}

/** Channel-3 soft alert strip (GPS timeout gets title + detail). */
export function InlineError({ children, className = "", id }: InlineErrorProps) {
  const copy =
    typeof children === "string" && isLocationInlineError(children)
      ? askInlineErrorCopy(children)
      : null;

  return (
    <Alert
      id={id}
      role="alert"
      color="halt"
      variant="light"
      className={["jl-selectable", className].filter(Boolean).join(" ")}
      title={copy?.title}
    >
      {copy ? copy.detail : children}
    </Alert>
  );
}
