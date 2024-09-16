const { app, BrowserWindow, ipcMain, dialog, Menu } = require("electron");
const path = require("path");
const LCUConnector = require("lcu-connector");
const axios = require("axios");
const https = require("https");

const connector = new LCUConnector();
var clientData = null;
var clientApiUrl = null;
var clientApiAuth = null;

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    minHeight: 600,
    minWidth: 800,
    icon: path.join(__dirname, "build/icon.ico"),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  connector.on("connect", (data) => {
    clientData = data;
    clientApiAuth = Buffer.from(`${data["username"]}:${data["password"]}`).toString("base64");
    clientApiUrl = data["protocol"] + "://" + data["address"] + ":" + data["port"];
    win.loadFile(path.join(__dirname, "index.html"));
  });

  connector.on("disconnect", () => {
    clientData = null;
    clientApiAuth = null;
    clientApiUrl = null;
    win.loadFile(path.join(__dirname, "waiting.html"));
  });

  connector.start();

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
    options.icon = path.join(__dirname, "build/icon.ico");
    dialog
      .showMessageBox(options)
      .then((result) => {
        event.sender.send("showMessageBoxResponse", result.response);
      })
      .catch((err) => {
        console.log(err);
      });
  });

  win.loadFile(path.join(__dirname, "waiting.html"));
};

app.on("ready", createWindow);
Menu.setApplicationMenu(null);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
