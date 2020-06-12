const Aes = require('aes-256-gcm');
const EthCrypto = require('eth-crypto');

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

  static decrypt(encryptedData, key) {
    const raw = encryptedData.slice(0, encryptedData.length - 32);
    const tag = encryptedData.slice(raw.length, raw.length + 16);
    const iv = encryptedData.slice(tag.length + raw.length);

    const decrypted = Aes.decrypt(raw, iv, tag, Buffer.from(key, 'hex'));
    const decryptedJson = JSON.parse(decrypted);

    return decryptedJson;
  }

  static encrypt() {
    // https://www.npmjs.com/package/aes-256-gcm
  }
}

module.exports = Helper;
