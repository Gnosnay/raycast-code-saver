import { Action, ActionPanel, Detail, openExtensionPreferences, getPreferenceValues } from "@raycast/api";
import { DB_NAME } from "../lib/constants/db-name";
import { FC, useState, useEffect } from "react"
import { boolean } from "drizzle-orm/mysql-core";
import { type } from "os";
import { Some, None, Option } from "ts-results-es";
import InitError from "./init-error";
import { checkDBStorePath, upgradeDBSchema, InitTaskFunc, backupDB } from "./init-tasks";

export interface InitWrapperProps {
  children: React.ReactNode;
}

// '❓' waiting for execution
// '⌛' during execution
// '✅' executed successfully
// '🚨' something wrong when it is executed
type InitTaskStatus = '❓' | '⌛' | '✅' | '🚨';
type InitStatus = 'ongoing' | 'allpass' | 'failed';
type TaskDescOrErrMsg = string;
type InitTask = [InitTaskStatus, TaskDescOrErrMsg, InitTaskFunc];

export const InitWrapper: FC<InitWrapperProps> = ({ children }) => {
  console.log("rendering!");
  const [initTasks, setInitTasks] = useState<InitTask[]>([
    ['❓', 'check db store path', checkDBStorePath],
    ['❓', 'backup the DB Store', backupDB],
    ['❓', 'upgrade db schema', upgradeDBSchema],
  ]);
  const [execTaskId, setExecTaskId] = useState<number>(0);
  const [progressBar, setProgressBar] = useState<string>('');

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
        ['🚨', String(err), task[2]] : task));
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
  // by right the errMsg will always be valid markdown string
  // because we use it when and only when initStatus is failed
  const errMsg = initTasks.find(([status, ,]) => status == '🚨')?.[1];

  // use it to impl loading animation
  useEffect(() => {
    console.log("useEffect, set timeout");
    const timeout = setTimeout(() => {
      const newBar = Array((progressBar.length + 1) % 4).fill('.').join('');
      setProgressBar(newBar);
    }, 500);
    if (initStatus != 'ongoing') {
      console.log("useEffect, not on going, clear timeout");
      clearTimeout(timeout)
    }
    return () => {
      console.log("useEffect, unmount, clear timeout");
      clearTimeout(timeout)
    }
  }, [initTasks, execTaskId, progressBar])

  return initStatus == 'allpass' ? <>{children}</> : (
    initStatus == 'failed' ? <InitError errMarkdown={errMsg ? errMsg : ''} /> : <Detail
      navigationTitle="Failed to initialize your snippets store"
      markdown={checkingPrompt}
      isLoading={initStatus == 'ongoing' ? true : false}
      actions={
        <ActionPanel>
          <Action title="Change Checking" onAction={() => { console.log("checking") }} />
        </ActionPanel>
      }
    />
  )
}
