import Constants from './models/Constants';
import * as Aes from 'aes-256-gcm';
import BinaryFile from 'binary-file';
import Crypto from 'crypto';
import keccak256 from 'keccak256';

export function getFolderHDKey(key, folder) {
  return generateSubHDKey(key, 'folder: ' + folder);
}

export function generateSubHDKey(key, pathString) {
  const hashedPath = keccak256(pathString).toString('hex');
  const bipPath = hashToPath(hashedPath);

  const derivedKey = key.derivePath(bipPath);
  return derivedKey;
}

export function hashToPath(hash) {
  const subString = hash.match(/.{1,4}/g);
  const intsubString = subString.map(function (chunk) {
    return parseInt(chunk, 16);
  });
  const result = 'm/' + intsubString.join("'/") + "'";
  return result;
}

export function generateHashedFolderKey(folderKey) {
  const ttt = keccak256(folderKey.publicKey.toString('hex')).toString('hex');
  return ttt;
}

export function generateFolderKeystring(folderKey) {
  const ttt =  keccak256(folderKey.privateKey.toString('hex')).toString('hex');
  return ttt;
}

export function decrypt(encryptedData, key) {
  const raw = encryptedData.slice(0, encryptedData.length - 32);
  const tag = encryptedData.slice(raw.length, raw.length + 16);
  const iv = encryptedData.slice(tag.length + raw.length);

  const decrypted = Aes.decrypt(raw, iv, tag, key);

  return decrypted;
}

export function decryptFileChunk(encryptedChunk, key) {
  const raw = encryptedChunk.slice(0, encryptedChunk.length - 32);
  const tag = encryptedChunk.slice(raw.length, raw.length + 16);
  const iv = encryptedChunk.slice(tag.length + raw.length);

  const decipher = Crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  let cleartext = decipher.update(raw);

  return cleartext;
}

export function encrypt(data, key) {
  // https://www.npmjs.com/package/aes-256-gcm

  const iv = Crypto.randomBytes(16);
  const cipher = Crypto.createCipheriv('aes-256-gcm', key, iv);

  const ciphertext = cipher.update(data);
  cipher.final();
  const tag = cipher.getAuthTag();

  return Buffer.concat([ciphertext, tag, iv]);
}

export function getUploadSize(size) {
  const blockSize = Constants.DEFAULT_BLOCK_SIZE; //DEFAULT_BLOCK_SIZE = 64 * 1024
  const blockCount = Math.ceil(size / blockSize);
  return size + blockCount * Constants.BLOCK_OVERHEAD; //BLOCK_OVERHEAD = TAG_BYTE_LENGTH + IV_BYTE_LENGTH
}

export function getEndIndex(uploadSize, fileMetaoptions) {
  const blockSize = fileMetaoptions.blockSize;
  const partSize = fileMetaoptions.partSize;
  const chunkSize = blockSize + Constants.BLOCK_OVERHEAD; //BLOCK_OVERHEAD = TAG_BYTE_LENGTH + IV_BYTE_LENGTH
  const chunkCount = Math.ceil(uploadSize / chunkSize);
  const chunksPerPart = Math.ceil(partSize / chunkSize);

  const endIndex = Math.ceil(chunkCount / chunksPerPart);

  return endIndex;
}

export async function getPartial(fileInfo, partSize, currentIndex) {
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

export function getSlash(path) {
  const isExtendedLengthPath = /^\\\\\?\\/.test(path);
  //const hasNonAscii = /[^\u0000-\u0080]+/.test(path); // eslint-disable-line no-control-regex

  if (isExtendedLengthPath) {
    return path;
  }

  return path.replace(/\\/g, '/');
}
