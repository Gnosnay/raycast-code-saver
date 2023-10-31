import { LaunchProps } from "@raycast/api";
import CreateOrUpdateSnippetEntry, { SnippetValues, } from "./components/creation/create-snippet-entry";
import { InitWrapper } from "./components/init/init-wrapper";

export default function CreateSnippet(props: LaunchProps<{ draftValues: SnippetValues }>) {
  return (
    <InitWrapper>
      <CreateOrUpdateSnippetEntry props={props} />
    </InitWrapper>
  );
}