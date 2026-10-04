export function shouldShowOptionalAppUpdateBanner(options: {
  needsRefresh: boolean;
  safeToReload: boolean;
}): boolean {
  return options.needsRefresh && options.safeToReload;
}
