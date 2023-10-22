import { List } from "@raycast/api";
import { InitWrapper } from "./components/init-wrapper";
import { useDataFetch } from "./lib/hooks/use-data-ops";
import { Snippet } from "./lib/types/dto";

export default function SearchSnippets() {
  const { isLoading, data, error } = useDataFetch<Snippet>('snippet');
  return (
    <InitWrapper>
      <List
        searchBarPlaceholder="Search Snippets"
        isLoading={isLoading}
      >
      </List>
    </InitWrapper>
  );
}