import { app, BrowserWindow, ipcMain, nativeImage, Tray, Menu } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import https from "node:https";
createRequire(import.meta.url);
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win = null;
let tray = null;
let isQuitting = false;
function createWindow() {
  win = new BrowserWindow({
    width: 360,
    height: 420,
    minWidth: 300,
    minHeight: 300,
    maxWidth: 800,
    maxHeight: 1e3,
    alwaysOnTop: true,
    resizable: true,
    frame: false,
    // frameless for widget feel
    titleBarStyle: "hiddenInset",
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs")
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
  win.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win == null ? void 0 : win.hide();
    }
  });
}
function createTray() {
  let trayIcon;
  try {
    const emptyIconData = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    trayIcon = nativeImage.createFromDataURL(`data:image/png;base64,${emptyIconData}`);
    trayIcon = trayIcon.resize({ width: 16, height: 16 });
  } catch (error) {
    console.warn("Could not create tray icon, using empty fallback:", error);
    trayIcon = nativeImage.createEmpty();
  }
  tray = new Tray(trayIcon);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show Widget",
      click: () => {
        if (win) {
          win.show();
        } else {
          createWindow();
        }
      }
    },
    {
      label: "Hide Widget",
      click: () => {
        win == null ? void 0 : win.hide();
      }
    },
    {
      type: "separator"
    },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  tray.setToolTip("TakeBridge Widget");
  tray.setContextMenu(contextMenu);
  tray.on("click", () => {
    if (win) {
      if (win.isVisible()) {
        win.hide();
      } else {
        win.show();
      }
    } else {
      createWindow();
    }
  });
}
app.on("window-all-closed", () => {
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else if (win) {
    win.show();
  }
});
app.on("before-quit", () => {
  isQuitting = true;
});
ipcMain.handle("run-task", async (_event, payload) => {
  const { task, baseUrl, userId } = payload;
  console.log("Got task from widget:", task);
  console.log("Using control plane URL:", baseUrl);
  console.log("Using user ID:", userId);
  try {
    const fetch = (await import("./index-DiX2KYRr.js")).default;
    const httpsAgent = baseUrl.startsWith("https://") ? new https.Agent({
      rejectUnauthorized: false
      // Allow self-signed certificates for localhost
    }) : void 0;
    const body = {
      task,
      user_id: userId
    };
    console.log("Sending request to control plane:", JSON.stringify(body, null, 2));
    const res = await fetch(`${baseUrl}/app/run_task`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      agent: httpsAgent
      // Use custom agent for HTTPS with self-signed certs
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    const json = await res.json();
    return json;
  } catch (err) {
    console.error("run-task error:", err);
    throw new Error((err == null ? void 0 : err.message) || "Failed to call control plane");
  }
});
app.whenReady().then(() => {
  createWindow();
  createTray();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
