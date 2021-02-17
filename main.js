require = require("esm")(module);
const Path = require("path");
const Utils = require("./opacity/Utils");
const url = require("url");
const keytar = require("keytar");
const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const OpacityAccount = require("./opacity/OpacityAccount");
const storage = require("electron-settings");

let mainWindow;
let account;

let isDev = false;
const isMac = process.platform === "darwin" ? true : false;

if (
  process.env.NODE_ENV !== undefined &&
  process.env.NODE_ENV === "development"
) {
  isDev = true;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: isDev ? 1600 : 1200,
    height: 800,
    show: false,
    icon: `${__dirname}/assets/icons/logo.png`,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  let indexPath;

  if (isDev && process.argv.indexOf("--noDevServer") === -1) {
    indexPath = url.format({
      protocol: "http:",
      host: "localhost:8080",
      pathname: "index.html",
      slashes: true,
    });
  } else {
    indexPath = url.format({
      protocol: "file:",
      pathname: Path.join(__dirname, "dist", "index.html"),
      slashes: true,
    });
  }

  mainWindow.loadURL(indexPath);

  // Don't show until we are ready and loaded
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();

    // Open devtools if dev
    if (isDev) {
      const {
        default: installExtension,
        REACT_DEVELOPER_TOOLS,
      } = require("electron-devtools-installer");

      installExtension(REACT_DEVELOPER_TOOLS).catch((err) =>
        console.log("Error loading React DevTools: ", err)
      );
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on("closed", () => (mainWindow = null));
}

app.on("ready", () => {
  createMainWindow();
  const mainMenu = Menu.buildFromTemplate(menu);
  Menu.setApplicationMenu(null);
  mainWindow.setMenu(mainMenu);
});

const menu = [
  ...(isMac ? [{ role: "appMenu" }] : []),
  {
    label: app.name,
    submenu: [
      {
        label: "Reset Handle",
        click: () => resetHandle(),
      },
      {
        label: "Settings",
        click: () => settingsPage(),
      },
      isMac ? { role: "close" } : { role: "quit" },
    ],
  },
  ...(isDev
    ? [
        {
          label: "Developer",
          submenu: [
            {
              role: "reload",
              role: "forcereload",
              role: "separator",
              role: "toggledevtools",
            },
          ],
        },
      ]
    : []),
];

async function settingsPage() {
  mainWindow.webContents.send("settings:open");
}

async function resetHandle() {
  await keytar.deletePassword("Opacity", "Handle");
  app.quit();
}

ipcMain.on("login:restore", async (e) => {
  password = await keytar.getPassword("Opacity", "Handle");
  if (password) {
    mainWindow.webContents.send("login:success");
    await setAccount(password);
    refreshFolder("/");
  }
});

ipcMain.on("handle:set", async (e, handleObject) => {
  try {
    if (handleObject.handle.length !== 128) {
      throw Error("Then handle doesn't have the right length of 128 signs.");
    }

    await setAccount(handleObject.handle);
    // Call this function before saving the handle to see if the entered handle is correct
    // eg. mixed up letters etc.
    await refreshFolder("/");

    if (handleObject.saveHandle) {
      // save handle to keyring
      keytar.setPassword("Opacity", "Handle", handleObject.handle);
    }

    mainWindow.webContents.send("login:success");
    refreshFolder("/");
  } catch (err) {
    mainWindow.webContents.send("login:failed", { error: err.message });
  }
});

ipcMain.on("path:update", async (e, newPath) => {
  refreshFolder(newPath, true);
});

ipcMain.on("files:delete", async (e, files) => {
  console.log(files);
  if (await account.delete(files.folder, files.files)) {
    refreshFolder(files.folder);
  }
  //mainWindow.webContents.send(`file:deleted:${file.handle}`);
});

ipcMain.on("files:upload", async (e, toUpload) => {
  for (const file of toUpload.files) {
    account.upload(toUpload.folder, file).then((response) => {
      if (response) {
        refreshFolder(toUpload.folder);
      }
    });
  }
});

ipcMain.on("files:download", async (e, toDownload) => {
  for (const file of toDownload.files) {
    account.download(toDownload.folder, file, toDownload.savingPath);
  }
});

ipcMain.on("folder:create", async (e, newFolder) => {
  const folderPath = Utils.getSlash(
    Path.join(newFolder.parentFolder, newFolder.folderName)
  );
  if (await account.createFolder(folderPath)) {
    refreshFolder(newFolder.parentFolder);
  }
});

ipcMain.on("file:rename", async (e, renameObj) => {
  await account.rename(renameObj.folder, renameObj.item, renameObj.newName);
  refreshFolder(renameObj.folder);
});

ipcMain.on("files:move", async (e, moveObj) => {
  for (const file of moveObj.files) {
    if (await account.moveItem(moveObj.fromFolder, file, moveObj.toFolder)) {
      refreshFolder(moveObj.toFolder);
    }
  }
});

ipcMain.on("semaphore:update", async (e, semaphoreValues) => {
  const currentSemaphores = storage.get("settings");

  const UploadSemaphoreDifference =
    currentSemaphores.maxSimultaneousUploads -
    semaphoreValues.maxSimultaneousUploads;
  console.log(UploadSemaphoreDifference);
  if (UploadSemaphoreDifference > 0) {
    account.decreaseUploadSemaphore(UploadSemaphoreDifference);
  } else if (UploadSemaphoreDifference < 0) {
    account.increaseUploadSemaphore(Math.abs(UploadSemaphoreDifference));
  }

  const DownloadSemaphoreDifference =
    currentSemaphores.maxSimultaneousDownloads -
    semaphoreValues.maxSimultaneousDownloads;
  console.log(DownloadSemaphoreDifference);
  if (DownloadSemaphoreDifference > 0) {
    account.decreaseDownloadSemaphore(DownloadSemaphoreDifference);
  } else if (DownloadSemaphoreDifference < 0) {
    account.increaseDownloadSemaphore(Math.abs(DownloadSemaphoreDifference));
  }

  storage.set("settings", semaphoreValues);
});

ipcMain.on("syncFolders:update", async (e, folders) => {
  console.log("ipcMain received");
  console.log(folders);
  storage.set("syncFolders", folders);
});

async function setAccount(handle) {
  const userSettings = await storage.get("settings");
  const maxSimultaneousDownloads = userSettings
    ? userSettings.maxSimultaneousDownloads
    : 2;
  const maxSimultaneousUploads = userSettings
    ? userSettings.maxSimultaneousUploads
    : 2;

  const syncSettings = await storage.get("syncFolders");
  const activateSync = syncSettings.active;
  const upOrDownSync = syncSettings.upOrDown ? "up" : "down";
  const syncFolder =
    upOrDownSync === "up" ? syncSettings.upFolder : syncSettings.downFolder;

  account = new OpacityAccount(
    handle,
    maxSimultaneousDownloads,
    maxSimultaneousUploads,
    activateSync,
    upOrDownSync,
    syncFolder
  );

  await account.checkAccountStatus();

  // set up listeners
  account.on(`upload:init`, (file) => {
    mainWindow.webContents.send("toast:create", {
      text: `${file.fileName} is uploading. Please wait...`,
      toastId: file.handle,
    });

    account.on(`upload:progress:${file.handle}`, (percentage) =>
      mainWindow.webContents.send("toast:update", {
        text: `${file.fileName} upload progress: ${percentage}%`,
        toastId: file.handle,
        percentage: percentage,
      })
    );

    account.on(`upload:finished:${file.handle}`, () => {
      mainWindow.webContents.send("toast:finished", {
        text: `${file.fileName} has finished uploading.`,
        toastId: file.handle,
      });
      account.removeAllListeners(`upload:progress:${file.handle}`);
      account.removeAllListeners(`upload:finished:${file.handle}`);
    });
  });

  account.on(`download:init`, (file) => {
    mainWindow.webContents.send("toast:create", {
      text: `${file.fileName} is downloading. Please wait...`,
      toastId: file.handle,
    });

    account.on(`download:progress:${file.handle}`, (percentage) =>
      mainWindow.webContents.send("toast:update", {
        text: `${file.fileName} download progress: ${percentage}%`,
        toastId: file.handle,
        percentage: percentage,
      })
    );

    account.on(`download:finished:${file.handle}`, () => {
      mainWindow.webContents.send("toast:finished", {
        text: `${file.fileName} has finished downloading.`,
        toastId: file.handle,
      });
      account.removeAllListeners(`upload:progress:${file.handle}`);
      account.removeAllListeners(`upload:finished:${file.handle}`);
    });
  });

  account.on(`delete:init`, (file) => {
    mainWindow.webContents.send("toast:create", {
      text: `Deleting: ${file.fileName}`,
      toastId: file.handle,
    });

    account.on(`delete:finished:${file.handle}`, () => {
      mainWindow.webContents.send("toast:finished", {
        text: `Deleted ${file.fileName}`,
        toastId: file.handle,
      });

      account.removeAllListeners(`delete:finished:${file.handle}`);
    });
  });

  account.on(`move:init`, (file) => {
    mainWindow.webContents.send("toast:create", {
      text: `Moving: ${file.fileName}`,
      toastId: file.handle,
    });

    account.on(`move:failed:${file.handle}`, (failMessage) => {
      mainWindow.webContents.send("toast:finished", {
        text: `Failed to move: ${file.fileName}\n${failMessage}`,
        toastId: file.handle,
      });

      account.removeAllListeners(`move:finished:${file.handle}`);
      account.removeAllListeners(`move:failed:${file.handle}`);
    });

    account.on(`move:finished:${file.handle}`, () => {
      mainWindow.webContents.send("toast:finished", {
        text: `Moved ${file.fileName}`,
        toastId: file.handle,
      });

      account.removeAllListeners(`move:finished:${file.handle}`);
      account.removeAllListeners(`move:failed:${file.handle}`);
    });
  });
}

async function refreshFolder(folder, force = false) {
  const metadata = (await account.getFolderMetadata(folder)).metadata;
  mainWindow.webContents.send("metadata:set", {
    metadata: metadata,
    folder: folder,
    force: force,
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});

// Stop error
app.allowRendererProcessReuse = true;
