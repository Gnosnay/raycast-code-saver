import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const Snippet = sqliteTable('snippet_tab', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    data: text('data', { mode: 'json' })
});