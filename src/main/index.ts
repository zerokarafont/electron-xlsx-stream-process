import { app, BrowserWindow, Tray } from "electron";
import { add } from "@common/utils";
import { join } from "path";
import { pathToFileURL } from "url";

add(1, 2);

const isDevelopment = process.env.NODE_ENV === "development";

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, "preload.js"),
    },
    show: false,
  }).once("ready-to-show", () => {
    win.show();
  });

  const icon = join(__dirname, "public/icon.ico");
  const tray = new Tray(icon);
  tray.setToolTip("防火墙日志分析工具");

  if (isDevelopment) {
    win.loadURL("http://localhost:3000");
    win.webContents.toggleDevTools();
  } else {
    win.loadURL(
      pathToFileURL(join(__dirname, "../renderer/index.html")).toString()
    );
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
