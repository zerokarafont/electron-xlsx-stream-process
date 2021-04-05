import type { RendererProcessIpc } from "electron-better-ipc";

type ExposedIpcRenderApi = "callMain" | "answerMain";

export type IpcType = Pick<RendererProcessIpc, ExposedIpcRenderApi>;

declare global {
  /** 由electron preload脚本暴露出的ipcRender api */
  const ipc: IpcType;
}
