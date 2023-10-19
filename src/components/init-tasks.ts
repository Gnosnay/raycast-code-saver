import { None, Option, Some } from "ts-results-es";
import { DB_NAME, } from "../lib/constants/db-name";
import { getDataSource } from "../lib/storage/db-connection";

export type InitErrorMarkDown = string;
export type InitTaskFunc = () => Promise<Option<InitErrorMarkDown>>;

export const checkDBStorePath: InitTaskFunc = async () => {
    try {
        await getDataSource();
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

export const checkDBSchemaVersion: InitTaskFunc = async () => {
    await new Promise(f => setTimeout(f, 1000));
    return Some('# DB version is wrong' as InitErrorMarkDown)
};

export const upgradeDBSchema: InitTaskFunc = async () => {
    await new Promise(f => setTimeout(f, 1000));
    return None
};