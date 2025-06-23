'use strict';

const betterCall = require('better-call');
require('../../shared/better-auth.CM7smaHY.cjs');
require('zod');
require('../../shared/better-auth.DiSjtgs9.cjs');
require('@better-auth/utils/base64');
require('@better-auth/utils/hmac');
require('@better-auth/utils/binary');
require('../../shared/better-auth.DcWKCjjf.cjs');
require('../../shared/better-auth.GpOOav9x.cjs');
require('defu');
const hash = require('@better-auth/utils/hash');
const fetch = require('@better-fetch/fetch');
require('../../cookies/index.cjs');
require('../../shared/better-auth.ANpbi45u.cjs');
require('../../shared/better-auth.C1hdVENX.cjs');
require('../../shared/better-auth.D3mtHEZg.cjs');
require('../../shared/better-auth.C-R0J0n1.cjs');
require('@better-auth/utils/random');
require('../../shared/better-auth.CWJ7qc0w.cjs');
require('@noble/ciphers/chacha');
require('@noble/ciphers/utils');
require('@noble/ciphers/webcrypto');
require('jose');
require('@noble/hashes/scrypt');
require('@better-auth/utils');
require('@better-auth/utils/hex');
require('@noble/hashes/utils');
require('../../shared/better-auth.CYeOI8C-.cjs');
require('../../social-providers/index.cjs');
require('../../shared/better-auth.6XyKj7DG.cjs');
require('../../shared/better-auth.Bg6iw3ig.cjs');
require('../../shared/better-auth.BMYo0QR-.cjs');
require('jose/errors');

const ERROR_CODES = {
  PASSWORD_COMPROMISED: "The password you entered has been compromised. Please choose a different password."
};
async function checkPasswordCompromise(password, customMessage) {
  if (!password) return;
  const sha1Hash = (await hash.createHash("SHA-1", "hex").digest(password)).toUpperCase();
  const prefix = sha1Hash.substring(0, 5);
  const suffix = sha1Hash.substring(5);
  try {
    const { data, error } = await fetch.betterFetch(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      {
        headers: {
          "Add-Padding": "true",
          "User-Agent": "BetterAuth Password Checker"
        }
      }
    );
    if (error) {
      throw new betterCall.APIError("INTERNAL_SERVER_ERROR", {
        message: `Failed to check password. Status: ${error.status}`
      });
    }
    const lines = data.split("\n");
    const found = lines.some(
      (line) => line.split(":")[0].toUpperCase() === suffix.toUpperCase()
    );
    if (found) {
      throw new betterCall.APIError("BAD_REQUEST", {
        message: customMessage || ERROR_CODES.PASSWORD_COMPROMISED,
        code: "PASSWORD_COMPROMISED"
      });
    }
  } catch (error) {
    if (error instanceof betterCall.APIError) throw error;
    throw new betterCall.APIError("INTERNAL_SERVER_ERROR", {
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

exports.haveIBeenPwned = haveIBeenPwned;
