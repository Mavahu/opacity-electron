import React from 'react';
import { toast } from 'react-toastify';
import Moment from 'react-moment';
import Filesize from 'filesize';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Swal from 'sweetalert2';
const Clipboardy = require('clipboardy');
import {
  AiOutlineFile,
  AiOutlineDownload,
  AiOutlineDelete,
  AiOutlineShareAlt,
} from 'react-icons/ai';
import { FiEdit } from 'react-icons/fi';

const File = ({ file, deleteFunc, downloadFunc, renameFunc }) => {
  const shareClick = (handle) => {
    Clipboardy.write('https://opacity.io/share#handle=' + handle);
    Swal.fire('', 'Copied the link to your clipboard!', 'success');
  };

  return (
    <tr>
      <td>
        <Form.Check aria-label="option 1" />
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
          <Button onClick={() => shareClick(file.versions[0].handle)}>
            <AiOutlineShareAlt></AiOutlineShareAlt>
          </Button>
          <Button
            onClick={() =>
              downloadFunc({ handle: file.versions[0].handle, name: file.name })
            }
          >
            <AiOutlineDownload />
          </Button>
          <Button
            onClick={() => renameFunc(file.versions[0].handle, file.name)}
          >
            <FiEdit />
          </Button>
          <Button
            onClick={() => deleteFunc(file.versions[0].handle, file.name)}
          >
            <AiOutlineDelete></AiOutlineDelete>
          </Button>
        </ButtonGroup>
      </td>
    </tr>
  );
};

export default File;
