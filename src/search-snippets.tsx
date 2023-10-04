import { List } from "@raycast/api";
import { InitWrapper } from "./components/init-wrapper";

export default function SearchSnippets() {
  return (
    <InitWrapper>
      <List
        searchBarPlaceholder="Search Snippets"
      >
      </List>
    </InitWrapper>
  );
}