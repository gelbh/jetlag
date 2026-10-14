import { SegmentedControl } from "@mantine/core";

export type AdminMobileSection = "start-list" | "needs-you";

const sections = [
  { value: "start-list", label: "Start list" },
  { value: "needs-you", label: "Needs you" },
] satisfies { value: AdminMobileSection; label: string }[];

interface AdminMobileBarProps {
  value: AdminMobileSection;
  onChange: (section: AdminMobileSection) => void;
}

/** Below 1024: the two desk destinations, in the AppShell footer. */
export function AdminMobileBar({ value, onChange }: AdminMobileBarProps) {
  return (
    <SegmentedControl
      fullWidth
      aria-label="Desk sections"
      data={sections}
      value={value}
      onChange={(next) => onChange(next as AdminMobileSection)}
    />
  );
}
