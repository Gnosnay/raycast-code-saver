import { getPreferenceValues } from "@raycast/api";
import { AsyncState, usePromise } from "@raycast/utils";
import { LabelModel } from "../../schema/label";
import { LibraryModel } from "../../schema/library";
import { SnippetModel } from "../../schema/snippet";
import { GetDBInstance } from "../storage/db-instance";
import { desc, sql } from "drizzle-orm";

const DEFAULT_PAGE_SIZE = 10;

/**
 * Authenticated wrapper for interacting with Cacher API with `useFetch`.
 */
export function useDataFetch<T>(
    data: "label" | "library" | "snippet",
    option?: {
        cursorUUID: string,
        pageSize?: number,
    }
) {
    const model = function (t: typeof data) {
        switch (t) {
            case "label":
                return LabelModel;
            case "library":
                return LibraryModel;
            case "snippet":
                return SnippetModel;
        }
    }(data);

    if (option === undefined) {
        return usePromise(
            async (model) => {
                const response = await GetDBInstance().select()
                    .from(model).orderBy(model.uuid);
                return response as T[];
            },
            [model]
        )
    }
    return usePromise(
        async (model, option) => {
            const res = await GetDBInstance().select()
                .from(model).orderBy(model.uuid)
                .where(sql`${model.uuid} > ${option.cursorUUID}`)
                .limit(
                    option.pageSize === undefined ? DEFAULT_PAGE_SIZE : option.pageSize
                );
            return res as T[]
        },
        [model, option]
    )
}
