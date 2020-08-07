import React, { useState, useEffect } from 'react';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import { ipcRenderer } from 'electron';
import { useHistory } from 'react-router-dom';
import storage from 'electron-settings';
//const settings = require('electron-settings');

const SettingsPage = () => {
  const history = useHistory();
  const defaultSettings = {
    maxSimultaneousUploads: 1,
    maxSimultaneousDownloads: 1,
  };
  const [applicationSettings, setApplicationSettings] = useState({});

  useEffect(() => {
    retrieveSettings();
  }, []);

  async function retrieveSettings() {
    const userSettings = await storage.get('settings');
    console.log(userSettings);
    if (userSettings) {
      console.log('found');
      setApplicationSettings(userSettings);
    } else {
      console.log('not found');
      setApplicationSettings(JSON.parse(JSON.stringify(defaultSettings)));
    }
  }

  const onSubmit = (e) => {
    e.preventDefault();
    console.log(applicationSettings);

    storage.set('settings', applicationSettings);

    ipcRenderer.send('path:update', '/');
    history.goBack();
  };

  const onReset = (e) => {
    e.preventDefault();
    ipcRenderer.send('path:update', '/');
    history.goBack();
  };

  return (
    <Container>
      <Form onSubmit={onSubmit} onReset={onReset}>
        <Form.Group as={Row}>
          <Form.Label column sm={2}>
            Simultaneous Uploads
          </Form.Label>
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
          <Form.Label column sm={2}>
            Simultaneous Downloads
          </Form.Label>
          <Col sm={10}>
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
          <Col sm={{ span: 10, offset: 2 }}>
            <Button variant="danger" type="reset">
              Cancel
            </Button>{' '}
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
