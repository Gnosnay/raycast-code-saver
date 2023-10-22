import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { uuidv6 } from "../lib/utils/uuid-v6";

// library is the collection of snippets
export const LibraryModel = sqliteTable('library_tab', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    uuid: text('uuid').unique().notNull().$defaultFn(() => uuidv6()),
    createAt: integer('create_at', { mode: 'timestamp' }), // Date
    updateAt: integer('update_at', { mode: 'timestamp' }), // Date

    name: text('name'),
});
