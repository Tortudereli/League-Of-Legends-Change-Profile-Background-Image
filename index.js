const { app, BrowserWindow, ipcMain, dialog, Menu } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("node:path");
const LCUConnector = require("lcu-connector");
const axios = require("axios");
const https = require("https");

autoUpdater.autoInstallOnAppQuit = true;

app.setName("League Of Legends Change Background Image");

const connector = new LCUConnector();
var clientData = null;
var clientApiUrl = null;
var clientApiAuth = null;

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, "assets/img/icon.ico"),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  autoUpdater.checkForUpdates();

  autoUpdater.on("update-not-available", () => {
    mainWindow.webContents.send("message", "Uygulama güncel.");
  });

  autoUpdater.on("update-available", () => {
    dialog.showMessageBox({
      icon: path.join(__dirname, "assets/img/icon.ico"),
      message: "Update Available. Downloading...",
      title: "Updater",
      buttons: ["Ok"],
      type: "info",
    });
  });

  autoUpdater.on("update-downloaded", () => {
    dialog.showMessageBox({
      icon: path.join(__dirname, "assets/img/icon.ico"),
      message: "Update downloaded. It will update when the app is closed.",
      title: "Updater",
      buttons: ["Ok"],
      type: "info",
    });
  });

  connector.on("connect", (data) => {
    clientData = data;
    clientApiAuth = Buffer.from(`${data["username"]}:${data["password"]}`).toString("base64");
    clientApiUrl = data["protocol"] + "://" + data["address"] + ":" + data["port"];
    mainWindow.loadFile(path.join(__dirname, "index.html"));
  });

  connector.on("disconnect", () => {
    clientData = null;
    clientApiAuth = null;
    clientApiUrl = null;
    mainWindow.loadFile(path.join(__dirname, "assets/html/waiting.html"));
  });

  connector.start();

  mainWindow.loadFile(path.join(__dirname, "assets/html/waiting.html"));
  // mainWindow.webContents.openDevTools();
  Menu.setApplicationMenu(null);
};

ipcMain.on("checkUpdate", (event, arg) => {});

ipcMain.on("getAppVersion", (event, arg) => {
  event.returnValue = app.getVersion();
});

ipcMain.on("getClientApi", (event, arg) => {
  axios
    .get(clientApiUrl + arg, {
      headers: {
        Authorization: "Basic " + clientApiAuth,
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    })
    .then((response) => {
      event.returnValue = response.data;
    })
    .catch((error) => {
      event.returnValue = null;
    });
});

ipcMain.on("postClientApi", (event, arg) => {
  axios
    .post(clientApiUrl + arg["endpoint"], arg["json"], {
      headers: {
        Authorization: "Basic " + clientApiAuth,
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    })
    .then((response) => {
      event.reply("postClientApiResponse", { success: true, data: response.data });
    })
    .catch((error) => {
      event.reply("postClientApiResponse", { success: false, error: error.message });
    });
});

ipcMain.on("getClientApiImg", (event, arg) => {
  axios
    .get(clientApiUrl + arg, {
      headers: {
        Authorization: "Basic " + clientApiAuth,
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      responseType: "arraybuffer",
    })
    .then((response) => {
      const buffer = Buffer.from(response.data, "binary").toString("base64");
      event.returnValue = buffer;
    })
    .catch((error) => {
      console.error("Hata:", error.message);
    });
});

ipcMain.on("showMessageBox", (event, options) => {
  options.icon = path.join(__dirname, "assets/img/icon.ico");
  dialog
    .showMessageBox(options)
    .then((result) => {
      event.sender.send("showMessageBoxResponse", result.response);
    })
    .catch((err) => {
      console.log(err);
    });
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
