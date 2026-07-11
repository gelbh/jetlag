import { readdir, unlink } from "node:fs/promises";
import { join } from "node:path";

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
