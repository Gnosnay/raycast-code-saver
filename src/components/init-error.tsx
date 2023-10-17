import { Action, ActionPanel, Detail, openExtensionPreferences, getPreferenceValues } from "@raycast/api";
import { DB_NAME } from "../lib/constants/db-name";

export default function InitError({ errMarkdown }: { errMarkdown: string }) {
  // const preferences = getPreferenceValues<Preferences>();

  // const message = `# Failed to initialize your snippets store.
  // 1. [Click here](${preferences.dbFolder}) to view whether there is one ${DB_NAME}.
  // 2. Press **Enter** to open Raycast extension preferences.
  // 3. Fill in the folder where \`${DB_NAME}\` is.`;

  return (
    <Detail
      navigationTitle="Failed to initialize your snippets store"
      markdown={errMarkdown}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
