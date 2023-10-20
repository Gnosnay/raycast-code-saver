import { getPreferenceValues, environment } from "@raycast/api";
import { resolve } from "path";
import { arch } from 'os'
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { DB_NAME, X64_BINDING, ARM_BINDING } from "../constants/db-name";

export const UserDefinedDBPath = function () {
    const preferences = getPreferenceValues<Preferences>();
    const dbFileAbsPath = resolve(preferences.dbFolder, DB_NAME);
    return dbFileAbsPath;
}()

export const GetDBInstance = (): BetterSQLite3Database => {
    const isX64 = arch() == 'x64';
    const sqlite = new Database(UserDefinedDBPath, {
        'nativeBinding': resolve(environment.assetsPath, isX64 ? X64_BINDING : ARM_BINDING)
    })
    return drizzle(sqlite)
}