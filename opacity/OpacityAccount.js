let Bip32 = require('bip32');
const Axios = require('axios');
const EthCrypto = require('eth-crypto');
const AccountStatus = require('./models/AccountStatus');
const {
  FolderMetadata,
  FolderMetadataFolder,
  FolderMetadataFile,
  FolderMetadataFileVersion,
} = require('./models/FolderMetadata');
const FileMetadata = require('./models/FileMetadata');
const Constants = require('./models/Constants');
const Helper = require('./Helper');
const BinaryFile = require('binary-file');
const Path = require('path');
const Slash = require('slash');
const Fs = require('fs');
const Crypto = require('crypto');
const FormData = require('form-data');
const { EventEmitter } = require('events');

class OpacityAccount extends EventEmitter {
  baseUrl = 'https://broker-1.opacitynodes.com:3000/api/v1/';

  constructor(handle) {
    super();
    this.handle = handle;
    this.privateKey = handle.slice(0, 64);
    this.chainCode = handle.slice(64, 128);
    this.masterKey = Bip32.fromPrivateKey(
      Buffer.from(this.privateKey, 'hex'),
      Buffer.from(this.chainCode, 'hex')
    );
  }

  _signPayload(rawPayload) {
    const payloadHash = EthCrypto.hash.keccak256(rawPayload);
    const signature = EthCrypto.sign(
      this.privateKey, // privateKey
      payloadHash // hash of message
    );

    return {
      requestBody: rawPayload,
      signature: signature.slice(2, 130),
      publicKey: this.masterKey.publicKey.toString('hex'),
      hash: payloadHash.slice(2),
    };
  }

  _signPayloadForm(rawPayload, additionalPayload = {}) {
    const payloadHash = EthCrypto.hash.keccak256(rawPayload);
    const signature = EthCrypto.sign(
      this.privateKey, // privateKey
      payloadHash // hash of message
    );

    const form = new FormData();
    form.append('requestBody', rawPayload);
    form.append('signature', signature.slice(2, 130));
    form.append('publicKey', this.masterKey.publicKey.toString('hex'));

    Object.keys(additionalPayload).forEach((key) => {
      // element is the name of the key.
      // key is just a numerical value for the array
      // _array is the array of all the keys

      // this keyword = secondArg
      form.append(key, additionalPayload[key], key);
    });

    return form;
  }

  async checkAccountStatus() {
    const requestBody = {
      timestamp: Date.now(),
    };
    const rawPayload = JSON.stringify(requestBody);

    const payload = this._signPayload(rawPayload);
    const payloadJson = JSON.stringify(payload);

    const response = await Axios.post(
      this.baseUrl + 'account-data',
      payloadJson
    );

    this.accStatus = AccountStatus.toObject(response.data);
  }

  async getFolderMetadata(folder) {
    const { hashedFolderKey, keyString } = this._createMetadataKeyAndKeyString(
      folder
    );

    const fmd = await this._getFolderMetadataRequest(
      hashedFolderKey,
      keyString
    );
    return {
      metadata: fmd,
      hashedFolderKey: hashedFolderKey,
      keyString: keyString,
    };
  }

  async _getFolderMetadataRequest(hashedFolderKey, keyString) {
    const rawPayload = {
      timestamp: Date.now(),
      metadataKey: hashedFolderKey,
    };
    const rawPayloadJson = JSON.stringify(rawPayload);

    const payload = this._signPayload(rawPayloadJson);
    const payloadJson = JSON.stringify(payload);

    const response = await Axios.post(
      this.baseUrl + 'metadata/get',
      payloadJson
    );
    const encryptedMetadata = Buffer.from(response.data.metadata, 'base64');

    const decrypted = Helper.decrypt(
      encryptedMetadata,
      Buffer.from(keyString, 'hex')
    );
    const decryptedJson = JSON.parse(decrypted);

    return FolderMetadata.toObject(decryptedJson);
  }

  async delete(folder, handle) {
    const metadata = await this.getFolderMetadata(folder);

    if (handle.length === 128) {
      const rawPayload = {
        fileId: handle.slice(0, 64),
      };
      const rawPayloadJson = JSON.stringify(rawPayload);

      const payload = this._signPayload(rawPayloadJson);
      const payloadJson = JSON.stringify(payload);

      const response = await Axios.post(this.baseUrl + 'delete', payloadJson);

      if (response.status === 200) {
        const newFiles = metadata.metadata.files.filter(function (file) {
          return file.versions[0].handle !== handle;
        });
        metadata.metadata.files = newFiles;
        await this._setMetadata(metadata);
      } else {
        console.log(response);
      }
    } else if (handle.length === 64) {
      console.log('folder deletion not implemented');
    }
  }

