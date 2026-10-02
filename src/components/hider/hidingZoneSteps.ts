import {
  HIDING_ZONE_CREATE_WIZARD,
  HIDING_ZONE_MOVE_WIZARD,
} from "../../domain/wizard/toolWizardPhases";

export { HIDING_ZONE_CREATE_WIZARD, HIDING_ZONE_MOVE_WIZARD };

/** Legacy step ids consumed by map pick / peek / map-first chrome wiring. */
export type HidingZoneStepId = "method" | "location" | "confirm";
