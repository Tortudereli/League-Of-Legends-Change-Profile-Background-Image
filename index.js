const { app, BrowserWindow, ipcMain, dialog, Menu } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("node:path");
const axios = require("axios");
const https = require("https");
const cp = require("child_process");

let lcuData = {
  username: "riot",
  password: null,
  port: null,
};

function getLcuData(callback) {
  const command = `powershell -Command "Get-CimInstance Win32_Process -Filter \\"Name = 'LeagueClientUx.exe'\\\" | Select-Object CommandLine | Format-List"`;

  cp.exec(command, (err, stdout, stderr) => {
    if (err || !stdout || stderr) {
      console.log("Hata: ", err);
      callback("error");
      return;
    }

    const output = stdout
      .replace(/--\s*(\S+)/g, "--$1")
      .replace(/\s+/g, "")
      .replace(/\r?\n|\r/g, "")
      .trim();

    lcuData.password = output.match(/--remoting-auth-token=([A-Za-z0-9\-_]+)/)[1] != "null" ? output.match(/--remoting-auth-token=([A-Za-z0-9\-_]+)/)[1] : null;
    lcuData.port = output.match(/--app-port=([0-9]+)/)[1] != "null" ? output.match(/--app-port=([0-9]+)/)[1] : null;

    callback(lcuData);
  });
}

let appRun = false;

autoUpdater.autoInstallOnAppQuit = true;

app.setName("League Of Legends Change Background Image");

var clientApiUrl = null;
var clientApiAuth = null;

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
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

  mainWindow.loadFile(path.join(__dirname, "assets/html/waiting.html"));

  setInterval(() => {
    getLcuData((x) => {
      if (x != "error") {
        console.log(x);
        const { username, password, port } = x;
        if (port != null && password != null && !appRun) {
          startApp(username, password, port);
          appRun = true;
        } else if (port == null || (password == null && appRun)) {
          stopApp();
          appRun = false;
        }
      } else {
        stopApp();
        appRun = false;
      }
    });
  }, 10000);

  function startApp(username, password, port) {
    clientApiAuth = Buffer.from(`${username}:${password}`).toString("base64");
    clientApiUrl = "https://127.0.0.1:" + port;
    mainWindow.loadFile(path.join(__dirname, "index.html"));
  }

  function stopApp() {
    clientApiAuth = null;
    clientApiUrl = null;
    mainWindow.loadFile(path.join(__dirname, "assets/html/waiting.html"));
  }

  // mainWindow.webContents.openDevTools();
  Menu.setApplicationMenu(null);
};

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
      console.err(err);
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

process.on('uncaughtException', (error) => {
  console.error(error);
  process.exit(1);
});