import type { InputHTMLAttributes, ReactNode } from "react";

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
  label?: ReactNode;
  labelClassName?: string;
  inputClassName?: string;
}

export function TextField({
  label,
  labelClassName = "field-label",
  inputClassName = "field-input",
  id,
  ...props
}: TextFieldProps) {
  const input = <input id={id} className={inputClassName} {...props} />;

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
