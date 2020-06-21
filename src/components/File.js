import React from 'react';
import { toast } from 'react-toastify';
import Moment from 'react-moment';
import Filesize from 'filesize';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Badge from 'react-bootstrap/Badge';
import Swal from 'sweetalert2';
const Clipboardy = require('clipboardy');
import {
  AiOutlineFile,
  AiOutlineDelete,
  AiOutlineShareAlt,
} from 'react-icons/ai';
import { FiEdit } from 'react-icons/fi';
import { ipcRenderer } from 'electron';

const File = ({ file, deleteFunc, renameFunc }) => {
  const toastId = React.useRef(null);
  const deleteToastId = React.useRef(null);

  const deleteToast = () => {
    deleteToastId.current = toast(`Deleting ${file.name}`, {
      autoClose: false,
    });

    deleteFunc(file.versions[0].handle);

    ipcRenderer.once(`delete:finished:${file.versions[0].handle}`, () => {
      toast.update(deleteToastId.current, {
        render: `Deleted ${file.name}`,
        type: toast.TYPE.INFO,
        autoClose: 2000,
        closeButton: null, // The closeButton defined on ToastContainer will be used
      });
    });
  };

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
            onClick={() => renameFunc(file.versions[0].handle, file.name)}
          >
            <FiEdit />
          </Button>
          <Button onClick={deleteToast}>
            <AiOutlineDelete></AiOutlineDelete>
          </Button>
        </ButtonGroup>
      </td>
    </tr>
  );
};

export default File;
