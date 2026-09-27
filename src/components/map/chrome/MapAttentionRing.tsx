/**
 * Wizard place-phase attention ring (was map-wizard-attention.css ::after).
 */
import { Box } from "@mantine/core";
import { mapAttentionRingStyle } from "@/components/ui/entry/entryStyles";

type MapAttentionRingProps = {
  active: boolean;
};

export function MapAttentionRing({ active }: MapAttentionRingProps) {
  if (!active) {
    return null;
  }

  return (
    <Box
      aria-hidden
      data-testid="map-attention-ring"
      className="jl-map-attention-ring"
      style={mapAttentionRingStyle}
    />
  );
}
