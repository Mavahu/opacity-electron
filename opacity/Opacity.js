let Bip32 = require('bip32');
const Axios = require('axios');
const EthCrypto = require('eth-crypto');
const AccountStatus = require('./models/AccountStatus');
const FolderMetadata = require('./models/FolderMetadata');
const Helper = require('./Helper');

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

  signPayload(rawPayload) {
    const payloadHash = EthCrypto.hash.keccak256(rawPayload);
    const signature = EthCrypto.sign(
      this.privateKey, // privateKey
      payloadHash // hash of message
    );

    const newDict = {
      requestBody: rawPayload,
      signature: signature.slice(2, 130),
      publicKey: this.masterKey.publicKey.toString('hex'),
      hash: payloadHash.slice(2),
    };
    return newDict;
  }

  async checkAccountStatus() {
    const requestBody = {
      timestamp: Date.now(),
    };
    const rawPayload = JSON.stringify(requestBody);

    const payload = this.signPayload(rawPayload);
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

    const fmd = await this.getFolderMetadataRequest(hashedFolderKey, keyString);
    return fmd;
  }

  async getFolderMetadataRequest(hashedFolderKey, keyString) {
    const rawPayload = {
      timestamp: Date.now(),
      metadataKey: hashedFolderKey,
    };
    const rawPayloadJson = JSON.stringify(rawPayload);

    const payload = this.signPayload(rawPayloadJson);
    const payloadJson = JSON.stringify(payload);

    const response = await Axios.post(
      this.baseUrl + 'metadata/get',
      payloadJson
    );
    const encryptedMetadata = Buffer.from(response.data.metadata, 'base64');

    const decryptedJson = Helper.decrypt(encryptedMetadata, keyString);

    return FolderMetadata.toObject(decryptedJson);
  }
}

module.exports = OpacityAccount;
