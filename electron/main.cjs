const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("node:path");

const APP_URL = process.env.EDUPLEX_APP_URL || "https://openlu.vercel.app";

app.setAppUserModelId("com.eduplex.app");

function estInterne(url) {
  try {
    return new URL(url).origin === new URL(APP_URL).origin;
  } catch {
    return false;
  }
}

function creerFenetre() {
  const fenetre = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1000,
    minHeight: 660,
    backgroundColor: "#0f0f1a",
    autoHideMenuBar: true,
    show: false,
    title: "Eduplex",
    icon: path.join(__dirname, "icon.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  fenetre.once("ready-to-show", () => fenetre.show());

  fenetre.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  fenetre.webContents.on("will-navigate", (event, url) => {
    if (!estInterne(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  fenetre.loadURL(APP_URL);
  return fenetre;
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  creerFenetre();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) creerFenetre();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
