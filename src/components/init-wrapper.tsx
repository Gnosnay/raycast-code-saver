import { Action, ActionPanel, Detail, openExtensionPreferences, getPreferenceValues } from "@raycast/api";
import { DB_NAME } from "../lib/constants/db-name";
import { FC, useState } from "react"
import { boolean } from "drizzle-orm/mysql-core";

export interface InitWrapperProps {
  children: React.ReactNode;
}

// '❓' waiting for execution
// '⌛' during execution
// '✅' executed successfully
// '🚨' something wrong when it is executed
type CheckingStatus = '❓' | '⌛' | '✅' | '🚨';
type InitStatus = 'ongoing' | 'allpass' | 'failed';

export const InitWrapper: FC<InitWrapperProps> = ({ children }) => {
  const [initChecks, setInitChecks] = useState<[CheckingStatus, string][]>([]);
  const initStatusSet = new Set<CheckingStatus>(initChecks.map(e => e[0]));
  const initStatus: InitStatus = initStatusSet.has('🚨') ? 'failed' : (
    initStatusSet.has('❓') || initStatusSet.has('⌛') ? 'ongoing' : 'allpass'
  )

  setTimeout(() => {
    setInitChecks([...initChecks, ['⌛', 'zxc']])
  }, 1000)

  const checkingPrompt = `## Trying to synchronize the application
${initChecks.map(([status, prompt]) => `- ${status} ${prompt}`).join("\n")}
`
  return initStatus != 'allpass' ? <Detail
    navigationTitle="Failed to initialize your snippets store"
    markdown={checkingPrompt}
    isLoading={initStatus == 'ongoing' ? true : false}
    actions={
      <ActionPanel>
        <Action title="Change Checking" onAction={() => { console.log("checking") }} />
      </ActionPanel>
    }
  /> : <>{children}</>
}
