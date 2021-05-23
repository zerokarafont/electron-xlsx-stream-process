import type { CustomWorkerThreadResponse } from "@main/ipc";
import type { IpcRendererEvent } from "electron";
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("ipc", {
  callMain: (channel: string, payload: unknown, param: unknown) => {
    return ipcRenderer.send(channel, payload, param);
  },
  answerMain: (
    channel: string,
    listener: (
      event: IpcRendererEvent,
      data: CustomWorkerThreadResponse
    ) => void
  ) => {
    return ipcRenderer.on(channel, listener);
  },
  cleanup: (channel: string, listener: (arg: unknown) => void) => {
    return ipcRenderer.removeListener(channel, listener);
  },
});
