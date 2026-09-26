export function isDevScenariosEnabled(opts: {
  dev: boolean;
  emulator: boolean;
}): boolean {
  return opts.dev || opts.emulator;
}
