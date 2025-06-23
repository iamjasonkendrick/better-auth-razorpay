'use strict';

const hash = require('@better-auth/utils/hash');
const chacha = require('@noble/ciphers/chacha');
const utils = require('@noble/ciphers/utils');
const webcrypto = require('@noble/ciphers/webcrypto');
const password = require('../shared/better-auth.YUF6P-PB.cjs');
const base64 = require('@better-auth/utils/base64');
const jwt = require('../shared/better-auth.BMYo0QR-.cjs');
const random = require('../shared/better-auth.CYeOI8C-.cjs');
require('@noble/hashes/scrypt');
require('@better-auth/utils');
require('@better-auth/utils/hex');
require('@noble/hashes/utils');
require('jose');
require('@better-auth/utils/random');

async function hashToBase64(data) {
  const buffer = await hash.createHash("SHA-256").digest(data);
  return base64.base64.encode(buffer);
}
async function compareHash(data, hash$1) {
  const buffer = await hash.createHash("SHA-256").digest(
    typeof data === "string" ? new TextEncoder().encode(data) : data
  );
  const hashBuffer = base64.base64.decode(hash$1);
  return password.constantTimeEqual(buffer, hashBuffer);
}

const symmetricEncrypt = async ({
  key,
  data
}) => {
  const keyAsBytes = await hash.createHash("SHA-256").digest(key);
  const dataAsBytes = utils.utf8ToBytes(data);
  const chacha$1 = webcrypto.managedNonce(chacha.xchacha20poly1305)(new Uint8Array(keyAsBytes));
  return utils.bytesToHex(chacha$1.encrypt(dataAsBytes));
};
const symmetricDecrypt = async ({
  key,
  data
}) => {
  const keyAsBytes = await hash.createHash("SHA-256").digest(key);
  const dataAsBytes = utils.hexToBytes(data);
  const chacha$1 = webcrypto.managedNonce(chacha.xchacha20poly1305)(new Uint8Array(keyAsBytes));
  return new TextDecoder().decode(chacha$1.decrypt(dataAsBytes));
};

exports.constantTimeEqual = password.constantTimeEqual;
exports.hashPassword = password.hashPassword;
exports.verifyPassword = password.verifyPassword;
exports.signJWT = jwt.signJWT;
exports.generateRandomString = random.generateRandomString;
exports.compareHash = compareHash;
exports.hashToBase64 = hashToBase64;
exports.symmetricDecrypt = symmetricDecrypt;
exports.symmetricEncrypt = symmetricEncrypt;
