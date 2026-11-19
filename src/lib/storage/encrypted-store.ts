import { randomUUID } from "crypto";
import { existsSync, readFileSync, realpathSync, statSync } from "fs";
import { join } from "path";
import init, { Connection, ModuleOptions } from "../../vendor/sqlite3mc";
import { replaceFile, withWriteLock } from "./database-file";

async function loadEngine(assetsPath: string) {
  const module = new WebAssembly.Module(new Uint8Array(readFileSync(join(assetsPath, "sqlite3mc", "sqlite3.wasm"))));
  const options: ModuleOptions = {
    instantiateWasm(imports, receive) {
      const instance = new WebAssembly.Instance(module, imports);
      receive(instance, module);
      return instance.exports;
    },
  };
  // Use MEMFS in both desktop hosts. The browser storage adapters need a web worker.
  Object.assign(globalThis, {
    sqlite3ApiConfig: {
      disable: {
        vfs: {
          opfs: true,
          "opfs-vfs": true,
          "opfs-wl": true,
          "opfs-sahpool": true,
          kvvfs: true,
        },
      },
    },
  });
  const sqlite = await init(options);
  if (!options.files) throw new Error("SQLite virtual filesystem is unavailable.");
  return { sqlite, files: options.files };
}

let engine: ReturnType<typeof loadEngine> | undefined;

/** SQLite could not read the schema after the key was set: the key is wrong or the file is damaged. */
export class WrongKeyError extends Error {
  constructor(cause: unknown) {
    super(`Could not decrypt the database: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = "WrongKeyError";
  }
}

export interface StoreOptions {
  file: string;
  key: string;
  assetsPath: string;
}

type Mode = "read" | "write" | "initialize";
type Operation<T> = (db: Connection, previous: Buffer | undefined, lock?: number) => Promise<T>;

export async function withStore<T>(options: StoreOptions, mode: Mode, action: Operation<T>): Promise<T> {
  if (!options.key || options.key.includes("\0"))
    throw new Error("Enter a non-empty encryption key without a NUL character.");
  const { sqlite, files } = await (engine ??= loadEngine(options.assetsPath).catch((error) => {
    engine = undefined;
    throw error;
  }));
  const file = existsSync(options.file) ? realpathSync(options.file) : options.file;

  async function run(lock?: number): Promise<T> {
    // A lone main-file snapshot cannot replay another SQLite writer's journal.
    for (const suffix of ["-wal", "-journal"]) {
      if (existsSync(file + suffix) && statSync(file + suffix).size > 0) {
        throw new Error(
          "Close the other SQLite writer and checkpoint or recover its journal before opening Code Saver."
        );
      }
    }
    let previous: Buffer | undefined;
    try {
      previous = readFileSync(file);
    } catch (error) {
      if (mode !== "initialize" || (error as NodeJS.ErrnoException).code !== "ENOENT" || existsSync(file)) throw error;
    }

    const path = "/" + randomUUID() + ".db";
    const image = previous ?? new Uint8Array();
    // Create an empty file through oo1.DB; the C import helper requires a non-empty buffer.
    if (image.length) sqlite.capi.sqlite3_js_posix_create_file(path, new Uint8Array(image));
    let hasFile = image.length > 0;
    let db: Connection | undefined;
    try {
      db = new sqlite.oo1.DB(path, image.length ? "w" : "c");
      hasFile = true;
      db.exec("PRAGMA cipher='aes256cbc'");
      if (sqlite.capi.sqlite3_key(db.pointer, options.key, Buffer.byteLength(options.key)) !== 0) {
        throw new Error("Could not set the database encryption key.");
      }
      db.exec("PRAGMA locking_mode=EXCLUSIVE"); // MEMFS has one connection and no shared-memory WAL index.
      try {
        db.selectValue("SELECT count(*) FROM sqlite_schema"); // Verify the key before backup or changes.
      } catch (error) {
        throw new WrongKeyError(error);
      }
      if (mode === "read") db.exec("PRAGMA query_only=ON");
      else db.exec("PRAGMA journal_mode=DELETE");
      db.exec("PRAGMA foreign_keys=ON");
      const result = await action(db, previous, lock);
      db.close();
      db = undefined;
      if (lock !== undefined) {
        const encrypted = files.read(path);
        if (!encrypted.length || Buffer.from(encrypted.subarray(0, 16)).toString() === "SQLite format 3\0") {
          throw new Error("SQLite did not produce an encrypted database.");
        }
        if (!previous?.equals(encrypted)) replaceFile(file, encrypted, lock);
      }
      return result;
    } finally {
      try {
        db?.close();
      } finally {
        if (hasFile) files.remove(path);
      }
    }
  }
  return mode === "read" ? run() : withWriteLock(file, run);
}
