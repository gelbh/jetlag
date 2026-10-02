import { Alert } from "@mantine/core";
import type { ReactNode } from "react";
import {
  askInlineErrorCopy,
  isLocationInlineError,
} from "@/components/tools/shared/readout/AskInlineError";
import { floatToneStyles } from "@/components/ui/banners/mapFloatToneStyles";

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
      styles={floatToneStyles("halt")}
      className={["jl-selectable", className].filter(Boolean).join(" ")}
      title={copy?.title}
    >
      {copy ? copy.detail : children}
    </Alert>
  );
}
