import { Action, ActionPanel } from "@raycast/api";
import { Snippet } from "../../lib/types/dto";

interface ItemActionsProps {
  snippet: Snippet;
}

export function ItemActions({ snippet }: ItemActionsProps) {
  return (
    <ActionPanel>
      <Action.CopyToClipboard title="Copy to Clipboard" content={snippet.content} />
      <Action.Paste content={snippet.content} />
      <Action.CreateSnippet title="Save as Raycast Snippet" snippet={{ name: snippet.title, text: snippet.content }} />
    </ActionPanel>
  );
}
