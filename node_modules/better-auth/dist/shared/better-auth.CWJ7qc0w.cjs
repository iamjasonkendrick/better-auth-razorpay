'use strict';

const zod = require('zod');
const betterCall = require('better-call');
require('@better-auth/utils/hash');
require('@noble/ciphers/chacha');
require('@noble/ciphers/utils');
require('@noble/ciphers/webcrypto');
require('@better-auth/utils/base64');
require('jose');
require('@noble/hashes/scrypt');
require('@better-auth/utils');
require('@better-auth/utils/hex');
require('@noble/hashes/utils');
const random = require('./better-auth.CYeOI8C-.cjs');

async function generateState(c, link) {
  const callbackURL = c.body?.callbackURL || c.context.options.baseURL;
  if (!callbackURL) {
    throw new betterCall.APIError("BAD_REQUEST", {
      message: "callbackURL is required"
    });
  }
  const codeVerifier = random.generateRandomString(128);
  const state = random.generateRandomString(32);
  const data = JSON.stringify({
    callbackURL,
    codeVerifier,
    errorURL: c.body?.errorCallbackURL,
    newUserURL: c.body?.newUserCallbackURL,
    link,
    /**
     * This is the actual expiry time of the state
     */
    expiresAt: Date.now() + 10 * 60 * 1e3,
    requestSignUp: c.body?.requestSignUp
  });
  const expiresAt = /* @__PURE__ */ new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10);
  const verification = await c.context.internalAdapter.createVerificationValue(
    {
      value: data,
      identifier: state,
      expiresAt
    },
    c
  );
  if (!verification) {
    c.context.logger.error(
      "Unable to create verification. Make sure the database adapter is properly working and there is a verification table in the database"
    );
    throw new betterCall.APIError("INTERNAL_SERVER_ERROR", {
      message: "Unable to create verification"
    });
  }
  return {
    state: verification.identifier,
    codeVerifier
  };
}
async function parseState(c) {
  const state = c.query.state || c.body.state;
  const data = await c.context.internalAdapter.findVerificationValue(state);
  if (!data) {
    c.context.logger.error("State Mismatch. Verification not found", {
      state
    });
    throw c.redirect(
      `${c.context.baseURL}/error?error=please_restart_the_process`
    );
  }
  const parsedData = zod.z.object({
    callbackURL: zod.z.string(),
    codeVerifier: zod.z.string(),
    errorURL: zod.z.string().optional(),
    newUserURL: zod.z.string().optional(),
    expiresAt: zod.z.number(),
    link: zod.z.object({
      email: zod.z.string(),
      userId: zod.z.coerce.string()
    }).optional(),
    requestSignUp: zod.z.boolean().optional()
  }).parse(JSON.parse(data.value));
  if (!parsedData.errorURL) {
    parsedData.errorURL = `${c.context.baseURL}/error`;
  }
  if (parsedData.expiresAt < Date.now()) {
    await c.context.internalAdapter.deleteVerificationValue(data.id);
    throw c.redirect(
      `${c.context.baseURL}/error?error=please_restart_the_process`
    );
  }
  await c.context.internalAdapter.deleteVerificationValue(data.id);
  return parsedData;
}

exports.generateState = generateState;
exports.parseState = parseState;
