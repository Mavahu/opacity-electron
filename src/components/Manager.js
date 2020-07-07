import { ipcRenderer } from 'electron';
const { dialog } = require('electron').remote;
import Path from 'path';
import {} from './Temp';
import React, { useState, useEffect, useRef } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import Container from 'react-bootstrap/Container';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import Card from 'react-bootstrap/Card';
import File from './File';
import Folder from './Folder';
import Swal from 'sweetalert2';
import Styled from 'styled-components';

const Checkbox = Styled.input.attrs({
  type: 'checkbox',
})``;

const Manager = () => {
  const [folderPath, setFolderPath] = useState('/');
  const refFolderPath = useRef(folderPath);
  refFolderPath.current = folderPath;
  const [folders, setFolders] = useState(['All Files']);
  const [metadata, setMetadata] = useState(false);
  const defaultSorts = {
    name: {
      show: false,
      ascending: true,
      icon: '',
    },
    size: {
      show: false,
      ascending: true,
      icon: '',
    },
    createdDate: {
      show: false,
      ascending: true,
      icon: '',
    },
    icons: {
      down: '▼',
      up: '▲',
    },
  };
  const [sorts, setSorts] = useState(JSON.parse(JSON.stringify(defaultSorts)));
  const [selectAllCheckbox, setSelectAllCheckbox] = useState(false);
  const [massButtons, setMassButtons] = useState(false);
  const defaultMoveButton = {
    move: true,
    files: [],
    folder: '',
  };
  const [moveButton, setMoveButton] = useState(
    JSON.parse(JSON.stringify(defaultMoveButton))
  );

  useEffect(() => {
    ipcRenderer.on('metadata:set', (e, newMetadata) => {
      if (newMetadata.folder === refFolderPath.current || newMetadata.force) {
        addCheckboxValues(newMetadata.metadata);
        setSorts(JSON.parse(JSON.stringify(defaultSorts)));
      }
    });
  }, []);

  function addCheckboxValues(metadata) {
    const copyMetadata = JSON.parse(JSON.stringify(metadata));
    copyMetadata.folders.forEach(function (folder) {
      folder.checked = false;
    });
    copyMetadata.files.forEach(function (file) {
      file.checked = false;
    });
    setMetadata(copyMetadata);
    setMassButtons(false);
    setSelectAllCheckbox(false);
  }

  function changeAllCheckboxState(checked) {
    const copyMetadata = JSON.parse(JSON.stringify(metadata));
    copyMetadata.folders.forEach(function (folder) {
      folder.checked = checked;
    });
    copyMetadata.files.forEach(function (file) {
      file.checked = checked;
    });
    if (checked) {
      setMassButtons(true);
      setSelectAllCheckbox(true);
    } else {
      setMassButtons(false);
      setSelectAllCheckbox(false);
    }
    setMetadata(copyMetadata);
  }

  function changeFolderCheckboxState(checked, handle) {
    const copyMetadata = JSON.parse(JSON.stringify(metadata));
    copyMetadata.folders.forEach(function (folder) {
      if (folder.handle === handle) {
        folder.checked = checked;
      }
    });
    const checkedFolders = copyMetadata.folders.find(
      (folder) => folder.checked
    );
    const checkedFiles = copyMetadata.files.find((file) => file.checked);
    if (checkedFolders || checkedFiles) {
      setMassButtons(true);
    } else {
      setMassButtons(false);
    }
    setMetadata(copyMetadata);
  }

  function changeFileCheckboxState(checked, handle) {
    const copyMetadata = JSON.parse(JSON.stringify(metadata));
    copyMetadata.files.forEach(function (file) {
      if (file.versions[0].handle === handle) {
        file.checked = checked;
      }
    });
    const checkedFolders = copyMetadata.folders.find(
      (folder) => folder.checked
    );
    const checkedFiles = copyMetadata.files.find((file) => file.checked);
    if (checkedFolders || checkedFiles) {
      setMassButtons(true);
    } else {
      setMassButtons(false);
    }
    setMetadata(copyMetadata);
  }

  useEffect(() => {
    ipcRenderer.on('toast:create', (e, data) =>
      toast(data.text, {
        toastId: data.toastId,
        autoClose: false,
      })
    );

    ipcRenderer.on('toast:update', (e, data) => {
      toast.update(data.toastId, {
        render: data.text,
        progress: data.percentage / 100.0,
      });
    });

    ipcRenderer.on('toast:finished', (e, data) => {
      toast.update(data.toastId, {
        render: data.text,
      });
      setTimeout(() => {
        toast.dismiss(data.toastId);
      }, 3000);
    });
  }, []);

  function updatePath(newPath) {
    const updatedPath = Utils.getSlash(Path.join(folderPath, newPath));
    setFolderPath(updatedPath);
    ipcRenderer.send('path:update', updatedPath);
    setFolders([...folders, newPath]);
  }

  function goBackTo(buttonIndex) {
    const newPath = folders.slice(0, buttonIndex + 1);
    setFolders(newPath);
    let traversedPath = [...newPath];
    traversedPath[0] = '/';
    traversedPath = Utils.getSlash(Path.join(...traversedPath));
    setFolderPath(traversedPath);
    ipcRenderer.send('path:update', traversedPath);
  }

  async function deleteFunc(handle, toDelete) {
    const { value: result } = await Swal.fire({
      title: 'Are you sure?',
      html: `You won't be able to revert this!<br/>Deleting: ${toDelete}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
    });

    if (result) {
      ipcRenderer.send('files:delete', [
        {
          folder: folderPath,
          handle: handle,
          name: toDelete,
        },
      ]);
      changeAllCheckboxState(false);
    }
  }

  function uploadButton(e, isFolder = false) {
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

  async function downloadFunc(item) {
    dialog
      .showOpenDialog({
        properties: ['openDirectory'],
      })
      .then((result) => {
        if (!result.canceled) {
          ipcRenderer.send('files:download', {
            folder: folderPath,
            files: item,
            savingPath: result.filePaths[0],
          });
        }
      })
      .catch((err) => {
        console.log(err);
      });
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
      Swal.fire('', '', 'success');
      ipcRenderer.send('folder:create', {
        parentFolder: folderPath,
        folderName: folderName,
      });
    }
  }

  async function renameFunc(item) {
    const { value: newName } = await Swal.fire({
      title: 'Enter the a new name',
      input: 'text',
      inputValue: item.name,
      showCancelButton: true,
      inputValidator: (value) => {
        if (value === item.name) {
          return 'You need to set a new name!';
        }
        if (!value) {
          return 'Specify a name!';
        }
      },
    });

    if (newName) {
      Swal.fire('', '', 'success');
      ipcRenderer.send('file:rename', {
        folder: folderPath,
        item,
        newName: newName,
      });
    }
  }

  async function sortName() {
    const copyMetadata = JSON.parse(JSON.stringify(metadata));

    copyMetadata.folders.sort(function (folderA, folderB) {
      return sorts.name.ascending
        ? ('' + folderA.name).localeCompare(folderB.name)
        : ('' + folderB.name).localeCompare(folderA.name);
    });

    copyMetadata.files.sort(function (fileA, fileB) {
      return sorts.name.ascending
        ? ('' + fileA.name).localeCompare(fileB.name)
        : ('' + fileB.name).localeCompare(fileA.name);
    });

    sorts.name.ascending = !sorts.name.ascending;
    sorts.name.show = true;
    sorts.name.icon = sorts.name.ascending ? sorts.icons.down : sorts.icons.up;
    sorts.size = defaultSorts.size;
    sorts.createdDate = defaultSorts.createdDate;
    setSorts(sorts);
    setMetadata(copyMetadata);
  }

  async function sortSize() {
    const copyMetadata = JSON.parse(JSON.stringify(metadata));

    copyMetadata.files.sort(function (fileA, fileB) {
      return sorts.size.ascending
        ? fileA.versions[0].size - fileB.versions[0].size
        : fileB.versions[0].size - fileA.versions[0].size;
    });

    sorts.size.ascending = !sorts.size.ascending;
    sorts.size.show = true;
    sorts.size.icon = sorts.size.ascending ? sorts.icons.down : sorts.icons.up;
    sorts.name = defaultSorts.name;
    sorts.createdDate = defaultSorts.createdDate;
    setSorts(sorts);
    setMetadata(copyMetadata);
  }

  async function sortCreated() {
    const copyMetadata = JSON.parse(JSON.stringify(metadata));

    copyMetadata.files.sort(function (fileA, fileB) {
      return sorts.createdDate.ascending
        ? fileA.created - fileB.created
        : fileB.created - fileA.created;
    });

    sorts.createdDate.ascending = !sorts.createdDate.ascending;
    sorts.createdDate.show = true;
    sorts.createdDate.icon = sorts.createdDate.ascending
      ? sorts.icons.down
      : sorts.icons.up;
    sorts.name = defaultSorts.name;
    sorts.size = defaultSorts.size;
    setSorts(sorts);
    setMetadata(copyMetadata);
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

  async function moveAndDrop(drop = true) {
    if (moveButton.move) {
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
      setMoveButton({ move: false, folder: folderPath, files: filesToMove });
      changeAllCheckboxState(false);
    } else {
      if (drop && moveButton.folder !== folderPath) {
        ipcRenderer.send('files:move', {
          fromFolder: moveButton.folder,
          files: moveButton.files,
          toFolder: folderPath,
        });
      } else if (!drop) {
        console.log('Moving cancelled');
      } else if (moveButton.folder === folderPath) {
        console.log('Tried to drop into the origin folder');
      }
      setMoveButton(JSON.parse(JSON.stringify(defaultMoveButton)));
    }
  }

  return (
    <Container fluid>
      <ButtonToolbar
        className="justify-content-between"
        aria-label="Toolbar with Button groups"
      >
        <ButtonGroup>
          {folders.map((folder, index) => {
            //if (folders.length - 1 != index) {
            return (
              <Card key={index}>
                <Button onClick={() => goBackTo(index)}>{folder}</Button>
              </Card>
            );
            //}
          })}
        </ButtonGroup>
        <ButtonGroup>
          <Card>
            <Button disabled={!massButtons} onClick={() => downloadSelected()}>
              Download
            </Button>
          </Card>
          <Card>
            {moveButton.move ? (
              <Button disabled={!massButtons} onClick={() => moveAndDrop()}>
                {moveButton.move ? 'Move' : 'Drop'}
              </Button>
            ) : (
              <ButtonGroup>
                <Button
                  disabled={moveButton.folder === folderPath}
                  onClick={() => moveAndDrop()}
                >
                  Drop
                </Button>
                <Button onClick={() => moveAndDrop(false)}>Cancel</Button>
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
            <Button onClick={(e) => uploadButton(e, true)}>
              Upload Folder
            </Button>
          </Card>
          <Card>
            <Button onClick={uploadButton}>Upload Files</Button>
          </Card>
        </ButtonGroup>
      </ButtonToolbar>
      <Table size="sm">
        <thead>
          <tr>
            <th>
              {' '}
              <Checkbox
                checked={selectAllCheckbox}
                onChange={(t) => changeAllCheckboxState(t.target.checked)}
              />
            </th>
            <th></th>
            <th>
              <Button variant="outline-secondary" onClick={sortName}>
                Name
                {sorts.name.show ? ' ' + sorts.name.icon : ''}
              </Button>
            </th>
            <th>
              {' '}
              <Button variant="outline-secondary" onClick={sortCreated}>
                Created
                {sorts.createdDate.show ? ' ' + sorts.createdDate.icon : ''}
              </Button>
            </th>
            <th>
              <Button variant="outline-secondary" onClick={sortSize}>
                Size
                {sorts.size.show ? ' ' + sorts.size.icon : ''}
              </Button>
            </th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {metadata &&
            metadata.folders.map((folder, index) => {
              return (
                <Folder
                  key={index}
                  folder={folder}
                  updatePath={updatePath}
                  downloadFunc={downloadFunc}
                  deleteFunc={deleteFunc}
                  renameFunc={renameFunc}
                  changeCheckboxState={changeFolderCheckboxState}
                />
              );
            })}
          {metadata &&
            metadata.files.map((file, index) => {
              return (
                <File
                  key={index}
                  file={file}
                  deleteFunc={deleteFunc}
                  downloadFunc={downloadFunc}
                  renameFunc={renameFunc}
                  changeCheckboxState={changeFileCheckboxState}
                />
              );
            })}
        </tbody>
      </Table>
      <ToastContainer
        position="bottom-right"
        limit={7}
        hideProgressBar={false}
        autoClose={false}
        newestOnTop={true}
        closeOnClick={true}
        draggable={false}
        rtl={false}
      />
    </Container>
  );
};

export default Manager;
