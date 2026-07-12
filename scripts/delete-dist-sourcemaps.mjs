import { readdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ASSETS_IGNORE = `node_modules
.git
.DS_Store
`;

async function writeAssetsIgnore(dir) {
  await writeFile(join(dir, ".assetsignore"), ASSETS_IGNORE, "utf8");
}

async function deleteMapsInDir(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }

  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await deleteMapsInDir(path);
      continue;
    }

    if (entry.name.endsWith(".map")) {
      await unlink(path);
    }
  }
}

await deleteMapsInDir("dist");
await writeAssetsIgnore("dist");
