require = require('esm')(module);
const Crypto = require("crypto");

// https://www.npmjs.com/package/aes-256-gcm

const data = new Buffer([217, 49, 50, 37, 248, 132, 6, 229, 165, 89, 9, 197, 175, 245, 38, 154, 134, 167, 169, 83, 21, 52, 247, 218, 46, 76, 48, 61, 138, 49, 138, 114, 28, 60, 12, 149, 149, 104, 9, 83, 47, 207, 14, 36, 73, 166, 181, 37, 177, 106, 237, 245, 170, 13, 230, 87, 186, 99, 123, 57]);
const iv = new Buffer([147, 19, 34, 93, 248, 132, 6, 229, 85, 144, 156, 90, 255, 82, 105, 170]);
const key = new Buffer([254, 255, 233, 146, 134, 101, 115, 28, 109, 106, 143, 148, 103, 48, 131, 8, 254, 255, 233, 146, 134, 101, 115, 28, 109, 106, 143, 148, 103, 48, 131, 8]);
const cipher = Crypto.createCipheriv('aes-256-gcm', key, iv);

const ciphertext = cipher.update(data);
cipher.final();
const tag = cipher.getAuthTag();

const result = Buffer.concat([ciphertext, tag, iv]);
console.log(result)
debugger