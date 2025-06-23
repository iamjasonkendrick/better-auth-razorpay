'use strict';

const zod = require('zod');
require('better-call');
const account = require('../../shared/better-auth.CM7smaHY.cjs');
require('../../shared/better-auth.DiSjtgs9.cjs');
require('@better-auth/utils/base64');
require('@better-auth/utils/hmac');
require('@better-auth/utils/binary');
require('../../shared/better-auth.DcWKCjjf.cjs');
require('../../shared/better-auth.GpOOav9x.cjs');
require('defu');
require('../../cookies/index.cjs');
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

const customSession = (fn, options) => {
  return {
    id: "custom-session",
    endpoints: {
      getSession: account.createAuthEndpoint(
        "/get-session",
        {
          method: "GET",
          query: zod.z.optional(
            zod.z.object({
              /**
               * If cookie cache is enabled, it will disable the cache
               * and fetch the session from the database
               */
              disableCookieCache: zod.z.boolean({
                description: "Disable cookie cache and fetch session from database"
              }).or(zod.z.string().transform((v) => v === "true")).optional(),
              disableRefresh: zod.z.boolean({
                description: "Disable session refresh. Useful for checking session status, without updating the session"
              }).optional()
            })
          ),
          metadata: {
            CUSTOM_SESSION: true,
            openapi: {
              description: "Get custom session data",
              responses: {
                "200": {
                  description: "Success",
                  content: {
                    "application/json": {
                      schema: {
                        type: "array",
                        nullable: true,
                        items: {
                          $ref: "#/components/schemas/Session"
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          requireHeaders: true
        },
        async (ctx) => {
          const session = await account.getSession()({
            ...ctx,
            asResponse: false,
            headers: ctx.headers,
            returnHeaders: true
          }).catch((e) => {
            return null;
          });
          if (!session?.response) {
            return ctx.json(null);
          }
          const fnResult = await fn(session.response, ctx);
          session.headers.forEach((value, key) => {
            ctx.setHeader(key, value);
          });
          return ctx.json(fnResult);
        }
      )
    }
  };
};

exports.customSession = customSession;
