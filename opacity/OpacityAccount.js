let Bip32 = require('bip32');
const Axios = require('axios');
const EthCrypto = require('eth-crypto');
const AccountStatus = require('./models/AccountStatus');
const {
  FolderMetadata,
  FolderMetadataFile,
  FolderMetadataFileVersion,
} = require('./models/FolderMetadata');
const FileMetadata = require('./models/FileMetadata');
const Constants = require('./models/Constants');
const Helper = require('./Helper');
const BinaryFile = require('binary-file');
const Path = require('path');
const Fs = require('fs');
const Crypto = require('crypto');
const FormData = require('form-data');

class OpacityAccount {
  baseUrl = 'https://broker-1.opacitynodes.com:3000/api/v1/';

  constructor(handle) {
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
    const folderKey = Helper.getFolderHDKey(this.masterKey, folder);
    const hashedFolderKey = EthCrypto.hash
      .keccak256(folderKey.publicKey.toString('hex'))
      .slice(2);
    const keyString = EthCrypto.hash
      .keccak256(folderKey.privateKey.toString('hex'))
      .slice(2);

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

  async uploadFile(folder, filePath) {
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

    for (let i = 0; i < endIndex; i++) {
      await this._uploadFilePart(fileData, fileMetaData, handle, i, endIndex);
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
    return true;
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

  async downloadFile(savingPath, handle) {
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

    for (let part = 0; part < parts; part++) {
      await this._downloadPart(
        part,
        parts,
        partSize,
        uploadSize,
        fileDownloadUrl,
        folderPath
      );
    }

    // Reconstruct file out of the parts
    const chunkSize = fileMetaoptions.p.blockSize + Constants.BLOCK_OVERHEAD;
    const chunksAmount = Math.floor(uploadSize / chunkSize) + 1;

    const savePath = Path.join(savingPath, fileMetaoptions.name);

    if (Fs.existsSync(savePath)) {
      Fs.unlinkSync(savePath);
    }

    let fileIndex = 0;
    let seek = 0;
    for (let chunkIndex = 0; chunkIndex < chunksAmount; chunkIndex++) {
      let chunkRawBytes;
      let toReadBytes = chunkSize;
      const partPath = Path.join(folderPath, fileIndex + '.part');
      if (seek + toReadBytes >= Fs.statSync(partPath).size) {
        toReadBytes = Fs.statSync(partPath).size;
        seek = 0;
        fileIndex++;
      }
      const myBinaryFile = new BinaryFile(partPath, 'r');
      try {
        await myBinaryFile.open();
        chunkRawBytes = await myBinaryFile.read(toReadBytes, seek);
        await myBinaryFile.close();
      } catch (e) {
        console.log(e);
      }
      const decryptedChunk = Helper.decryptFileChunk(chunkRawBytes, fileKey);
      Fs.appendFileSync(savePath, decryptedChunk, { encoding: 'binary' });
      seek += chunkSize;
    }

    Fs.rmdirSync(folderPath, { recursive: true });
    const tempFolderPath = Path.dirname(folderPath);
    const content = Fs.readdirSync(tempFolderPath);
    if (content.length === 0) {
      Fs.rmdirSync(tempFolderPath);
    }

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
    const range = { range: `bytes=${byteFrom}-${byteTo}` };
    const response = await Axios.get(fileDownloadUrl, {
      responseType: 'arraybuffer',
      headers: { range },
    });

    const fileToWriteTo = Path.join(folderPath, partIndex + '.part');
    Fs.writeFileSync(fileToWriteTo, response.data);
  }
}

module.exports = OpacityAccount;
