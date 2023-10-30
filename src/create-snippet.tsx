import { LaunchProps } from "@raycast/api";
import CreateSnippetEntry, { SnippetValues, } from "./components/create-snippet/create-snippet-entry";
import { InitWrapper } from "./components/init/init-wrapper";

export default function CreateSnippet(props: LaunchProps<{ draftValues: SnippetValues }>) {
  return (
    <InitWrapper>
      <CreateSnippetEntry props={props} />
    </InitWrapper>
  );
}