import { z } from 'zod';
import 'better-call';
import { a as createAuthEndpoint, b as getSession } from '../../shared/better-auth.oUCDPPbQ.mjs';
import '../../shared/better-auth.8zoxzg-F.mjs';
import '@better-auth/utils/base64';
import '@better-auth/utils/hmac';
import '@better-auth/utils/binary';
import '../../shared/better-auth.Cc72UxUH.mjs';
import '../../shared/better-auth.Cqykj82J.mjs';
import 'defu';
import '../../cookies/index.mjs';
import '../../shared/better-auth.DdzSJf-n.mjs';
import '../../shared/better-auth.CW6D9eSx.mjs';
import '../../shared/better-auth.tB5eU6EY.mjs';
import '../../shared/better-auth.VTXNLFMT.mjs';
import '@better-auth/utils/random';
import '../../shared/better-auth.dn8_oqOu.mjs';
import '@better-auth/utils/hash';
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
import '@better-fetch/fetch';
import '../../shared/better-auth.DufyW0qf.mjs';
import '../../shared/better-auth.BUPPRXfK.mjs';
import '../../shared/better-auth.DDEbWX-S.mjs';
import 'jose/errors';

const customSession = (fn, options) => {
  return {
    id: "custom-session",
    endpoints: {
      getSession: createAuthEndpoint(
        "/get-session",
        {
          method: "GET",
          query: z.optional(
            z.object({
              /**
               * If cookie cache is enabled, it will disable the cache
               * and fetch the session from the database
               */
              disableCookieCache: z.boolean({
                description: "Disable cookie cache and fetch session from database"
              }).or(z.string().transform((v) => v === "true")).optional(),
              disableRefresh: z.boolean({
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
          const session = await getSession()({
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

export { customSession };
