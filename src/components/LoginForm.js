import React, { useState, useEffect } from 'react';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import { ipcRenderer } from 'electron';
import { useHistory } from 'react-router-dom';

const LoginForm = () => {
  const history = useHistory();
  const [handle, setHandle] = useState('');
  const [save, setSave] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    ipcRenderer.once('login:success', (e) => {
      ipcRenderer.removeAllListeners('login:failed');
      history.push('manager');
    });

    ipcRenderer.on('login:failed', (e, message) => {
      setErrorMessage(message.error);
    });

    ipcRenderer.send('login:restore');
  }, []);

  const onSubmit = (e) => {
    e.preventDefault();
    ipcRenderer.send('handle:set', { handle: handle, saveHandle: save });
  };

  return (
    <Container>
      <Form onSubmit={onSubmit}>
        <Form.Group controlId="formHandle">
          <Form.Label>Account Handle</Form.Label>
          <Form.Control
            type="password"
            placeholder="Enter your handle here"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
          />
          <Form.Check
            type="checkbox"
            label="Save handle"
            value={save}
            onChange={(e) => setSave(e.target.value)}
          />
        </Form.Group>
        {(() => {
          if (errorMessage)
            return (
              <div style={{ textAlign: 'center', color: 'red' }}>
                <p style={{ fontWeight: 'bold', opacity: 0.8 }}>
                  Make sure you enter your handle correctly!
                </p>
                <p>{errorMessage}</p>
              </div>
            );
        })()}
        <Button variant="primary" type="submit">
          Submit
        </Button>
      </Form>
    </Container>
  );
};

export default LoginForm;
