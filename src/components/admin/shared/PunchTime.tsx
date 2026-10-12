import { Text } from "@mantine/core";
import { useReducedMotion } from "@mantine/hooks";
import { formatFreshnessAge } from "@/domain/admin/formatAdminFreshness";
import { useFreshnessClock } from "@/hooks/time/useFreshnessClock";

export function PunchTime({ at, flashing }: { at: string | null; flashing: boolean }) {
  const nowMs = useFreshnessClock();
  const reduceMotion = useReducedMotion();
  const flashStyle = reduceMotion
    ? { background: "var(--adm-overprint-soft)" }
    : { animation: "adm-punch 30s linear forwards" };

  return (
    <Text
      component="time"
      dateTime={at ?? undefined}
      size="sm"
      data-flash={flashing || undefined}
      style={flashing ? flashStyle : undefined}
    >
      {formatFreshnessAge(at, nowMs)}
    </Text>
  );
}
