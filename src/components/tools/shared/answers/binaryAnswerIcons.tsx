import {
  ArrowsInIcon,
  ArrowsOutIcon,
  CheckIcon,
  FlameIcon,
  type Icon,
  SnowflakeIcon,
  XIcon,
} from "@phosphor-icons/react";

/** Phosphor icons for binary Ask answers (map chrome + BinaryAnswerPicker). */
export function binaryAnswerIcon(value: string): Icon | null {
  switch (value) {
    case "yes":
      return CheckIcon;
    case "no":
      return XIcon;
    case "closer":
      return ArrowsInIcon;
    case "further":
      return ArrowsOutIcon;
    case "hotter":
      return FlameIcon;
    case "colder":
      return SnowflakeIcon;
    default:
      return null;
  }
}
