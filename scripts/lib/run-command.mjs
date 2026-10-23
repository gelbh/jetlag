import { spawnSync } from "node:child_process";
import { delimiter, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const bin = resolve(root, "node_modules", ".bin");

/** @param {string} command @param {string[]} args */
export function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, PATH: `${bin}${delimiter}${process.env.PATH ?? ""}` },
    shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  // status is null when the child exits via signal; treat as failure
  if (result.status !== 0) process.exit(result.status ?? 1);
}

export { root };
