import { spawn, spawnSync } from "child_process";
import { randomUUID } from "crypto";
import { closeSync, openSync, statSync, unlinkSync } from "fs";

export async function withWriteLock<T>(file: string, action: (lock: number) => Promise<T>): Promise<T> {
  // lockf locks the inherited open file description. Keep this sidecar inode across saves.
  const lock = openSync(file + ".lock", "a+", 0o600);
  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn("/usr/bin/lockf", ["-s", "-t", "30", "0"], { stdio: [lock, "ignore", "ignore"] });
      child.once("error", reject);
      child.once("close", (status) => {
        if (status === 0) resolve();
        else reject(new Error(`Could not lock ${file} (lockf exit ${status}). Try again.`));
      });
    });
    return await action(lock);
  } finally {
    closeSync(lock);
  }
}

export function replaceFile(file: string, bytes: Uint8Array, lock: number) {
  const temp = file + "." + randomUUID() + ".tmp";
  const fd = openSync(temp, "wx", 0o600);
  let published = false;
  try {
    // Both hosts support inherited descriptors. dd finishes and syncs the complete file before publication.
    const write = spawnSync("/bin/dd", ["bs=65536", "conv=fsync"], {
      input: Buffer.from(bytes),
      stdio: ["pipe", fd, "pipe"],
      encoding: "utf8",
    });
    if (write.error || write.status !== 0 || statSync(temp).size !== bytes.length) {
      throw new Error(`Could not write ${temp}: ${write.error?.message || write.stderr || "incomplete file"}`);
    }

    // Tinycast's fs.renameSync removes an existing target before moving. mv uses rename(2)
    // within this directory. Inherit the lock so it still covers the rename if the host exits.
    const move = spawnSync("/bin/mv", ["-f", temp, file], { stdio: [lock, "ignore", "pipe"], encoding: "utf8" });
    if (move.error) throw move.error;
    if (move.status !== 0) throw new Error(`Could not replace ${file}: ${move.stderr}`);
    published = true;
  } finally {
    closeSync(fd);
    if (!published) {
      // Keep the original write or rename error if cleanup also fails.
      try {
        unlinkSync(temp);
      } catch {
        // The temp file is harmless; the next save uses a new name.
      }
    }
  }
}
