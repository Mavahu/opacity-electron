const path = require('path');
const slash = require('slash');
const url = require('url');
const keytar = require('keytar');
const { app, BrowserWindow, ipcMain, webContents } = require('electron');
const OpacityAccount = require('./opacity/OpacityAccount');

let mainWindow;
let account;

let isDev = false;

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
    icon: './assets/icons/logo.png',
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
      pathname: path.join(__dirname, 'dist', 'index.html'),
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

app.on('ready', createMainWindow);

ipcMain.on('login:restore', async (e) => {
  password = await keytar.getPassword('Opacity', 'Handle');
  if (password) {
    mainWindow.webContents.send('login:success');
    account = new OpacityAccount(password);
    await account.checkAccountStatus();
    files = (await account.getFolderMetadata('/')).metadata;
    mainWindow.webContents.send('files:get', files);
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
    files = (await account.getFolderMetadata('/')).metadata;
    mainWindow.webContents.send('files:get', files);
  } catch (err) {
    console.log(err);
  }
});

ipcMain.on('path:update', async (e, newPath) => {
  files = (await account.getFolderMetadata(newPath)).metadata;
  mainWindow.webContents.send('files:get', files);
});

ipcMain.on('file:delete', async (e, file) => {
  await account.delete(file.folder, file.handle);
  const files = (await account.getFolderMetadata(file.folder)).metadata;
  mainWindow.webContents.send('files:get', files);
});

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