  async _setMetadata(metadata) {
    const keyString = metadata.keyString;

    const folderMetadataString = metadata.metadata.toString();

    const encryptedFolderMetadata = Helper.encrypt(
      folderMetadataString,
      Buffer.from(keyString, 'hex')
    );
    const encryptedFolderMetadataBase64 = encryptedFolderMetadata.toString(
      'base64'
    );

    const rawPayload = {
      timestamp: Date.now(),
      metadataKey: metadata.hashedFolderKey,
      metadata: encryptedFolderMetadataBase64,
    };

    const rawPayloadJson = JSON.stringify(rawPayload);

    const payload = this._signPayload(rawPayloadJson);
    const payloadJson = JSON.stringify(payload);

    const response = await Axios.post(
      this.baseUrl + 'metadata/set',
      payloadJson
    );
  }

  async upload(folder, fileOrFolderPath) {
    let fileStats = Fs.lstatSync(fileOrFolderPath);
    if (fileStats.isFile()) {
      return await this.uploadFile(folder, fileOrFolderPath);
    } else {
      return await this.uploadFolder(folder, fileOrFolderPath);
    }
  }

  async uploadFolder(folder, folderPath) {
    const folderName = Path.basename(folderPath);
    const finalPath = Slash(Path.join(folder, folderName));

    const response = await this.createFolder(finalPath);

    const files = Fs.readdirSync(folderPath);
    for (let index = 0; index < files.length; index++) {
      const toUpload = Path.join(folderPath, files[index]);
      await this.upload(finalPath, toUpload);
    }
    return response;
  }

  async uploadFile(folder, filePath) {
    try {
      const fileName = Path.basename(filePath);
      const stats = Fs.statSync(filePath);
      const fileData = {
        path: filePath,
        name: fileName,
        size: stats.size,
        type: '',
      };

      const metadataToCheckIn = await this.getFolderMetadata(folder);
      for (const file of metadataToCheckIn.metadata.files) {
        if (file.name === fileData['name']) {
          console.log(`File: ${fileData.name} already exists`);
          return;
        }
      }
      console.log(`Uploading file: ${fileData.name}`);
      const fileMetaData = FileMetadata.toObject(fileData);
      const uploadSize = Helper.getUploadSize(fileMetaData.size);
      const endIndex = Helper.getEndIndex(uploadSize, fileMetaData.p);

      const handle = Crypto.randomBytes(64);
      const keyBytes = handle.slice(32, 64);

      const fileMetadataJson = JSON.stringify(fileMetaData);
      const encryptedFileMetadataJson = Helper.encrypt(
        fileMetadataJson,
        keyBytes
      );

      const handleHex = handle.toString('hex');
      this.emit('upload:init', { handle: handleHex, fileName: fileData.name });
      const fileId = handleHex.slice(0, 64);

      let requestBody = {
        fileHandle: fileId,
        fileSizeInByte: uploadSize,
        endIndex: endIndex,
      };

      let requestBodyJson = JSON.stringify(requestBody);

      const form = this._signPayloadForm(requestBodyJson, {
        metadata: encryptedFileMetadataJson,
      });

      let response = await Axios.post(this.baseUrl + 'init-upload', form, {
        headers: form.getHeaders(),
      });

      if (response.status !== 200) {
        console.log('File initiation failed');
        console.log(response);
      }

      const promiseAmount = 5;
      for (
        let chunkIndex = 0, uploadProgress = 0;
        chunkIndex < endIndex;
        chunkIndex += promiseAmount
      ) {
        const promises = [];
        Array(promiseAmount)
          .fill()
          .map((_, i) => {
            if (i + chunkIndex < endIndex) {
              promises.push(
                this._uploadFilePart(
                  fileData,
                  fileMetaData,
                  handle,
                  i + chunkIndex,
                  endIndex
                )
              );
              uploadProgress++;
            }
          });
        await Promise.all(promises);
        this.emit(
          `upload:progress:${handleHex}`,
          Math.round((uploadProgress / endIndex + Number.EPSILON) * 100)
        );
      }

      // Verify Upload & Retry missing parts
      requestBody = { fileHandle: fileId };
      requestBodyJson = JSON.stringify(requestBody);
      const payload = this._signPayload(requestBodyJson);
      const payloadJson = JSON.stringify(payload);

      response = await Axios.post(this.baseUrl + 'upload-status', payloadJson);

      if (response.data.status === 'chunks missing') {
        console.log('retrying upload');
        const retries = 3;
        for (let retry = 0; retry < retries; retry++) {
          let missingParts = response.data.missingIndexes;
          for (const missingPart of missingParts) {
            console.log(
              `Trying to re-upload part ${missingPart} of ${response.data.endIndex}`
            );
            await this._uploadFilePart(
              fileData,
              fileMetaData,
              handle,
              missingPart - 1,
              endIndex
            );
          }
          response = await Axios.post(
            this.baseUrl + 'upload-status',
            payloadJson
          );
          if (response.data.status === 'File is uploaded') {
            break;
          } else {
            if (retry === 2) {
              console.log(
                `Failed to upload the ${fileData.name}\nReason: Too many retries`
              );
              return;
            }
          }
        }
      }

      // Add file to the Metadata

      const fileInfo = new FolderMetadataFile(
        fileData.name,
        Math.floor(stats.ctimeMs),
        Math.floor(stats.mtimeMs)
      );
      fileInfo.versions.push(
        new FolderMetadataFileVersion(
          handleHex,
          fileData.size,
          fileInfo.modified,
          fileInfo.created
        )
      );

      const metadata = await this.getFolderMetadata(folder);
      metadata.metadata.files.push(fileInfo);
      await this._setMetadata(metadata);
      console.log(`Uploaded file: ${fileData.name}`);
      this.emit(`upload:finished:${handleHex}`);
      return true;
    } catch (e) {
      console.log(e);
      this.emit(`upload:failed:${handleHex}`);
    }
  }

