import { None, Option, Some } from "ts-results-es";
import { Action, ActionPanel, Detail, openExtensionPreferences, getPreferenceValues, environment } from "@raycast/api";
import { promises as async_fs } from 'fs';
import { resolve } from "path";
import { arch } from 'os'
import { ARM_BINDING, DB_NAME, X64_BINDING } from "../lib/constants/db-name";
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { Preferences } from "../lib/types/preferences";

export type InitErrorMarkDown = string;
export type InitTaskFunc = () => Promise<Option<InitErrorMarkDown>>

export const checkDBStorePath: InitTaskFunc = async () => {
    const preferences = getPreferenceValues<Preferences>();
    const dbFileAbsPath = `${preferences.dbFolder}/${DB_NAME}`;
    const isX64 = arch() == 'x64';
    try {
        const sqlite = new Database(dbFileAbsPath, {
            'nativeBinding': resolve(environment.assetsPath, isX64 ? X64_BINDING : ARM_BINDING)
        })
        const db: BetterSQLite3Database = drizzle(sqlite);
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

export const checkDBSchemaExistence: InitTaskFunc = async () => {
    await new Promise(f => setTimeout(f, 1000));
    return None
};

export const checkDBSchemaVersion: InitTaskFunc = async () => {
    await new Promise(f => setTimeout(f, 1000));
    return Some('# DB version is wrong' as InitErrorMarkDown)
};

export const upgradeDBSchema: InitTaskFunc = async () => {
    await new Promise(f => setTimeout(f, 1000));
    return None
};