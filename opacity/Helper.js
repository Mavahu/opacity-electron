const Aes = require('aes-256-gcm');
const EthCrypto = require('eth-crypto');
const Constants = require('./models/Constants');
const BinaryFile = require('binary-file');
const Crypto = require('crypto');

class Helper {
  static getFolderHDKey(key, folder) {
    return Helper.generateSubHDKey(key, 'folder: ' + folder);
  }

  static generateSubHDKey(key, pathString) {
    const hashedPath = EthCrypto.hash.keccak256(pathString).slice(2);
    const bipPath = Helper.hashToPath(hashedPath);

    const derivedKey = key.derivePath(bipPath);
    return derivedKey;
  }

  static hashToPath(hash) {
    const subString = hash.match(/.{1,4}/g);
    const intsubString = subString.map(function (chunk) {
      return parseInt(chunk, 16);
    });
    const result = 'm/' + intsubString.join("'/") + "'";
    return result;
  }

  static generateHashedFolderKey(folderKey) {
    return EthCrypto.hash
      .keccak256(folderKey.publicKey.toString('hex'))
      .slice(2);
  }

  static generateFolderKeystring(folderKey) {
    return EthCrypto.hash
      .keccak256(folderKey.privateKey.toString('hex'))
      .slice(2);
  }

  static decrypt(encryptedData, key) {
    const raw = encryptedData.slice(0, encryptedData.length - 32);
    const tag = encryptedData.slice(raw.length, raw.length + 16);
    const iv = encryptedData.slice(tag.length + raw.length);

    const decrypted = Aes.decrypt(raw, iv, tag, key);

    return decrypted;
  }

  static decryptFileChunk(encryptedChunk, key) {
    const raw = encryptedChunk.slice(0, encryptedChunk.length - 32);
    const tag = encryptedChunk.slice(raw.length, raw.length + 16);
    const iv = encryptedChunk.slice(tag.length + raw.length);

    const decipher = Crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    let cleartext = decipher.update(raw);

    return cleartext;
  }

  static encrypt(data, key) {
    // https://www.npmjs.com/package/aes-256-gcm

    const iv = Crypto.randomBytes(16);
    const cipher = Crypto.createCipheriv('aes-256-gcm', key, iv);

    const ciphertext = cipher.update(data);
    cipher.final();
    const tag = cipher.getAuthTag();

    return Buffer.concat([ciphertext, tag, iv]);
  }

  static getUploadSize(size) {
    const blockSize = Constants.DEFAULT_BLOCK_SIZE; //DEFAULT_BLOCK_SIZE = 64 * 1024
    const blockCount = Math.ceil(size / blockSize);
    return size + blockCount * Constants.BLOCK_OVERHEAD; //BLOCK_OVERHEAD = TAG_BYTE_LENGTH + IV_BYTE_LENGTH
  }

  static getEndIndex(uploadSize, fileMetaoptions) {
    const blockSize = fileMetaoptions.blockSize;
    const partSize = fileMetaoptions.partSize;
    const chunkSize = blockSize + Constants.BLOCK_OVERHEAD; //BLOCK_OVERHEAD = TAG_BYTE_LENGTH + IV_BYTE_LENGTH
    const chunkCount = Math.ceil(uploadSize / chunkSize);
    const chunksPerPart = Math.ceil(partSize / chunkSize);

    const endIndex = Math.ceil(chunkCount / chunksPerPart);

    return endIndex;
  }

  static async getPartial(fileInfo, partSize, currentIndex) {
    const remaining = fileInfo.size - currentIndex * partSize;
    const uploadSize = Math.min(partSize, remaining);

    let data;

    const myBinaryFile = new BinaryFile(fileInfo.path, 'r');
    try {
      await myBinaryFile.open();
      data = await myBinaryFile.read(uploadSize, currentIndex * partSize);
      await myBinaryFile.close();
    } catch (e) {
      console.log(e);
    }
    return data;
  }
}

module.exports = Helper;
