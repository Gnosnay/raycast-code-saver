import { None, Option, Some } from "ts-results-es";
import { DB_NAME, MIGRATIONS_FOLDER } from "../lib/constants/db-name";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { GetDBInstance, UserDefinedDBPath } from "../lib/storage/db-instance";
import { resolve } from "path";
import { environment } from "@raycast/api";
import * as async_fs from "fs/promises"

export type InitErrorMarkDown = string;
export type InitTaskFunc = () => Promise<Option<InitErrorMarkDown>>

const newBackUpDBPath = `${UserDefinedDBPath}.${new Date().toLocaleDateString("en-CA")}`;

export const checkDBStorePath: InitTaskFunc = async () => {
    try {
        GetDBInstance()
    } catch (exc) {
        const errMarkdown = `# Failed to open SQLite DB file
The following steps may help to recover:
- make sure the folder you give exists
- make sure we can read and write \`${DB_NAME}\` under the folder you give
Error details are as follows:
\`\`\`
${exc instanceof Error ? exc.stack : String(exc)}
\`\`\`
`;
        return Some(errMarkdown);
    }
    return None
};

export const backupDB: InitTaskFunc = async () => {
    try {
        await async_fs.copyFile(UserDefinedDBPath, newBackUpDBPath);
    } catch (exc) {
        const errMarkdown = `# Failed to backup the SQLite DB file
The following steps may help to recover:
- make sure we can read and write \`${DB_NAME}\` under the folder you give.
Error details are as follows:
\`\`\`
${exc instanceof Error ? exc.stack : String(exc)}
\`\`\`
`;
        return Some(errMarkdown);
    }
    return None
};

export const upgradeDBSchema: InitTaskFunc = async () => {
    const db = GetDBInstance()
    try {
        migrate(db, { migrationsFolder: resolve(environment.assetsPath, MIGRATIONS_FOLDER) });
    } catch (exc) {
        const errMarkdown = `# Failed to upgrage SQLite DB schema
The following steps may help to recover:
- Please check the integrity of DB \`${UserDefinedDBPath}\`.
    - Is that modified manually by accident?
- You can recover with backup of DB \`${newBackUpDBPath}\`
Error details are as follows:
\`\`\`
${exc instanceof Error ? exc.stack : String(exc)}
\`\`\`
`;
        return Some(errMarkdown);
    }
    return None
};