import { usePromise } from "@raycast/utils";
import { LabelModel } from "../../schema/label";
import { LibraryModel } from "../../schema/library";
import { SnippetModel } from "../../schema/snippet";
import { GetDBInstance } from "../storage/db-instance";
import { desc } from "drizzle-orm";
import { Label, Library, Snippet } from "../types/dto";
import { UsePromiseReturnType } from "@raycast/utils/dist/types";

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