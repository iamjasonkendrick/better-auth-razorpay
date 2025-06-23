import { createHash } from '@better-auth/utils/hash';
import { xchacha20poly1305 } from '@noble/ciphers/chacha';
import { utf8ToBytes, bytesToHex, hexToBytes } from '@noble/ciphers/utils';
import { managedNonce } from '@noble/ciphers/webcrypto';
import { c as constantTimeEqual } from '../shared/better-auth.OT3XFeFk.mjs';
export { h as hashPassword, v as verifyPassword } from '../shared/better-auth.OT3XFeFk.mjs';
import { base64 } from '@better-auth/utils/base64';
export { s as signJWT } from '../shared/better-auth.DDEbWX-S.mjs';
export { g as generateRandomString } from '../shared/better-auth.B4Qoxdgc.mjs';
import '@noble/hashes/scrypt';
import '@better-auth/utils';
import '@better-auth/utils/hex';
import '@noble/hashes/utils';
import 'jose';
import '@better-auth/utils/random';

async function hashToBase64(data) {
  const buffer = await createHash("SHA-256").digest(data);
  return base64.encode(buffer);
}
async function compareHash(data, hash) {
  const buffer = await createHash("SHA-256").digest(
    typeof data === "string" ? new TextEncoder().encode(data) : data
  );
  const hashBuffer = base64.decode(hash);
  return constantTimeEqual(buffer, hashBuffer);
}

const symmetricEncrypt = async ({
  key,
  data
}) => {
  const keyAsBytes = await createHash("SHA-256").digest(key);
  const dataAsBytes = utf8ToBytes(data);
  const chacha = managedNonce(xchacha20poly1305)(new Uint8Array(keyAsBytes));
  return bytesToHex(chacha.encrypt(dataAsBytes));
};
const symmetricDecrypt = async ({
  key,
  data
}) => {
  const keyAsBytes = await createHash("SHA-256").digest(key);
  const dataAsBytes = hexToBytes(data);
  const chacha = managedNonce(xchacha20poly1305)(new Uint8Array(keyAsBytes));
  return new TextDecoder().decode(chacha.decrypt(dataAsBytes));
};

export { compareHash, constantTimeEqual, hashToBase64, symmetricDecrypt, symmetricEncrypt };
