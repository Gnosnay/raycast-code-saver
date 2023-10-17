import { Action, ActionPanel, Detail, openExtensionPreferences, getPreferenceValues } from "@raycast/api";
import { DB_NAME } from "../lib/constants/db-name";
import { FC, useState, useEffect } from "react"
import { boolean } from "drizzle-orm/mysql-core";
import { type } from "os";
import { Some, None, Option } from "ts-results-es";
import { stringify } from "querystring";

export interface InitWrapperProps {
  children: React.ReactNode;
}

type DBVersionCheckError = 'DB version is wrong' | '';
type InitError = DBVersionCheckError;

// '❓' waiting for execution
// '⌛' during execution
// '✅' executed successfully
// '🚨' something wrong when it is executed
type InitTaskStatus = '❓' | '⌛' | '✅' | '🚨';
type InitStatus = 'ongoing' | 'allpass' | 'failed';
type TaskDescOrErrMsg = string;
type InitTaskFunc = () => Promise<Option<InitError>>
type InitTask = [InitTaskStatus, TaskDescOrErrMsg, InitTaskFunc];

const checkDBStorePath: InitTaskFunc = async () => {
  await new Promise(f => setTimeout(f, 1000));
  return None
};

const checkDBSchemaExistence: InitTaskFunc = async () => {
  await new Promise(f => setTimeout(f, 1000));
  return None
};

const checkDBSchemaVersion: InitTaskFunc = async () => {
  await new Promise(f => setTimeout(f, 1000));
  return Some('DB version is wrong' as DBVersionCheckError)
};

const upgradeDBSchema: InitTaskFunc = async () => {
  await new Promise(f => setTimeout(f, 1000));
  return None
};

export const InitWrapper: FC<InitWrapperProps> = ({ children }) => {
  const [initTasks, setInitTasks] = useState<InitTask[]>([
    ['❓', 'check db store path', checkDBStorePath],
    ['❓', 'check db schema existence', checkDBSchemaExistence],
    ['❓', 'check db schema version', checkDBSchemaVersion],
    ['❓', 'upgrade db schema', upgradeDBSchema],
  ]);
  const [execTaskId, setExecTaskId] = useState<number>(0);
  const [progressBar, setProgressBar] = useState<string>('');

  setTimeout(() => {
    const newBar = Array((progressBar.length + 1) % 4).fill('.').join('');
    setProgressBar(newBar);
  }, 500)

  useEffect(() => {
    console.log("use effect, execTaskId:", execTaskId);
    let ignore = false;
    const clearFunc = () => {
      ignore = true;
      console.log("clear effects, execTaskId:", execTaskId);
    }
    if (execTaskId >= initTasks.length) {
      return clearFunc;
    }
    const [status, desc, initFunc] = initTasks[execTaskId];

    if (status != '❓') {
      console.log("status is not ❓. (execTaskId, desc, status):", execTaskId, desc, status);
      return clearFunc;
    }
    console.log(
      "use effect, status is not executed. (execTaskId, desc, ignore):",
      execTaskId, desc, ignore
    );
    if (ignore) {
      return clearFunc;
    }
    setInitTasks(initTasks.map((task, idx) => idx == execTaskId ?
      ['⌛', task[1], task[2]] : task));
    console.log("use effect, executed func", execTaskId);
    initFunc().then(res => {
      console.log("use effect, get result of func", execTaskId);
      if (res.none) {
        console.log("use effect, chanege status to success", execTaskId);
        setInitTasks(initTasks.map((task, idx) => idx == execTaskId ?
          ['✅', task[1], task[2]] : task));
        console.log("use effect, change to next id, curr id:", execTaskId);
        setExecTaskId(execTaskId + 1);
      } else {
        console.log("use effect, chanege status to failed", execTaskId);
        setInitTasks(initTasks.map((task, idx) => idx == execTaskId ?
          ['🚨', res.val, task[2]] : task));
      }
    }).catch(err => {
      console.log("use effect, unexpected issue. chanege status to failed", execTaskId);
      setInitTasks(initTasks.map((task, idx) => idx == execTaskId ?
        ['🚨', stringify(err), task[2]] : task));
    })
    return clearFunc;
  }, [execTaskId])

  const initStatusSet = new Set<InitTaskStatus>(initTasks.map(e => e[0]));
  const initStatus: InitStatus = initStatusSet.has('🚨') ? 'failed' : (
    initStatusSet.has('❓') || initStatusSet.has('⌛') ? 'ongoing' : 'allpass'
  )

  const checkingPrompt = `## Trying to synchronize the application
${initTasks.map(
    ([status, prompt]) => `- ${status} ${prompt} ${status == '⌛' ? progressBar : ''}`).join("\n")
    }
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
