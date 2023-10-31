import { usePromise } from "@raycast/utils";
import { LabelModel } from "../../schema/label";
import { LibraryModel } from "../../schema/library";
import { SnippetModel } from "../../schema/snippet";
import { GetDBInstance } from "../storage/db-instance";
import { desc, inArray, eq } from "drizzle-orm";
import { Label, Library, LibraryReq, Snippet, SnippetCreationReq } from "../types/dto";
import { UsePromiseReturnType } from "@raycast/utils/dist/types";
import { SnippetLabelModel } from "../../schema/snippet-label";
import { DB_NAME } from "../constants/db-name";

export function useDataFetch<T>(
    data: "label" | "library",
) {
    // for now we just return all data as default
    // because raycast doesn't have hit bottom loading
    // or next page feature
    const model = function (t: typeof data) {
        switch (t) {
            case "label":
                return LabelModel;
            case "library":
                return LibraryModel;
        }
    }(data);

    return usePromise(
        async (model) => {
            const response = await GetDBInstance().select()
                .from(model).orderBy(model.uuid);
            return response as T[];
        },
        [model]
    )
}

export function fetchSnippets(): UsePromiseReturnType<Snippet[]> {
    return usePromise(
        async () => {
            const snippets = await GetDBInstance().query.SnippetModel.findMany({
                with: {
                    snippetsToLabels: {
                        with: {
                            label: {
                                columns: {
                                    uuid: true,
                                    colorHex: true,
                                    title: true,
                                }
                            }
                        }
                    },
                    library: { columns: { uuid: true, name: true } }
                },
                orderBy: [desc(SnippetModel.uuid), desc(SnippetModel.updateAt)]
            })
            return snippets.map(s => {
                return {
                    ...s,
                    library: s.library as Library,
                    labels: s.snippetsToLabels.map(relation => relation.label as Label),
                } as Snippet
            })
        },
        []
    )
}

export async function createSnippet(req: SnippetCreationReq): Promise<string | undefined> {
    try {
        // map to {uuid: id}
        const labelUUIDtoID = req.labelsUUID.length === 0 ? {} : Object.fromEntries(
            (await GetDBInstance().select({ id: LabelModel.id, uuid: LabelModel.uuid })
                .from(LabelModel).where(inArray(LabelModel.uuid, req.labelsUUID)))
                .map(e => [e.uuid, e.id])
        );
        const libraryIDRes = await GetDBInstance().query.LibraryModel.findFirst({
            columns: { id: true },
            where: eq(LibraryModel.uuid, req.libraryUUID)
        });
        if (Object.keys(labelUUIDtoID).length != req.labelsUUID.length) {
            return `# Can not find related labels
    The labels with following uuid can not be found:
    \`${JSON.stringify(Object.keys(labelUUIDtoID).filter(k => !req.labelsUUID.includes(k)))}\`
    `;
        }
        if (libraryIDRes === undefined) {
            return `# Can not find related library
    The libray with uuid \`${req.libraryUUID}\` can not be found.
    `;
        }
        const { id: libraryID } = libraryIDRes;

        await GetDBInstance().transaction(async txn => {
            const res = await txn.insert(SnippetModel).values({
                title: req.title,
                fileName: req.fileName,
                content: req.content,
                formatType: req.formatType,
                libraryId: libraryID,
            }).returning({ id: SnippetModel.id });
            const snippetLabelRelations = res.map(
                snippet => Object.values(labelUUIDtoID).map(labelId => {
                    return {
                        snippetId: snippet.id,
                        labelId: labelId
                    }
                })
            ).flat();
            if (snippetLabelRelations.length > 0) {
                await txn.insert(SnippetLabelModel).values(snippetLabelRelations);
            }
        });
    } catch (exc) {
        return `# Failed to create rows in database
The following steps may help to recover:
- make sure the folder you give exists
- make sure we can read and write \`${DB_NAME}\` under the folder you give
Error details are as follows:
\`\`\`
${exc instanceof Error ? exc.stack : String(exc)}
\`\`\`
`;
    }
    return undefined
}

export async function createOrUpdateLibrary(req: LibraryReq): Promise<string | undefined> {
    // when error happened, then return string
    // when update succeed, then return undefined
    // when creation succeed, then return Library
    try {
        if (req.uuid) {
            const res = await GetDBInstance().query.LibraryModel.findFirst({
                columns: { id: true }, where: eq(LibraryModel.uuid, req.uuid),
            });
            if (res === undefined) {
                return `# Can not find related library
The libray with uuid \`${req.uuid}\` can not be found.
`;
            }
        }

        const res = await GetDBInstance().query.LibraryModel.findFirst({
            columns: { id: true }, where: eq(LibraryModel.name, req.name),
        });
        if (res !== undefined) {
            return `# Library's name is duplicated.
\`${req.name}\` is duplicated, please try another name.
`;
        }

        // upsert
        const resSet = await GetDBInstance().insert(LibraryModel)
            .values({ uuid: req.uuid, name: req.name })
            .onConflictDoUpdate({ target: LibraryModel.uuid, set: { name: req.name } })
            .returning();
        const upsetRes = resSet.pop()
        if (upsetRes === undefined) {
            return `# No raleted information returned from database.
Please contact developer to solve this problem.
`;
        }
        return undefined;
    } catch (exc) {
        return `# Failed to create rows in database
The following steps may help to recover:
- make sure the folder you give exists
- make sure we can read and write \`${DB_NAME}\` under the folder you give
Error details are as follows:
\`\`\`
${exc instanceof Error ? exc.stack : String(exc)}
\`\`\`
`;
    }
}