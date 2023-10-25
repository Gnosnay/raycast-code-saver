import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { uuidv6 } from "../lib/utils/uuid-v6";
import { relations } from "drizzle-orm";
import { SnippetLabelModel } from "./snippet-label";

// tldr style can be found: https://github.com/tldr-pages/tldr/blob/main/contributing-guides/style-guide.md
// it will be checked with https://github.com/tldr-pages/tldr-lint
const SnippetMarkdownFormatTypeEnumArray = ["tldr", "freestyle"] as const;
export type SnippetMarkdownFormatType = typeof SnippetMarkdownFormatTypeEnumArray[number];


export const SnippetModel = sqliteTable('snippet_tab', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    uuid: text('uuid').unique().notNull().$defaultFn(() => uuidv6()),
    createAt: integer('create_at', { mode: 'timestamp' }), // Date
    updateAt: integer('update_at', { mode: 'timestamp' }), // Date

    title: text('title'),
    fileName: text('file_name'),
    content: text('content'),
    formatType: text('format_type', { enum: SnippetMarkdownFormatTypeEnumArray }),
});

export const SnippetModelRelations = relations(SnippetModel, ({ many }) => ({
    snippetsToLabels: many(SnippetLabelModel),
}));