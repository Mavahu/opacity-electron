import React from 'react';
import Moment from 'react-moment';
import Filesize from 'filesize';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Swal from 'sweetalert2';
import * as Clipboardy from 'clipboardy';
import {
  AiOutlineFile,
  AiOutlineDownload,
  AiOutlineDelete,
  AiOutlineShareAlt,
} from 'react-icons/ai';
import { FiEdit } from 'react-icons/fi';
import Styled from 'styled-components';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';

const Checkbox = Styled.input.attrs({
  type: 'checkbox',
})``;

const File = ({
  file,
  deleteFunc,
  downloadFunc,
  renameFunc,
  changeCheckboxState,
}) => {
  const shareClick = (handle) => {
    Clipboardy.write('https://opacity.io/share#handle=' + handle);
    Swal.fire('', 'Copied the link to your clipboard!', 'success');
  };

  return (
    <tr>
      <td>
        <Checkbox
          checked={file.checked}
          onChange={(t) =>
            changeCheckboxState(t.target.checked, file.versions[0].handle)
          }
        />
      </td>
      <td>
        <AiOutlineFile />
      </td>
      <td>{file.name.slice(0, 64)}</td>
      <td>
        <Moment format="MMM Do YYYY">{new Date(file.created)}</Moment>
      </td>
      <td>{Filesize(file.versions[0].size)}</td>
      <td>
        <ButtonGroup>
          <OverlayTrigger
            placement="top"
            overlay={<Tooltip>Share file</Tooltip>}
          >
            <Button onClick={() => shareClick(file.versions[0].handle)}>
              <AiOutlineShareAlt />
            </Button>
          </OverlayTrigger>
          <OverlayTrigger
            placement="top"
            overlay={<Tooltip>Download file</Tooltip>}
          >
            <Button
              onClick={() =>
                downloadFunc([
                  { handle: file.versions[0].handle, name: file.name },
                ])
              }
            >
              <AiOutlineDownload />
            </Button>
          </OverlayTrigger>
          <OverlayTrigger
            placement="top"
            overlay={<Tooltip>Rename file</Tooltip>}
          >
            <Button
              onClick={() =>
                renameFunc({ handle: file.versions[0].handle, name: file.name })
              }
            >
              <FiEdit />
            </Button>
          </OverlayTrigger>
          <OverlayTrigger
            placement="top"
            overlay={<Tooltip>Delete file</Tooltip>}
          >
            <Button
              onClick={() => deleteFunc(file.versions[0].handle, file.name)}
            >
              <AiOutlineDelete />
            </Button>
          </OverlayTrigger>
        </ButtonGroup>
      </td>
    </tr>
  );
};

export default File;
