import React from 'react';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import {
  AiFillFolder,
  AiOutlineDownload,
  AiOutlineDelete,
} from 'react-icons/ai';
import { FiEdit } from 'react-icons/fi';
import Styled from 'styled-components';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';

const Checkbox = Styled.input.attrs({
  type: 'checkbox',
})``;

const Folder = ({
  folder,
  updatePath,
  downloadFunc,
  deleteFunc,
  renameFunc,
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
          <OverlayTrigger
            placement="top"
            overlay={<Tooltip>Download folder</Tooltip>}
          >
            <Button
              onClick={() =>
                downloadFunc([{ handle: folder.handle, name: folder.name }])
              }
            >
              <AiOutlineDownload />
            </Button>
          </OverlayTrigger>
          <OverlayTrigger
            placement="top"
            overlay={<Tooltip>Rename folder</Tooltip>}
          >
            <Button
              onClick={() =>
                renameFunc({ handle: folder.handle, name: folder.name })
              }
            >
              <FiEdit />
            </Button>
          </OverlayTrigger>
          <OverlayTrigger
            placement="top"
            overlay={<Tooltip>Delete folder</Tooltip>}
          >
            <Button onClick={() => deleteFunc(folder.handle, folder.name)}>
              <AiOutlineDelete></AiOutlineDelete>
            </Button>
          </OverlayTrigger>
        </ButtonGroup>
      </td>
    </tr>
  );
};

export default Folder;
