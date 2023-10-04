import { Action, ActionPanel, Detail, openExtensionPreferences, getPreferenceValues } from "@raycast/api";
import { DB_NAME } from "../lib/constants/db-name";
import { FC, useState } from "react"
import { boolean } from "drizzle-orm/mysql-core";

export interface InitWrapperProps {
  children: React.ReactNode;
}

type CheckingStatus = '⌛' | '✅' | '🚨'
type InitStatus = 'ongoing' | 'allpass' | 'failed'

export const InitWrapper: FC<InitWrapperProps> = ({ children }) => {
  // TODO use detail to give one spining effects
  const [initChecks, setInitChecks] = useState<[CheckingStatus, string][]>([]);
  const [initStatus, setInitStatus] = useState<InitStatus>('ongoing');

  setTimeout(() => {
    setInitChecks([...initChecks, ['⌛', 'zxc']])
  }, 1000)

  const checkingPrompt = `## Trying to initilize the application
${initChecks.map(([status, prompt]) => `- ${status} ${prompt}`).join("\n")}
`
  return initStatus != 'allpass' ? <Detail
    navigationTitle="Failed to initialize your snippets store"
    markdown={checkingPrompt}
    actions={
      <ActionPanel>
        <Action title="Change Checking" onAction={() => { setInitStatus('allpass') }} />
      </ActionPanel>
    }
  /> : <>{children}</>
}
