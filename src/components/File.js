import React from 'react';
import Moment from 'react-moment';
import filesize from 'filesize';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Badge from 'react-bootstrap/Badge';
import { AiOutlineFile } from 'react-icons/ai';

const File = ({ file }) => {
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
      <td>{filesize(file.versions[0].size)}</td>
      <td>x</td>
    </tr>
  );
};

export default File;
