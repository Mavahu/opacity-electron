const Path = require('path');
const Slash = require('slash');
const url = require('url');
const keytar = require('keytar');
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const { useHistory } = require('react-router-dom');
const OpacityAccount = require('./opacity/OpacityAccount');

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
    account = new OpacityAccount(password);
    await account.checkAccountStatus();
    refreshFolder('/');
  }
});

ipcMain.on('handle:set', async (e, handleObject) => {
  try {
    account = new OpacityAccount(handleObject.handle);
    await account.checkAccountStatus();

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
  refreshFolder(newPath);
});

ipcMain.on('file:delete', async (e, file) => {
  await account.delete(file.folder, file.handle);
  refreshFolder(file.folder);
});

ipcMain.on('files:upload', async (e, toUpload) => {
  console.log(toUpload);
  for (const file of toUpload.files) {
    if (await account.upload(toUpload.folder, file)) {
      refreshFolder(toUpload.folder);
    }
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

async function refreshFolder(folder) {
  const files = (await account.getFolderMetadata(folder)).metadata;
  mainWindow.webContents.send('files:get', files);
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
