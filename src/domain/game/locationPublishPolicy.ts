export function shouldPublishLocationNow(input: {
  effectivelyOffline: boolean;
  hasUnackedLocationWrite: boolean;
}): boolean {
  return !(input.effectivelyOffline && input.hasUnackedLocationWrite);
}
