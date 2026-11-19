import { Detail, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { FC } from "react";
import { DB_NAME } from "../../lib/constants/db-name";
import { initializeDatabase } from "../../lib/storage/db-instance";
import { WrongKeyError } from "../../lib/storage/encrypted-store";
import InitError from "./init-error";

function errorMarkdown(error: Error) {
  const { dbFolder } = getPreferenceValues<Preferences>();
  const hints =
    error instanceof WrongKeyError
      ? `The following steps may help to recover:
- Check that the encryption key in the extension preferences matches the one used to create \`${DB_NAME}\`.
- If the file is damaged, restore a dated backup (\`${DB_NAME}.YYYY-MM-DD\`) from \`${dbFolder}\`.`
      : `The following steps may help to recover:
- Make sure the folder \`${dbFolder}\` exists and Code Saver can read and write \`${DB_NAME}\` in it.
- Dated backups (\`${DB_NAME}.YYYY-MM-DD\`) are kept in the same folder.`;
  return `## Could not open the encrypted database

${hints}

Error details:
\`\`\`
${error.message}
\`\`\`
`;
}

export const InitWrapper: FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoading, error } = usePromise(initializeDatabase);
  if (error) return <InitError errMarkdown={errorMarkdown(error)} />;
  if (isLoading) return <Detail isLoading markdown="Opening the encrypted snippet store…" />;
  return <>{children}</>;
};
