import type { IpcRenderer, IpcRendererEvent } from "electron";
import type { CustomWorkerThreadResponse } from "@main/ipc";

declare global {
  /** 工作线程事件响应约定格式体 */
  type CustomWorkerThreadResp = CustomWorkerThreadResponse;

  type IpcType = {
    callMain: (channel: string, payload: unknown, param?: unknown) => void;
    answerMain: (
      channel: string,
      listener: (event: IpcRendererEvent, data: CustomWorkerThreadResp) => void
    ) => IpcRenderer;
    cleanup: (
      event: string | symbol,
      listener: (arg: unknown) => void
    ) => IpcRenderer;
  };

  /** 由electron preload脚本暴露出的ipcRender api */
  export const ipc: IpcType;

  namespace NodeJS {
    interface Global {
      /** 全局维护一个MainBrowser ID */
      webContentID: number;
    }
  }
}
