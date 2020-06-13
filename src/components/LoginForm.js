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

  useEffect(() => {
    ipcRenderer.send('login:restore');

    ipcRenderer.on('login:success', (e) => history.push('manager'));
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
        <Button variant="primary" type="submit">
          Submit
        </Button>
      </Form>
    </Container>
  );
};

export default LoginForm;
