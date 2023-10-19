import { getPreferenceValues, environment } from "@raycast/api";
import { arch } from "os";
import { DataSource } from "typeorm";
import { resolve } from "path";
import { DB_NAME, X64_BINDING, ARM_BINDING } from "../constants/db-name";
import { Snippet } from "../../db/entity/snippet";

const dataSource = function () {
    const preferences = getPreferenceValues<Preferences>();
    const dbFileAbsPath = `${preferences.dbFolder}/${DB_NAME}`;
    const isX64 = arch() == 'x64';

    const ds = new DataSource({
        type: 'better-sqlite3',
        database: dbFileAbsPath,
        nativeBinding: resolve(environment.assetsPath, isX64 ? X64_BINDING : ARM_BINDING),
        entities: [Snippet]
    });
    return ds;
}()

export const getDataSource = async (): Promise<DataSource> => {
    console.log("get data source")
    if (dataSource.isInitialized) {
        console.log("data source already init")
        return dataSource;
    }
    console.log("data source try to init")
    await dataSource.initialize();
    return dataSource;
}
