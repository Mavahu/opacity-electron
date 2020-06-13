let Bip32 = require('bip32');
const Axios = require('axios');
const EthCrypto = require('eth-crypto');
const AccountStatus = require('./models/AccountStatus');
const FolderMetadata = require('./models/FolderMetadata');
const Helper = require('./Helper');

class OpacityAccount{

    baseUrl = "https://broker-1.opacitynodes.com:3000/api/v1/";

    constructor(handle) {
        this.handle = handle;
        this.privateKey = handle.slice(0,64);
        this.chainCode = handle.slice(64,128);
        this.masterKey = Bip32.fromPrivateKey(Buffer.from(this.privateKey, 'hex'), Buffer.from(this.chainCode, 'hex'));
    }

     _signPayload(rawPayload){
        const payloadHash = EthCrypto.hash.keccak256(rawPayload);
        const signature = EthCrypto.sign(
            this.privateKey, // privateKey
            payloadHash // hash of message
        );

        return {
            "requestBody": rawPayload,
            "signature": signature.slice(2, 130),
            "publicKey": this.masterKey.publicKey.toString("hex"),
            "hash": payloadHash.slice(2)
        };
    }

    async checkAccountStatus(){
        const requestBody = {
            "timestamp": Date.now()
        };
        const rawPayload = JSON.stringify(requestBody)

        const payload = this._signPayload(rawPayload);
        const payloadJson = JSON.stringify(payload)

        const response = await Axios.post(this.baseUrl + "account-data", payloadJson);

        this.accStatus = AccountStatus.toObject(response.data);
    }

    async getFolderMetadata(folder){
        const folderKey = Helper.getFolderHDKey(this.masterKey, folder);
        const hashedFolderKey = EthCrypto.hash.keccak256(folderKey.publicKey.toString("hex")).slice(2);
        const keyString = EthCrypto.hash.keccak256(folderKey.privateKey.toString("hex")).slice(2);

        const fmd = await this._getFolderMetadataRequest(hashedFolderKey, keyString);
        return {"metadata": fmd, "hashedFolderKey": hashedFolderKey, "keyString": keyString};
    }

    async _getFolderMetadataRequest(hashedFolderKey, keyString){
        const rawPayload = {
            "timestamp": Date.now(),
            "metadataKey": hashedFolderKey
        };
        const rawPayloadJson = JSON.stringify(rawPayload);

        const payload = this._signPayload(rawPayloadJson);
        const payloadJson = JSON.stringify(payload);

        const response = await Axios.post(this.baseUrl + "metadata/get", payloadJson);
        const encryptedMetadata = Buffer.from(response.data.metadata, 'base64');

        const decryptedJson = Helper.decrypt(encryptedMetadata, keyString);

        return FolderMetadata.toObject(decryptedJson);
    }

    async delete(folder, handle){

        const metadata = (await this.getFolderMetadata(folder));

        if (handle.length === 128) {
            const rawPayload = {
                "fileId": handle.slice(0,64)
            }
            const rawPayloadJson = JSON.stringify(rawPayload);

            const payload = this._signPayload(rawPayloadJson)
            const payloadJson = JSON.stringify(payload);

            const response = await Axios.post(this.baseUrl + "delete", payloadJson)

            if (response.status === 200) {
                const newFiles =  metadata.metadata.files.filter(function(file){ return file.versions[0].handle !== handle; });
                metadata.metadata.files = newFiles;
                await this._setMetadata(metadata);
            }
            else{
                console.log(response)
            }
        }else if(handle.length === 64){
            console.log("folder deletion not implemented")
        }
    }

    async _setMetadata(metadata){
        const keyString = metadata.keyString

        const folderMetadataString = metadata.metadata.toString()

        const encryptedFolderMetadata = Helper.encrypt(folderMetadataString, keyString)

        const rawPayload = {
            "timestamp": Date.now(),
            "metadataKey": metadata.hashedFolderKey,
            "metadata": encryptedFolderMetadata
        }

        const rawPayloadJson = JSON.stringify(rawPayload);

        const payload = this._signPayload(rawPayloadJson)
        const payloadJson = JSON.stringify(payload);

        const response = await Axios.post(this.baseUrl + "metadata/set", payloadJson)
    }
}

module.exports = OpacityAccount;
