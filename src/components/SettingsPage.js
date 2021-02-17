import React, { useState, useEffect } from "react";
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import ToggleButton from "react-bootstrap/ToggleButton";
import Card from "react-bootstrap/Card";
import { ipcRenderer } from "electron";
import { useHistory } from "react-router-dom";
import storage from "electron-settings";
//const settings = require('electron-settings');
import fs from "fs";

const SettingsPage = () => {
  const history = useHistory();
  const defaultSettings = {
    maxSimultaneousUploads: 2,
    maxSimultaneousDownloads: 2,
  };
  const [applicationSettings, setApplicationSettings] = useState({});
  const [activateSync, setActivateSync] = useState(false);
  const [upDownSyncValue, setUpDownSyncValue] = useState(true);
  const [downSyncFolder, setDownSyncFolder] = useState("");
  const [upSyncFolder, setUpSyncFolder] = useState("");

  useEffect(() => {
    retrieveSettings();
  }, []);

  async function retrieveSettings() {
    const userSettings = await storage.get("settings");
    console.log(userSettings);
    if (userSettings) {
      console.log("found");
      setApplicationSettings(userSettings);
    } else {
      console.log("not found");
      setApplicationSettings(JSON.parse(JSON.stringify(defaultSettings)));
    }
    const syncSettings = await storage.get("syncFolders");
    console.log(syncSettings);
    if (syncSettings) {
      setActivateSync(syncSettings["active"]);
      setUpDownSyncValue(syncSettings["upOrDown"]);
      setDownSyncFolder(syncSettings["downFolder"]);
      setUpSyncFolder(syncSettings["upFolder"]);
    }
  }

  const onSubmit = (e) => {
    e.preventDefault();
    console.log(applicationSettings);
    console.log(downSyncFolder);
    if (fs.existsSync(downSyncFolder)) {
      console.log("Folder exists");
    }
    ipcRenderer.send("syncFolders:update", {
      active: activateSync,
      upOrDown: upDownSyncValue,
      downFolder: downSyncFolder,
      upFolder: upSyncFolder,
    });

    ipcRenderer.send("semaphore:update", applicationSettings);
    ipcRenderer.send("path:update", "/");
    history.goBack();
  };

  const onReset = (e) => {
    e.preventDefault();
    ipcRenderer.send("path:update", "/");
    history.goBack();
  };

  return (
    <Container
      style={{
        margin: 25,
        display: "flex",
      }}
    >
      <Form onSubmit={onSubmit} onReset={onReset}>
        <Form.Group as={Row}>
          <Form.Label column>Simultaneous Uploads</Form.Label>
          <Col xs="auto">
            <Form.Control
              type="number"
              defaultValue={applicationSettings.maxSimultaneousUploads}
              onChange={(e) =>
                setApplicationSettings({
                  ...applicationSettings,
                  maxSimultaneousUploads: parseInt(e.target.value),
                })
              }
            />
          </Col>
        </Form.Group>

        <Form.Group as={Row}>
          <Form.Label column>Simultaneous Downloads</Form.Label>
          <Col xs="auto">
            <Form.Control
              type="number"
              defaultValue={applicationSettings.maxSimultaneousDownloads}
              onChange={(e) =>
                setApplicationSettings({
                  ...applicationSettings,
                  maxSimultaneousDownloads: parseInt(e.target.value),
                })
              }
            />
          </Col>
        </Form.Group>

        <Form.Group as={Row}>
          <Form.Check
            column="true"
            type="checkbox"
            checked={activateSync}
            label="Activate Down-/Up-Sync"
            onChange={(e) => setActivateSync(e.currentTarget.checked)}
          >
            {}
          </Form.Check>
        </Form.Group>

        <Form.Group as={Row}>
          <ToggleButton
            disabled={!activateSync}
            type="radio"
            variant="secondary"
            value="2"
            checked={upDownSyncValue}
            onChange={() => setUpDownSyncValue(true)}
          >
            Up-Sync
          </ToggleButton>
          <Col xs="auto">
            <Form.Control
              disabled={!activateSync || !upDownSyncValue}
              type="text"
              defaultValue={upSyncFolder}
              onChange={(e) => setUpSyncFolder(e.target.value)}
            />
          </Col>
        </Form.Group>

        <Form.Group as={Row}>
          <ToggleButton
            disabled={!activateSync}
            name="radio"
            type="radio"
            variant="secondary"
            value="1"
            checked={!upDownSyncValue}
            onChange={() => setUpDownSyncValue(false)}
          >
            Down-Sync
          </ToggleButton>
          <Col xs="auto">
            <Form.Control
              disabled={!activateSync || upDownSyncValue}
              type="text"
              defaultValue={downSyncFolder}
              onChange={(e) => setDownSyncFolder(e.target.value)}
            />
          </Col>
        </Form.Group>

        <Form.Group as={Row}>
          <Col sm={{ span: 10, offset: 2 }}>
            <Button variant="danger" type="reset">
              Cancel
            </Button>{" "}
            <Button variant="success" type="submit">
              Save
            </Button>
          </Col>
        </Form.Group>
      </Form>
    </Container>
  );
};

export default SettingsPage;
