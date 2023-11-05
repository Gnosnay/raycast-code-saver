import { Action, ActionPanel, Icon } from "@raycast/api";
import { Snippet } from "../../lib/types/dto";
import UpsertSnippetEntry from "../creation/create-snippet-entry";

interface ItemActionsProps {
  snippet: Snippet;
  onUpdateSuccess?: () => void;
}

export function ItemActions({ snippet, onUpdateSuccess }: ItemActionsProps) {
  return (
    <ActionPanel>
      <Action.CopyToClipboard title="Copy to Clipboard" content={snippet.content} />
      <Action.Paste content={snippet.content} />
      <Action.Push icon={Icon.Brush} title="Update This Snippet" target={<UpsertSnippetEntry props={
        {
          ...snippet,
          snippetUUID: snippet.uuid,
          labelsUUID: snippet.labels.map(l => l.uuid),
          libraryUUID: snippet.library.uuid,
          onUpdateSuccess,
        }
      } />} />
      <Action.CreateSnippet title="Save as Raycast Snippet" snippet={{ name: snippet.title, text: snippet.content }} />
    </ActionPanel>
  );
}
