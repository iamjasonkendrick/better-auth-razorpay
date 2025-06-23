'use strict';

const betterCall = require('better-call');
require('../../shared/better-auth.DiSjtgs9.cjs');
require('@better-auth/utils/base64');
const hmac = require('@better-auth/utils/hmac');
require('@better-auth/utils/binary');
const cookies_index = require('../../cookies/index.cjs');
const account = require('../../shared/better-auth.CM7smaHY.cjs');
require('zod');
require('../../shared/better-auth.DcWKCjjf.cjs');
require('../../shared/better-auth.GpOOav9x.cjs');
require('defu');
require('../../shared/better-auth.ANpbi45u.cjs');
require('../../shared/better-auth.C1hdVENX.cjs');
require('../../shared/better-auth.D3mtHEZg.cjs');
require('../../shared/better-auth.C-R0J0n1.cjs');
require('@better-auth/utils/random');
require('../../shared/better-auth.CWJ7qc0w.cjs');
require('@better-auth/utils/hash');
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
require('@better-fetch/fetch');
require('../../shared/better-auth.6XyKj7DG.cjs');
require('../../shared/better-auth.Bg6iw3ig.cjs');
require('../../shared/better-auth.BMYo0QR-.cjs');
require('jose/errors');

const bearer = (options) => {
  return {
    id: "bearer",
    hooks: {
      before: [
        {
          matcher(context) {
            return Boolean(
              context.request?.headers.get("authorization") || context.headers?.get("authorization")
            );
          },
          handler: account.createAuthMiddleware(async (c) => {
            const token = c.request?.headers.get("authorization")?.replace("Bearer ", "") || c.headers?.get("Authorization")?.replace("Bearer ", "");
            if (!token) {
              return;
            }
            let signedToken = "";
            if (token.includes(".")) {
              signedToken = token.replace("=", "");
            } else {
              if (options?.requireSignature) {
                return;
              }
              signedToken = (await betterCall.serializeSignedCookie("", token, c.context.secret)).replace("=", "");
            }
            try {
              const decodedToken = decodeURIComponent(signedToken);
              const isValid = await hmac.createHMAC(
                "SHA-256",
                "base64urlnopad"
              ).verify(
                c.context.secret,
                decodedToken.split(".")[0],
                decodedToken.split(".")[1]
              );
              if (!isValid) {
                return;
              }
            } catch (e) {
              return;
            }
            const existingHeaders = c.request?.headers || c.headers;
            const headers = new Headers({
              ...Object.fromEntries(existingHeaders?.entries())
            });
            headers.append(
              "cookie",
              `${c.context.authCookies.sessionToken.name}=${signedToken}`
            );
            return {
              context: {
                headers
              }
            };
          })
        }
      ],
      after: [
        {
          matcher(context) {
            return true;
          },
          handler: account.createAuthMiddleware(async (ctx) => {
            const setCookie = ctx.context.responseHeaders?.get("set-cookie");
            if (!setCookie) {
              return;
            }
            const parsedCookies = cookies_index.parseSetCookieHeader(setCookie);
            const cookieName = ctx.context.authCookies.sessionToken.name;
            const sessionCookie = parsedCookies.get(cookieName);
            if (!sessionCookie || !sessionCookie.value || sessionCookie["max-age"] === 0) {
              return;
            }
            const token = sessionCookie.value;
            ctx.setHeader("set-auth-token", token);
            ctx.setHeader("Access-Control-Expose-Headers", "set-auth-token");
          })
        }
      ]
    }
  };
};

exports.bearer = bearer;
