import { scryptAsync } from '@noble/hashes/scrypt';
import { getRandomValues } from '@better-auth/utils';
import { hex } from '@better-auth/utils/hex';
import { hexToBytes } from '@noble/hashes/utils';

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
  return await scryptAsync(password.normalize("NFKC"), salt, {
    N: config.N,
    p: config.p,
    r: config.r,
    dkLen: config.dkLen,
    maxmem: 128 * config.N * config.r * 2
  });
}
const hashPassword = async (password) => {
  const salt = hex.encode(getRandomValues(new Uint8Array(16)));
  const key = await generateKey(password, salt);
  return `${salt}:${hex.encode(key)}`;
};
const verifyPassword = async ({
  hash,
  password
}) => {
  const [salt, key] = hash.split(":");
  const targetKey = await generateKey(password, salt);
  return constantTimeEqual(targetKey, hexToBytes(key));
};

export { constantTimeEqual as c, hashPassword as h, verifyPassword as v };
