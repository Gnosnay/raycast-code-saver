import { Action, ActionPanel, Icon, Keyboard, useNavigation } from "@raycast/api";
import { Snippet } from "../../lib/types/dto";
import UpsertSnippetEntry from "../creation/create-snippet-entry";
import { deleteSnippet } from "../../lib/hooks/use-data-ops";
import InitError from "../init/init-error";

interface ItemActionsProps {
  snippet: Snippet;
  onUpdateSuccess?: () => void;
}

export function ItemActions({ snippet, onUpdateSuccess }: ItemActionsProps) {
  const { push } = useNavigation();
  return (
    <ActionPanel>
      <Action.CopyToClipboard title="Copy to Clipboard" content={snippet.content} />
      <Action.Paste content={snippet.content} />
      <Action.Push icon={Icon.Brush} title="Update This Snippet" shortcut={Keyboard.Shortcut.Common.Edit}
        target={<UpsertSnippetEntry props={
          {
            ...snippet,
            snippetUUID: snippet.uuid,
            labelsUUID: snippet.labels.map(l => l.uuid),
            libraryUUID: snippet.library.uuid,
            onUpdateSuccess,
          }
        } />} />
      <Action icon={Icon.DeleteDocument} title="Delete This Snippet" onAction={
        async () => {
          const err = await deleteSnippet(snippet.uuid);
          if (err != undefined) {
            push(<InitError errMarkdown={err} />)
          }
          if (onUpdateSuccess) {
            onUpdateSuccess();
          }
        }
      } shortcut={{ modifiers: ["ctrl"], key: "delete" }} />
      <Action.CreateSnippet title="Save as Raycast Snippet" snippet={{ name: snippet.title, text: snippet.content }} />
    </ActionPanel>
  );
}
