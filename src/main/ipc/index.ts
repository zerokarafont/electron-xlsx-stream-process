import os from "os";
import fs from "fs";
import path from "path";
import { ipcMain, webContents } from "electron";
import {
  EventConstants,
  TaskNameConstants,
  EnumTaskStatus,
} from "@common/constants";
import { startWorkerThread, terminateWorkerThread } from "@main/work_thread";
import fileSize from "filesize";
import config from "@common/config";
import { clearMD5Storage } from "@main/storage";

export type CustomWorkerThreadResponse = {
  status: EnumTaskStatus;
  msg: string;
  data?: unknown;
  err?: string;
};

export default function registerIpcEvents(webContentID: number): void {
  global.webContentID = webContentID;

  ipcMain.on(EventConstants.REQUEST_DB_SIZE, (event) => {
    try {
      const dbpath = path.resolve(os.tmpdir(), config.dbName);
      const { size } = fs.statSync(dbpath);
      event.sender.send(EventConstants.REQUEST_DB_SIZE, {
        status: EnumTaskStatus.SUCCESS,
        msg: "成功同步缓存信息",
        data: fileSize(size),
      });
    } catch (e) {
      event.sender.send(EventConstants.REQUEST_DB_SIZE, {
        status: EnumTaskStatus.ERROR,
        msg: "获取缓存信息出错",
        err: e.message,
        data: 0,
      });
    }
  });

  ipcMain.on(EventConstants.CLEAR_DB_CACHE, async (event) => {
    try {
      const dbpath = path.resolve(os.tmpdir(), config.dbName);
      if (fs.existsSync(dbpath)) {
        fs.unlinkSync(dbpath);
        await clearMD5Storage();
      }
      event.sender.send(EventConstants.CLEAR_DB_CACHE, {
        status: EnumTaskStatus.SUCCESS,
        msg: "成功清除缓存",
        data: 0,
      });
    } catch (e) {
      event.sender.send(EventConstants.CLEAR_DB_CACHE, {
        status: EnumTaskStatus.ERROR,
        msg: "清理缓存出错",
        err: e.message,
      });
    }
  });

  ipcMain.on(EventConstants.WORKER_TASK_ERROR, (e: unknown) => {
    // 这里监听的是主进程另一处的通过emit直接发送来的错误信息, 然而electron的ipcMain
    // 扩展了这里第一个参数为IpcMainEvent事件 listener: (event: Electron.IpcMainEvent, ...args: any[]) => void
    // ts无法智能判断, 所以这里使用unkonwn
    console.log("e", e);

    // 主进程直接向渲染进程发送消息
    webContents.fromId(webContentID).send(EventConstants.START_WROKER, {
      status: EnumTaskStatus.ERROR,
      msg: "处理任务出错",
      err: (e as Error).message,
    });
  });

  ipcMain.on(EventConstants.START_WROKER, async (event, data, param) => {
    try {
      await startWorkerThread(
        TaskNameConstants.PARSE_LOG,
        JSON.parse(data),
        param
      );
      event.sender.send(EventConstants.START_WROKER, {
        status: EnumTaskStatus.SUCCESS,
        msg: "任务处理结束",
      });

      // 同步缓存信息
      const dbpath = path.resolve(os.tmpdir(), config.dbName);
      const { size } = fs.statSync(dbpath);
      webContents.fromId(webContentID).send(EventConstants.REQUEST_DB_SIZE, {
        status: EnumTaskStatus.SUCCESS,
        msg: "成功同步缓存信息",
        data: fileSize(size),
      });
    } catch (e) {
      event.sender.send(EventConstants.START_WROKER, {
        status: EnumTaskStatus.ERROR,
        msg: "处理任务出错",
        err: e.message,
      });
    }
  });

  ipcMain.on(EventConstants.TERMINATE_WORKER, async (event) => {
    try {
      const msg = await terminateWorkerThread();
      event.sender.send(EventConstants.TERMINATE_WORKER, {
        status: EnumTaskStatus.IN_PROGRESS,
        msg,
      });
    } catch (e) {
      event.sender.send(EventConstants.TERMINATE_WORKER, {
        status: EnumTaskStatus.ERROR,
        msg: "任务没有成功停止",
        err: e.message,
      });
    }
  });
}
