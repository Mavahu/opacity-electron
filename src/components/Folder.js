import React from 'react';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import { ipcRenderer } from 'electron';
import {
  AiFillFolder,
  AiOutlineDownload,
  AiOutlineDelete,
} from 'react-icons/ai';
import Styled from 'styled-components';

const Checkbox = Styled.input.attrs({
  type: 'checkbox',
})``;

const Folder = ({
  folder,
  updatePath,
  downloadFunc,
  deleteFunc,
  changeCheckboxState,
}) => {
  return (
    <tr>
      <td>
        <Checkbox
          checked={folder.checked}
          onChange={(t) => changeCheckboxState(t.target.checked, folder.handle)}
        />
      </td>
      <td>
        <AiFillFolder />
      </td>
      <td>
        <Button variant="outline-info" onClick={() => updatePath(folder.name)}>
          {folder.name.slice(0, 64)}
        </Button>
      </td>
      <td></td>
      <td></td>
      <td>
        <ButtonGroup>
          <Button
            onClick={() =>
              downloadFunc({ handle: folder.handle, name: folder.name })
            }
          >
            <AiOutlineDownload />
          </Button>
          <Button onClick={() => deleteFunc(folder.handle, folder.name)}>
            <AiOutlineDelete></AiOutlineDelete>
          </Button>
        </ButtonGroup>
      </td>
    </tr>
  );
};

export default Folder;
