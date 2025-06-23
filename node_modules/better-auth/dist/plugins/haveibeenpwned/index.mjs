import { APIError } from 'better-call';
import '../../shared/better-auth.oUCDPPbQ.mjs';
import 'zod';
import '../../shared/better-auth.8zoxzg-F.mjs';
import '@better-auth/utils/base64';
import '@better-auth/utils/hmac';
import '@better-auth/utils/binary';
import '../../shared/better-auth.Cc72UxUH.mjs';
import '../../shared/better-auth.Cqykj82J.mjs';
import 'defu';
import { createHash } from '@better-auth/utils/hash';
import { betterFetch } from '@better-fetch/fetch';
import '../../cookies/index.mjs';
import '../../shared/better-auth.DdzSJf-n.mjs';
import '../../shared/better-auth.CW6D9eSx.mjs';
import '../../shared/better-auth.tB5eU6EY.mjs';
import '../../shared/better-auth.VTXNLFMT.mjs';
import '@better-auth/utils/random';
import '../../shared/better-auth.dn8_oqOu.mjs';
import '@noble/ciphers/chacha';
import '@noble/ciphers/utils';
import '@noble/ciphers/webcrypto';
import 'jose';
import '@noble/hashes/scrypt';
import '@better-auth/utils';
import '@better-auth/utils/hex';
import '@noble/hashes/utils';
import '../../shared/better-auth.B4Qoxdgc.mjs';
import '../../social-providers/index.mjs';
import '../../shared/better-auth.DufyW0qf.mjs';
import '../../shared/better-auth.BUPPRXfK.mjs';
import '../../shared/better-auth.DDEbWX-S.mjs';
import 'jose/errors';

const ERROR_CODES = {
  PASSWORD_COMPROMISED: "The password you entered has been compromised. Please choose a different password."
};
async function checkPasswordCompromise(password, customMessage) {
  if (!password) return;
  const sha1Hash = (await createHash("SHA-1", "hex").digest(password)).toUpperCase();
  const prefix = sha1Hash.substring(0, 5);
  const suffix = sha1Hash.substring(5);
  try {
    const { data, error } = await betterFetch(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      {
        headers: {
          "Add-Padding": "true",
          "User-Agent": "BetterAuth Password Checker"
        }
      }
    );
    if (error) {
      throw new APIError("INTERNAL_SERVER_ERROR", {
        message: `Failed to check password. Status: ${error.status}`
      });
    }
    const lines = data.split("\n");
    const found = lines.some(
      (line) => line.split(":")[0].toUpperCase() === suffix.toUpperCase()
    );
    if (found) {
      throw new APIError("BAD_REQUEST", {
        message: customMessage || ERROR_CODES.PASSWORD_COMPROMISED,
        code: "PASSWORD_COMPROMISED"
      });
    }
  } catch (error) {
    if (error instanceof APIError) throw error;
    throw new APIError("INTERNAL_SERVER_ERROR", {
      message: "Failed to check password. Please try again later."
    });
  }
}
const haveIBeenPwned = (options) => ({
  id: "haveIBeenPwned",
  init(ctx) {
    return {
      context: {
        password: {
          ...ctx.password,
          async hash(password) {
            await checkPasswordCompromise(
              password,
              options?.customPasswordCompromisedMessage
            );
            return ctx.password.hash(password);
          }
        }
      }
    };
  },
  $ERROR_CODES: ERROR_CODES
});

export { haveIBeenPwned };
