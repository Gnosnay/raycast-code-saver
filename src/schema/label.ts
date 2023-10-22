import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { uuidv6 } from "../lib/utils/uuid-v6";
import { relations } from "drizzle-orm";
import { SnippetLabelModel } from "./snippet-label";

export const LabelModel = sqliteTable('label_tab', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    uuid: text('uuid').unique().notNull().$defaultFn(() => uuidv6()),
    createAt: integer('create_at', { mode: 'timestamp' }), // Date
    updateAt: integer('update_at', { mode: 'timestamp' }), // Date

    colorHex: text('color_hex', { length: 7 }), // #ffffff
    title: text('title'),
    description: text('title'),
});

export const LabelModelRelations = relations(LabelModel, ({ many }) => ({
    labelsToSnippets: many(SnippetLabelModel),
}));