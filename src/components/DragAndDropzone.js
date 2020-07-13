import { ipcRenderer } from 'electron';
import React from 'react';

/*
  Handles all the dropped files/folders into the application.
  Gets the path of the files and sends them to the main thread to upload them.
*/
class DragAndDropzone extends React.Component {
  constructor(props) {
    super(props);
  }

  // From here
  handleDrag(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  handleDragIn(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  handleDragOut(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  // till here these functions are needed to initialize,
  // otherwise the dropzone isn't functional

  handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const files = [];
    e.dataTransfer.files.forEach((file) => files.push(file.path));
    ipcRenderer.send('files:upload', {
      folder: this.props.folderPath,
      files: files,
    });
  }
  render() {
    return (
      <div
        style={{
          position: 'absolute',
          padding: 0,
          margin: 0,
          top: 0,
          left: 0,
          height: '100%',
          width: '100%',
        }}
        className={'drag-drop-zone'}
        onDrop={(e) => this.handleDrop(e)}
        onDragOver={(e) => this.handleDrag(e)}
        onDragEnter={(e) => this.handleDragIn(e)}
        onDragLeave={(e) => this.handleDragOut(e)}
      >
        {this.props.children}
      </div>
    );
  }
}

export default DragAndDropzone;
