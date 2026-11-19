import { environment, getPreferenceValues } from "@raycast/api";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { migrate } from "drizzle-orm/sqlite-proxy/migrator";
import { readdirSync, unlinkSync } from "fs";
import { dirname, join, resolve } from "path";
import dayjs from "dayjs";
import { Connection, Binding } from "../../vendor/sqlite3mc";
import { DB_NAME, MIGRATIONS_FOLDER } from "../constants/db-name";
import { replaceFile } from "./database-file";
import { withStore } from "./encrypted-store";

function connect(connection: Connection) {
  return drizzle(async (sql, bind, method) => {
    const resultRows: Binding[][] = [];
    connection.exec({ sql, bind, rowMode: "array", resultRows });
    return { rows: method === "get" ? resultRows[0] : resultRows };
  });
}

type Database = ReturnType<typeof connect>;

function settings() {
  const { dbFolder, encryptedKey, backupDates } = getPreferenceValues<Preferences>();
  return { file: resolve(dbFolder, DB_NAME), key: encryptedKey, assetsPath: environment.assetsPath, backupDates };
}

export function readDatabase<T>(action: (db: Database) => Promise<T>) {
  return withStore(settings(), "read", (db) => action(connect(db)));
}

export function writeDatabase<T>(action: (db: Database) => Promise<T>) {
  return withStore(settings(), "write", (db) => connect(db).transaction(action));
}

export function initializeDatabase() {
  const options = settings();
  return withStore(options, "initialize", async (connection, previous, lock) => {
    const today = dayjs();
    const backup = options.file + "." + today.format("YYYY-MM-DD");
    if (lock !== undefined && previous?.length) replaceFile(backup, previous, lock);

    const db = connect(connection);
    await migrate(
      db,
      async (queries) => {
        for (const query of queries) connection.exec(query);
      },
      { migrationsFolder: join(options.assetsPath, MIGRATIONS_FOLDER) }
    );

    const retention = {
      "1Month": today.subtract(1, "month"),
      "1Week": today.subtract(1, "week"),
      "3Days": today.subtract(3, "day"),
      always: null,
    };
    const cutoff = retention[options.backupDates];
    if (cutoff) {
      const folder = dirname(options.file);
      for (const name of readdirSync(folder)) {
        const date = name.slice(DB_NAME.length + 1);
        if (name.startsWith(DB_NAME + ".") && /^\d{4}-\d{2}-\d{2}$/.test(date) && dayjs(date).isBefore(cutoff)) {
          unlinkSync(join(folder, name));
        }
      }
    }
  });
}
