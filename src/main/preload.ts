import { contextBridge } from "electron";
import { ipcRenderer } from "electron-better-ipc";

contextBridge.exposeInMainWorld("ipc", {
  callMain: async (channel: string, data?: unknown) => {
    return ipcRenderer.callMain(channel, data);
  },
  answerMain: async (channel: string, callback: (data: unknown) => unknown) => {
    return ipcRenderer.answerMain(channel, callback);
  },
});
