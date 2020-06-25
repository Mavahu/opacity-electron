const Path = require('path');
const Slash = require('slash');
let sleep = require('util').promisify(setTimeout);
const url = require('url');
const keytar = require('keytar');
const { app, BrowserWindow, ipcMain, Menu, webContents } = require('electron');
const { useHistory } = require('react-router-dom');
const OpacityAccount = require('./opacity/OpacityAccount');
const { toast } = require('react-toastify');

let mainWindow;
let account;

let isDev = false;
const isMac = process.platform === 'darwin' ? true : false;

if (
  process.env.NODE_ENV !== undefined &&
  process.env.NODE_ENV === 'development'
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

  if (isDev && process.argv.indexOf('--noDevServer') === -1) {
    indexPath = url.format({
      protocol: 'http:',
      host: 'localhost:8080',
      pathname: 'index.html',
      slashes: true,
    });
  } else {
    indexPath = url.format({
      protocol: 'file:',
      pathname: Path.join(__dirname, 'dist', 'index.html'),
      slashes: true,
    });
  }

  mainWindow.loadURL(indexPath);

  // Don't show until we are ready and loaded
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    // Open devtools if dev
    if (isDev) {
      const {
        default: installExtension,
        REACT_DEVELOPER_TOOLS,
      } = require('electron-devtools-installer');

      installExtension(REACT_DEVELOPER_TOOLS).catch((err) =>
        console.log('Error loading React DevTools: ', err)
      );
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('closed', () => (mainWindow = null));
}

app.on('ready', () => {
  createMainWindow();

  const mainMenu = Menu.buildFromTemplate(menu);
  Menu.setApplicationMenu(mainMenu);
});

const menu = [
  ...(isMac ? [{ role: 'appMenu' }] : []),
  { role: 'fileMenu' },
  {
    label: 'Handle',
    submenu: [{ label: 'Reset Handle', click: () => resetHandle() }],
  },
  ...(isDev
    ? [
        {
          label: 'Developer',
          submenu: [
            {
              role: 'reload',
              role: 'forcereload',
              role: 'separator',
              role: 'toggledevtools',
            },
          ],
        },
      ]
    : []),
];

async function resetHandle() {
  await keytar.deletePassword('Opacity', 'Handle');
  app.quit();
}

ipcMain.on('login:restore', async (e) => {
  password = await keytar.getPassword('Opacity', 'Handle');
  if (password) {
    mainWindow.webContents.send('login:success');
    await setAccount(password);
    refreshFolder('/');
  }
});

ipcMain.on('handle:set', async (e, handleObject) => {
  try {
    await setAccount(handleObject.handle);

    if (handleObject.saveHandle) {
      // save handle to keyring
      keytar.setPassword('Opacity', 'Handle', handleObject.handle);
    }

    mainWindow.webContents.send('login:success');
    refreshFolder('/');
  } catch (err) {
    console.log(err);
  }
});

ipcMain.on('path:update', async (e, newPath) => {
  refreshFolder(newPath, true);
});

ipcMain.on('file:delete', async (e, file) => {
  await account.delete(file.folder, file.handle);
  mainWindow.webContents.send(`file:deleted:${file.handle}`);
  refreshFolder(file.folder);
});

ipcMain.on('files:upload', async (e, toUpload) => {
  for (const file of toUpload.files) {
    await account.upload(toUpload.folder, file).then((response) => {
      if (response) {
        refreshFolder(toUpload.folder);
      }
    });
  }
});

ipcMain.on('files:download', async (e, toDownload) => {
  for (const file of toDownload.files) {
    await account.download(toDownload.folder, file, toDownload.savingPath);
  }
});

ipcMain.on('folder:create', async (e, newFolder) => {
  const folderPath = Slash(
    Path.join(newFolder.parentFolder, newFolder.folderName)
  );
  if (await account.createFolder(folderPath)) {
    refreshFolder(newFolder.parentFolder);
  }
});

ipcMain.on('file:rename', async (e, renameObj) => {
  await account.rename(renameObj.folder, renameObj.handle, renameObj.newName);
  refreshFolder(renameObj.folder);
});

async function setAccount(handle) {
  account = new OpacityAccount(handle);
  await account.checkAccountStatus();

  // set up listeners
  account.on(`upload:init`, (file) => {
    mainWindow.webContents.send('toast:create', {
      toastId: file.handle,
      fileName: file.fileName,
    });

    account.on(`upload:progress:${file.handle}`, (percentage) =>
      mainWindow.webContents.send('toast:update', {
        fileName: file.fileName,
        toastId: file.handle,
        percentage: percentage,
      })
    );

    account.on(`upload:finished:${file.handle}`, () => {
      mainWindow.webContents.send('toast:finished', {
        fileName: file.fileName,
        toastId: file.handle,
      });
      account.removeAllListeners(`upload:progress:${file.handle}`);
      account.removeAllListeners(`upload:finished:${file.handle}`);
    });
  });
}

async function refreshFolder(folder, force = false) {
  const metadata = (await account.getFolderMetadata(folder)).metadata;
  mainWindow.webContents.send('metadata:set', {
    metadata: metadata,
    folder: folder,
    force: force,
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});

// Stop error
app.allowRendererProcessReuse = true;
