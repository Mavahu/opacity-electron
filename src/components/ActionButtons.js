import { ipcRenderer } from 'electron';
const { dialog } = require('electron').remote;
import React, { useState } from 'react';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Card from 'react-bootstrap/Card';
import Swal from 'sweetalert2';

const ActionButtons = ({
  metadata,
  folderPath,
  massButtons,
  downloadFunc,
  changeAllCheckboxState,
}) => {
  const defaultCutButton = {
    cut: true,
    files: [],
    folder: '',
  };
  const [cutButton, setCutButton] = useState(
    JSON.parse(JSON.stringify(defaultCutButton))
  );

  async function downloadSelected() {
    const toDownload = [];
    metadata.folders.map((folder) => {
      if (folder.checked) {
        toDownload.push({ name: folder.name, handle: folder.handle });
      }
    });
    metadata.files.map((file) => {
      if (file.checked) {
        toDownload.push({ name: file.name, handle: file.versions[0].handle });
      }
    });
    await downloadFunc(toDownload);
  }

  async function cutAndPaste(paste = true) {
    if (cutButton.cut) {
      const filesToMove = [];
      metadata.folders.map((folder) => {
        if (folder.checked) {
          filesToMove.push({ handle: folder.handle, name: folder.name });
        }
      });
      metadata.files.map((file) => {
        if (file.checked) {
          filesToMove.push({
            handle: file.versions[0].handle,
            name: file.name,
          });
        }
      });
      setCutButton({ cut: false, folder: folderPath, files: filesToMove });
      changeAllCheckboxState(false);
    } else {
      if (paste && cutButton.folder !== folderPath) {
        ipcRenderer.send('files:move', {
          fromFolder: cutButton.folder,
          files: cutButton.files,
          toFolder: folderPath,
        });
      } else if (!paste) {
        console.log('Moving cancelled');
      } else if (cutButton.folder === folderPath) {
        console.log('Tried to drop into the origin folder');
      }
      setCutButton(JSON.parse(JSON.stringify(defaultCutButton)));
    }
  }

  async function deleteSelected() {
    const checkedFolders = metadata.folders.filter((folder) => folder.checked);
    const checkedFiles = metadata.files.filter((file) => file.checked);
    const { value: result } = await Swal.fire({
      title: 'Are you sure?',
      html: `You won't be able to revert this!<br/>Folders: ${checkedFolders
        .map((folder) => '<li>' + folder.name + '</li>')
        .join('')}<br/>Files: ${checkedFiles
        .map((file) => '<li>' + file.name + '</li> ')
        .join('')}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
    });

    if (result) {
      const toDelete = [];
      checkedFolders.map((folder) =>
        toDelete.push({
          folder: folderPath,
          handle: folder.handle,
          name: folder.name,
        })
      );
      checkedFiles.map((file) =>
        toDelete.push({
          folder: folderPath,
          handle: file.versions[0].handle,
          name: file.name,
        })
      );
      ipcRenderer.send('files:delete', toDelete);
      changeAllCheckboxState(false);
    }
  }

  async function newFolder() {
    const { value: folderName } = await Swal.fire({
      title: 'Enter the folder name',
      input: 'text',
      showCancelButton: true,
      cancelButtonColor: '#d33',
      inputValidator: (value) => {
        if (!value) {
          return 'You need to write something!';
        }
      },
    });

    if (folderName) {
      Swal.fire('', `Created folder: ${folderName}`, 'success');
      ipcRenderer.send('folder:create', {
        parentFolder: folderPath,
        folderName: folderName,
      });
    }
  }

  function uploadButton(isFolder = false) {
    console.log(isFolder);
    dialog
      .showOpenDialog({
        properties: [
          isFolder ? 'openDirectory' : 'openFile',
          'multiSelections',
        ],
      })
      .then((result) => {
        if (!result.canceled) {
          ipcRenderer.send('files:upload', {
            folder: folderPath,
            files: result.filePaths,
          });
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }

  return (
    <ButtonGroup>
      <Card>
        <Button disabled={!massButtons} onClick={() => downloadSelected()}>
          Download
        </Button>
      </Card>
      <Card>
        {cutButton.cut ? (
          <Button disabled={!massButtons} onClick={() => cutAndPaste()}>
            Cut
          </Button>
        ) : (
          <ButtonGroup>
            <Button
              disabled={cutButton.folder === folderPath}
              onClick={() => cutAndPaste()}
            >
              Paste
            </Button>
            <Button onClick={() => cutAndPaste(false)}>Cancel</Button>
          </ButtonGroup>
        )}
      </Card>
      <Card className="mr-1">
        <Button disabled={!massButtons} onClick={() => deleteSelected()}>
          Delete
        </Button>
      </Card>
      <Card className="mr-1">
        <Button onClick={() => newFolder()}>Create Folder</Button>
      </Card>
      <Card>
        <Button onClick={() => uploadButton(true)}>Upload Folder</Button>
      </Card>
      <Card>
        <Button onClick={() => uploadButton(false)}>Upload Files</Button>
      </Card>
    </ButtonGroup>
  );
};

export default ActionButtons;
