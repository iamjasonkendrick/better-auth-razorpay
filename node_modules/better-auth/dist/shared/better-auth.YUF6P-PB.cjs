'use strict';

const scrypt = require('@noble/hashes/scrypt');
const utils = require('@better-auth/utils');
const hex = require('@better-auth/utils/hex');
const utils$1 = require('@noble/hashes/utils');

function constantTimeEqual(a, b) {
  const aBuffer = new Uint8Array(a);
  const bBuffer = new Uint8Array(b);
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  let c = 0;
  for (let i = 0; i < aBuffer.length; i++) {
    c |= aBuffer[i] ^ bBuffer[i];
  }
  return c === 0;
}

const config = {
  N: 16384,
  r: 16,
  p: 1,
  dkLen: 64
};
async function generateKey(password, salt) {
  return await scrypt.scryptAsync(password.normalize("NFKC"), salt, {
    N: config.N,
    p: config.p,
    r: config.r,
    dkLen: config.dkLen,
    maxmem: 128 * config.N * config.r * 2
  });
}
const hashPassword = async (password) => {
  const salt = hex.hex.encode(utils.getRandomValues(new Uint8Array(16)));
  const key = await generateKey(password, salt);
  return `${salt}:${hex.hex.encode(key)}`;
};
const verifyPassword = async ({
  hash,
  password
}) => {
  const [salt, key] = hash.split(":");
  const targetKey = await generateKey(password, salt);
  return constantTimeEqual(targetKey, utils$1.hexToBytes(key));
};

exports.constantTimeEqual = constantTimeEqual;
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
