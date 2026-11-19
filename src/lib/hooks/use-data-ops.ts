import { usePromise } from "@raycast/utils";
import { desc, eq, inArray } from "drizzle-orm";
import { LabelModel } from "../../schema/label";
import { LibraryModel } from "../../schema/library";
import { SnippetModel } from "../../schema/snippet";
import { SnippetLabelModel } from "../../schema/snippet-label";
import { readDatabase, writeDatabase } from "../storage/db-instance";
import { LabelReq, LibraryReq, Snippet, SnippetReq } from "../types/dto";

export function useDataFetch<T>(data: "label" | "library") {
  return usePromise(
    async (kind: typeof data) =>
      readDatabase(async (db) => {
        const model = kind === "label" ? LabelModel : LibraryModel;
        return (await db.select().from(model).orderBy(model.uuid)) as T[];
      }),
    [data]
  );
}

export function fetchSnippets() {
  return usePromise(
    async () =>
      readDatabase(async (db) => {
        const rows = await db
          .select({
            snippet: SnippetModel,
            library: { uuid: LibraryModel.uuid, name: LibraryModel.name },
            label: { uuid: LabelModel.uuid, title: LabelModel.title, colorHex: LabelModel.colorHex },
          })
          .from(SnippetModel)
          .leftJoin(LibraryModel, eq(SnippetModel.libraryId, LibraryModel.id))
          .leftJoin(SnippetLabelModel, eq(SnippetModel.id, SnippetLabelModel.snippetId))
          .leftJoin(LabelModel, eq(LabelModel.id, SnippetLabelModel.labelId))
          .orderBy(desc(SnippetModel.uuid), desc(SnippetModel.updateAt));
        const snippets = new Map<number, Snippet>();
        for (const { snippet, library, label } of rows) {
          let entry = snippets.get(snippet.id);
          if (!entry) {
            // Keep orphaned snippets visible; editing one lets the user pick a valid library.
            entry = { ...snippet, library: library ?? { uuid: "", name: "(missing library)" }, labels: [] };
            snippets.set(snippet.id, entry);
          }
          if (label) entry.labels.push(label);
        }
        return [...snippets.values()];
      }),
    []
  );
}

type WriteAction = Parameters<typeof writeDatabase<void>>[0];

async function save(action: WriteAction): Promise<string | undefined> {
  try {
    await writeDatabase(action);
  } catch (error) {
    return `## Could not save the change\n\n${error instanceof Error ? error.message : String(error)}`;
  }
}

export function upsertSnippet(req: SnippetReq) {
  return save(async (db) => {
    if (
      req.uuid &&
      !(await db.select({ id: SnippetModel.id }).from(SnippetModel).where(eq(SnippetModel.uuid, req.uuid))).length
    ) {
      throw new Error(`Cannot find snippet ${req.uuid}.`);
    }
    const [library] = await db
      .select({ id: LibraryModel.id })
      .from(LibraryModel)
      .where(eq(LibraryModel.uuid, req.libraryUUID));
    if (!library) throw new Error(`Cannot find library ${req.libraryUUID}.`);
    const labels = req.labelsUUID.length
      ? await db.select({ id: LabelModel.id }).from(LabelModel).where(inArray(LabelModel.uuid, req.labelsUUID))
      : [];
    if (labels.length !== req.labelsUUID.length) throw new Error("A selected label no longer exists.");
    const values = {
      title: req.title,
      fileName: req.fileName,
      content: req.content,
      formatType: req.formatType,
      libraryId: library.id,
    };
    const [snippet] = await db
      .insert(SnippetModel)
      .values({ uuid: req.uuid, ...values })
      .onConflictDoUpdate({ target: SnippetModel.uuid, set: values })
      .returning({ id: SnippetModel.id });
    if (labels.length) {
      await db
        .insert(SnippetLabelModel)
        .values(labels.map((label) => ({ snippetId: snippet.id, labelId: label.id })))
        .onConflictDoNothing();
    }
  });
}

export function upsertLibrary(req: LibraryReq) {
  return save(async (db) => {
    if (
      req.uuid &&
      !(await db.select({ id: LibraryModel.id }).from(LibraryModel).where(eq(LibraryModel.uuid, req.uuid))).length
    ) {
      throw new Error(`Cannot find library ${req.uuid}.`);
    }
    if ((await db.select({ id: LibraryModel.id }).from(LibraryModel).where(eq(LibraryModel.name, req.name))).length) {
      throw new Error(`A library named ${req.name} already exists.`);
    }
    await db
      .insert(LibraryModel)
      .values({ uuid: req.uuid, name: req.name })
      .onConflictDoUpdate({ target: LibraryModel.uuid, set: { name: req.name } });
  });
}

export function upsertLabel(req: LabelReq) {
  return save(async (db) => {
    if (
      req.uuid &&
      !(await db.select({ id: LabelModel.id }).from(LabelModel).where(eq(LabelModel.uuid, req.uuid))).length
    ) {
      throw new Error(`Cannot find label ${req.uuid}.`);
    }
    if ((await db.select({ id: LabelModel.id }).from(LabelModel).where(eq(LabelModel.title, req.title))).length) {
      throw new Error(`A label named ${req.title} already exists.`);
    }
    const values = { title: req.title, colorHex: req.colorHex };
    await db
      .insert(LabelModel)
      .values({ uuid: req.uuid, ...values })
      .onConflictDoUpdate({ target: LabelModel.uuid, set: values });
  });
}

export function deleteSnippet(uuid: string) {
  return save(async (db) => {
    const [snippet] = await db.select({ id: SnippetModel.id }).from(SnippetModel).where(eq(SnippetModel.uuid, uuid));
    if (!snippet) throw new Error(`Cannot find snippet ${uuid}.`);
    await db.delete(SnippetLabelModel).where(eq(SnippetLabelModel.snippetId, snippet.id));
    await db.delete(SnippetModel).where(eq(SnippetModel.id, snippet.id));
  });
}
