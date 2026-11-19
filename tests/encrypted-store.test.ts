import assert from "node:assert/strict";
import { fork, spawnSync } from "node:child_process";
import { once } from "node:events";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { StoreOptions, withStore } from "../src/lib/storage/encrypted-store";

const assetsPath = resolve(__dirname, "../assets");
const key = "test-only 密钥 🧪 'quoted'";
const optionsFor = (file: string): StoreOptions => ({ file, key, assetsPath });

async function insert(options: StoreOptions, value: string, beforeSave?: () => Promise<void>) {
  return withStore(options, "write", async (db) => {
    db.exec({ sql: "INSERT INTO entries VALUES (?)", bind: [value], rowMode: "array", resultRows: [] });
    await beforeSave?.();
  });
}

if (process.argv[2] === "--short-write") {
  insert(optionsFor(process.argv[3]), "x".repeat(65536)).then(
    () => {
      process.exitCode = 1;
    },
    (error) => {
      if (!String(error).includes("Could not write")) throw error;
    }
  );
} else if (process.argv[2] === "--writer") {
  const [file, value, hold] = process.argv.slice(3);
  process.send?.("starting");
  insert(optionsFor(file), value, async () => {
    if (hold === "hold") {
      const resume = once(process, "message");
      process.send?.("locked");
      await resume;
    }
  })
    .then(() => process.disconnect?.())
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
} else {
  test(
    "encrypted snapshots survive failed writes and interrupted or competing processes",
    { timeout: 60000 },
    async (t) => {
      const folder = mkdtempSync(join(tmpdir(), "code-saver-test-"));
      t.after(() => rmSync(folder, { recursive: true, force: true }));
      const options = optionsFor(join(folder, "code-saver.db"));
      await withStore(options, "initialize", async (db) => {
        db.exec("CREATE TABLE entries(value TEXT PRIMARY KEY)");
        db.exec("INSERT INTO entries VALUES ('original test snippet')");
      });

      const original = readFileSync(options.file);
      assert.equal(original.includes(Buffer.from("SQLite format 3")), false);
      assert.equal(original.includes(Buffer.from("original test snippet")), false);
      assert.notEqual(spawnSync("/usr/bin/sqlite3", ["-readonly", options.file, "SELECT * FROM entries"]).status, 0);
      await assert.rejects(
        withStore({ ...options, key: "wrong" }, "write", async () => undefined),
        /not a database|SQLITE_NOTADB/i
      );
      await assert.rejects(
        insert(options, "discard", async () => {
          throw new Error("cancel");
        }),
        /cancel/
      );
      assert.deepEqual(readFileSync(options.file), original);

      // Force the real staging writer to fail before rename(2).
      const limited = spawnSync(
        "/bin/sh",
        [
          "-c",
          'ulimit -f 8; exec "$@"',
          "limit",
          process.execPath,
          "--import",
          "tsx",
          __filename,
          "--short-write",
          options.file,
        ],
        { encoding: "utf8" }
      );
      assert.equal(limited.status, 0, limited.stderr);
      assert.deepEqual(readFileSync(options.file), original);

      function writer(value: string, hold = false) {
        const child = fork(__filename, ["--writer", options.file, value, hold ? "hold" : ""], {
          execArgv: ["--import", "tsx"],
          stdio: ["ignore", "ignore", "inherit", "ipc"],
        });
        t.after(() => {
          if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
        });
        const exit = once(child, "exit");
        return { child, exit };
      }

      const first = writer("Tinycast", true);
      assert.equal((await once(first.child, "message"))[0], "starting");
      assert.equal((await once(first.child, "message"))[0], "locked");
      const second = writer("Raycast");
      assert.equal((await once(second.child, "message"))[0], "starting");
      first.child.send("continue");
      assert.deepEqual(await first.exit, [0, null]);
      assert.deepEqual(await second.exit, [0, null]);

      const beforeCrash = readFileSync(options.file);
      const interrupted = writer("unfinished", true);
      assert.equal((await once(interrupted.child, "message"))[0], "starting");
      assert.equal((await once(interrupted.child, "message"))[0], "locked");
      interrupted.child.kill("SIGKILL");
      assert.deepEqual(await interrupted.exit, [null, "SIGKILL"]);
      assert.deepEqual(readFileSync(options.file), beforeCrash);
      await insert(options, "after crash");
      assert.equal(await withStore(options, "read", async (db) => db.selectValue("SELECT count(*) FROM entries")), 4);

      // A snapshot of only the main database would discard a committed WAL transaction.
      const committed = readFileSync(options.file);
      writeFileSync(options.file + "-wal", "pending");
      await assert.rejects(insert(options, "unsafe"), /journal/);
      assert.deepEqual(readFileSync(options.file), committed);
      assert.ok(existsSync(options.file + ".lock"));
    }
  );
}
