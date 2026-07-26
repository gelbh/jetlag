import type { ReactNode, TextareaHTMLAttributes } from "react";

interface TextAreaFieldProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> {
  label?: ReactNode;
  labelClassName?: string;
  inputClassName?: string;
}

export function TextAreaField({
  label,
  labelClassName = "field-label",
  inputClassName = "field-input",
  id,
  ...props
}: TextAreaFieldProps) {
  const input = <textarea id={id} className={inputClassName} {...props} />;

  if (!label) {
    return input;
  }

  return (
    <label htmlFor={id} className={labelClassName}>
      {label}
      {input}
    </label>
  );
}
