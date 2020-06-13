import { ipcRenderer } from 'electron';
import path from 'path';
import slash from 'slash';
import React, { useState, useEffect } from 'react';
import Container from 'react-bootstrap/Container';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import File from './File';
import Folder from './Folder';

const Manager = () => {
  const [folderPath, setFolderPath] = useState('/');
  const [folders, setFolders] = useState(['Main']);
  const [metadata, setMetadata] = useState({
    files: [
      {
        name: 'UAM Vergütungsvereinbarung.pdf',
        created: 1565178217971,
        modified: 1565178217971,
        versions: [
          {
            handle:
              '1a9c0c94e4a05c16581c29d3241d8680a7467339c309df7387ab6a264427915ccf84c0dea20ff23bdcd04cdafa29d0d7abca336cd1f2a0098da801c45d172837',
            size: 3573288,
            modified: 1565178217971,
            created: 1565176690097,
          },
        ],
      },
    ],
    folders: [
      {
        name: 'Game of Thrones',
        handle:
          'b4390daf1d0c71298c0ffda0750a865fbaa72dd7cce07e2b8f5fed7ef983fb90',
      },
    ],
  });

  useEffect(() => {
    ipcRenderer.on('files:get', (e, metadata) => {
      console.log(metadata);
      setMetadata(metadata);
    });
  }, []);

  function updatePath(newPath) {
    const updatedPath = slash(path.join(folderPath, newPath));
    ipcRenderer.send('path:update', updatedPath);
    setFolderPath(updatedPath);
    setFolders([...folders, newPath]);
  }

  function goBackTo(buttonIndex) {
    /*if (folders[folders.length - 1] == goToPath) {
      return;
    }*/
    const newPath = folders.slice(0, buttonIndex + 1);
    setFolders(newPath);
    let traversedPath = [...newPath];
    traversedPath[0] = '/';
    traversedPath = slash(path.join(...traversedPath));
    setFolderPath(traversedPath);
    ipcRenderer.send('path:update', traversedPath);
  }

  return (
    <Container>
      <Row>
        {folders.map((folder, index) => {
          //if (folders.length - 1 != index) {
          return (
            <Card key={index}>
              <Button onClick={() => goBackTo(index)}>{folder}</Button>
            </Card>
          );
          //}
        })}
      </Row>
      <Table>
        <thead>
          <tr>
            <th></th>
            <th></th>
            <th>Name</th>
            <th>Created</th>
            <th>Size</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {metadata.folders.map((folder, index) => {
            return (
              <Folder key={index} folder={folder} updatePath={updatePath} />
            );
          })}
          {metadata.files.map((file, index) => {
            return <File key={index} file={file} />;
          })}
        </tbody>
      </Table>
    </Container>
  );
};

export default Manager;
