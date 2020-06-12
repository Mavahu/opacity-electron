import React from 'react';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Badge from 'react-bootstrap/Badge';
import { AiOutlineFile } from 'react-icons/ai';
import { AiFillFolder } from 'react-icons/ai';

const Folder = ({ folder }) => {
  return (
    <tr>
      <td>
        <Form.Check aria-label="option 1" />
      </td>
      <td>
        <AiFillFolder />
      </td>
      <td>
        <Button variant="outline-info">{folder.name.slice(0, 64)}</Button>
      </td>
      <td></td>
      <td></td>
      <td>x</td>
    </tr>
  );
};

export default Folder;
