import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const repoRootDir = __dirname;

export const sharedAlias = {
  "@": path.resolve(repoRootDir, "src"),
} as const;