  async _uploadFilePart(
    fileData,
    fileMetadata,
    handle,
    currentIndex,
    endIndex
  ) {
    console.log(`Uploading Part ${currentIndex + 1} out of ${endIndex}`);
    const fileId = handle.slice(0, 32).toString('hex');
    const keyBytes = handle.slice(32, 64);

    const rawpart = await Helper.getPartial(
      fileData,
      fileMetadata.p.partSize,
      currentIndex
    );

    const numChunks = Math.ceil(rawpart.length / fileMetadata.p.blockSize);
    let encryptedData = Buffer.alloc(0);
    for (let chunkIndex = 0; chunkIndex < numChunks; chunkIndex++) {
      const remaining = rawpart.length - chunkIndex * fileMetadata.p.blockSize;
      if (remaining <= 0) {
        break;
      }
      const chunkSize = Math.min(remaining, fileMetadata.p.blockSize);
      const chunk = rawpart.slice(
        chunkIndex * fileMetadata.p.blockSize,
        chunkIndex * fileMetadata.p.blockSize + chunkSize
      );
      const encryptedChunk = Helper.encrypt(chunk, keyBytes);
      encryptedData = Buffer.concat([encryptedData, encryptedChunk]);
    }

    const requestBody = {
      fileHandle: fileId,
      partIndex: currentIndex + 1,
      endIndex: endIndex,
    };

    const requestBodyJson = JSON.stringify(requestBody);

    const form = this._signPayloadForm(requestBodyJson, {
      chunkData: encryptedData,
    });

    const response = await Axios.post(this.baseUrl + 'upload', form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
  }

  async download(opacityFolder, fileOrFolder, savingPath) {
    if (fileOrFolder.handle.length === 128) {
      return await this._downloadFile(fileOrFolder.handle, savingPath);
    } else {
      return await this._downloadFolder(
        opacityFolder,
        fileOrFolder.name,
        savingPath
      );
    }
  }

  async _downloadFile(handle, savingPath) {
    const fileId = handle.slice(0, 64);
    const fileKey = Buffer.from(handle.slice(64, 128), 'hex');

    const payloadJson = JSON.stringify({ fileID: fileId });
    let response = await Axios.post(this.baseUrl + 'download', payloadJson);

    const downloadUrl = response.data.fileDownloadUrl;

    // Get file metadata
    response = await Axios.get(downloadUrl + '/metadata', {
      responseType: 'arraybuffer',
    });

    const encryptedMetadata = response.data;
    const decryptedMetadata = Helper.decrypt(encryptedMetadata, fileKey);
    const decryptedMetadataJson = JSON.parse(decryptedMetadata);
    const fileMetaoptions = FileMetadata.toObject(decryptedMetadataJson);

    this.emit('download:init', {
      handle: handle,
      fileName: fileMetaoptions.name,
    });

    const uploadSize = Helper.getUploadSize(fileMetaoptions.size);
    const partSize = 5245440; // 80 * (Constants.DEFAULT_BLOCK_SIZE + Constants.BLOCK_OVERHEAD)
    const parts = Math.floor(uploadSize / partSize) + 1;

    const fileWithoutExtension = Path.basename(
      fileMetaoptions.name,
      Path.extname(fileMetaoptions.name)
    );
    const folderPath = Path.join(savingPath, 'tmp', fileWithoutExtension);
    if (!Fs.existsSync(folderPath)) {
      Fs.mkdirSync(folderPath, { recursive: true });
    }

    // Download all parts
    console.log(`Downloading file: ${fileMetaoptions.name}`);
    const fileDownloadUrl = downloadUrl + '/file';

    const promiseAmount = 5;
    for (let part = 0; part < parts; part += promiseAmount) {
      const promises = [];
      Array(promiseAmount)
        .fill()
        .map((_, i) => {
          if (i + part < parts) {
            promises.push(
              this._downloadPart(
                part + i,
                parts,
                partSize,
                uploadSize,
                fileDownloadUrl,
                folderPath
              )
            );
          }
        });
      await Promise.all(promises);
      this.emit(
        `download:progress:${handle}`,
        part + 1 !== parts
          ? Math.round(((part + 1) / parts + Number.EPSILON) * 100)
          : 99
      );
    }

    /*this.emit(
        `download:progress:${handle}`,
        part + 1 !== parts
          ? Math.round(((part + 1) / parts + Number.EPSILON) * 100)
          : 99
      );*/

    // Reconstruct file out of the parts
    console.log('Reconstructing');
    const chunkSize = fileMetaoptions.p.blockSize + Constants.BLOCK_OVERHEAD;
    const chunksAmount = Math.floor(uploadSize / chunkSize) + 1;

    const savePath = Path.join(savingPath, fileMetaoptions.name);

    if (Fs.existsSync(savePath)) {
      Fs.unlinkSync(savePath);
    }

    const outputFile = Fs.createWriteStream(savePath, { encoding: 'binary' });
    let fileIndex = 0;
    let seek = 0;
    let partPath = Path.join(folderPath, fileIndex + '.part');
    let myBinaryFile = new BinaryFile(partPath, 'r');
    await myBinaryFile.open();
    for (let chunkIndex = 0; chunkIndex < chunksAmount; chunkIndex++) {
      let chunkRawBytes;
      let toReadBytes = chunkSize;
      //myBinaryFile.seek(seek);
      if (seek + toReadBytes >= Fs.statSync(partPath).size) {
        toReadBytes = Fs.statSync(partPath).size - seek;
        seek = 0;
        fileIndex++;
      } else {
        seek += chunkSize;
      }
      try {
        chunkRawBytes = await myBinaryFile.read(toReadBytes);
      } catch (e) {
        console.log(e);
      }
      const decryptedChunk = Helper.decryptFileChunk(chunkRawBytes, fileKey);
      await outputFile.write(decryptedChunk);
      // Fs.appendFileSync(savePath, decryptedChunk, { encoding: 'binary' });

      if (seek === 0 && chunkIndex + 1 !== chunksAmount) {
        await myBinaryFile.close();
        partPath = Path.join(folderPath, fileIndex + '.part');
        myBinaryFile = new BinaryFile(partPath, 'r');
        await myBinaryFile.open();
      }
    }
    await outputFile.close();
    await myBinaryFile.close();

    Fs.rmdirSync(folderPath, { recursive: true });
    const tempFolderPath = Path.dirname(folderPath);
    const content = Fs.readdirSync(tempFolderPath);
    if (content.length === 0) {
      Fs.rmdirSync(tempFolderPath);
    }

    this.emit(`download:finished:${handle}`);
    console.log(`Finished download of ${fileMetaoptions.name}`);
  }

  async _downloadPart(
    partIndex,
    endPartIndex,
    partSize,
    uploadSize,
    fileDownloadUrl,
    folderPath
  ) {
    console.log(`Downloading part ${partIndex + 1} out of ${endPartIndex}`);
    const byteFrom = partIndex * partSize;
    let byteTo = (partIndex + 1) * partSize - 1;
    if (byteTo > uploadSize - 1) {
      byteTo = uploadSize - 1;
    }
    const range = `bytes=${byteFrom}-${byteTo}`;
    const response = await Axios.get(fileDownloadUrl, {
      responseType: 'arraybuffer',
      headers: { range },
    });
    const fileToWriteTo = Path.join(folderPath, partIndex + '.part');
    Fs.writeFileSync(fileToWriteTo, response.data);
  }

  async _downloadFolder(opacityFolder, folderToDownload, savingPath) {
    const newFolderPath = Path.join(savingPath, folderToDownload);

    if (!Fs.existsSync(newFolderPath)) {
      Fs.mkdirSync(newFolderPath, { recursive: true });
      console.log('Created Folder!');
    } else {
      console.log('Folder exists already');
    }

    const opacityPath = Slash(Path.join(opacityFolder, folderToDownload));
    const newMetadata = (await this.getFolderMetadata(opacityPath)).metadata;

    for (const folder of newMetadata.folders) {
      await this._downloadFolder(opacityPath, folder.name, newFolderPath);
    }

    for (const file of newMetadata.files) {
      await this._downloadFile(file.versions[0].handle, newFolderPath);
    }
  }

  async createFolder(folderPath) {
    const parentFolder = Path.dirname(folderPath);
    const folderName = Path.basename(folderPath);
    const { metadata, add } = await this._createMetadataFolder(folderPath);
    if (add === true) {
      const newFolder = new FolderMetadataFolder(
        folderName,
        metadata.hashedFolderKey
      );
      const parentMetadata = await this.getFolderMetadata(parentFolder);
      parentMetadata.metadata.folders.push(newFolder);
      await this._setMetadata(parentMetadata);
      console.log(`Created successfully: ${folderPath}`);
      return true;
    } else {
      return false;
    }
  }

  async _createMetadataFolder(folderPath) {
    const { hashedFolderKey, keyString } = this._createMetadataKeyAndKeyString(
      folderPath
    );
    const requestBody = {
      timestamp: Date.now(),
      metadataKey: hashedFolderKey,
    };

    const rawPayload = JSON.stringify(requestBody);
    const payload = this._signPayload(rawPayload);
    const payloadJson = JSON.stringify(payload);

    try {
      const response = await Axios.post(
        this.baseUrl + 'metadata/create',
        payloadJson
      );
    } catch (e) {
      if (e.response.status === 403) {
        console.log(`The folder: ${folderPath} already exists!`);
        return { add: false };
      } else {
        console.log(e.response);
        throw e;
      }
    }

    const newFolderMetadata = new FolderMetadata(
      Path.basename(folderPath),
      Date.now(),
      Date.now()
    );
    const metadata = {
      metadata: newFolderMetadata,
      hashedFolderKey: hashedFolderKey,
      keyString: keyString,
    };

    await this._setMetadata(metadata);
    return { metadata: metadata, add: true };
  }

  _createMetadataKeyAndKeyString(folder) {
    const folderKey = Helper.getFolderHDKey(this.masterKey, folder);
    const hashedFolderKey = Helper.generateHashedFolderKey(folderKey);
    const keyString = Helper.generateFolderKeystring(folderKey);

    return { hashedFolderKey: hashedFolderKey, keyString: keyString };
  }

  async rename(folder, handle, newName) {
    if (handle.length === 128) {
      const metadata = await this.getFolderMetadata(folder);
      let oldname = '';
      for (const file of metadata.metadata.files) {
        if (file.versions[0].handle === handle) {
          oldname = file.name;
          file.name = newName;
          break;
        }
      }
      await this._setMetadata(metadata);
      console.log(`Successfully renamed ${oldname} into ${newName}`);
    } else {
      console.log('Folder renaming not implemented yet!');
    }
  }
}

module.exports = OpacityAccount;
