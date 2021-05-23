import { app, BrowserWindow, Tray, Menu } from "electron";
import { join } from "path";
import { pathToFileURL } from "url";
import configureSecurityStragety from "@main/security";
import registerIpcEvents from "@main/ipc";
import { configureLocalStorage } from "@main/storage";

const isDevelopment = process.env.NODE_ENV === "development";

let win: BrowserWindow | null = null;
let willQuitApp = false;
let tray: Tray | null = null;

function createWindow() {
  const icon = join(__dirname, "../../", "public/icon.png");

  win = new BrowserWindow({
    width: 800,
    height: 600,
    icon,
    titleBarStyle: "hidden",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: true,
      preload: join(__dirname, "preload.js"),
    },
    show: false,
  }).once("ready-to-show", () => {
    win!.show();
  });

  // 应用假关闭 回到托盘
  win.on("close", (e) => {
    if (willQuitApp) {
      win = null;
    } else {
      e.preventDefault();
      win?.hide();
    }
  });

  const contextMenu = Menu.buildFromTemplate([{ label: "退出", role: "quit" }]);

  tray = new Tray(icon);
  tray.on("click", () => win?.show());
  tray.setToolTip("防火墙日志分析工具");
  tray.setContextMenu(contextMenu);

  if (isDevelopment) {
    win.loadURL("http://localhost:3000");
    win.webContents.toggleDevTools();
  } else {
    win.loadURL(
      pathToFileURL(join(__dirname, "../renderer/index.html")).toString()
    );
  }

  return win.id;
}

/**
 * 禁止多开
 */
function forbiddenMultipleInstance() {
  const lock = app.requestSingleInstanceLock();
  if (!lock) {
    app.quit();
  } else {
    app.on("second-instance", (event, commandLine, workingDirectory) => {
      // 当运行第二个实例时, 将会聚集到myWindow这个窗口
      win?.show();
    });
  }
}

async function setupApp() {
  const id = await app.whenReady().then(createWindow);
  configureSecurityStragety();
  configureLocalStorage();
  registerIpcEvents(id);
  forbiddenMultipleInstance();
}

setupApp();

app.on("before-quit", () => {
  willQuitApp = true;
  win?.close();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    // 点击托盘会触发弹出主窗口
    win?.show();
  }
});

process.on("uncaughtException", (err) => {
  console.log("[uncaughtException] ", err);
});

process.on("unhandledRejection", (err) => {
  console.log("[unhandledRejection] ", err);
});
