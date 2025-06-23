import { serializeSignedCookie } from 'better-call';
import '../../shared/better-auth.8zoxzg-F.mjs';
import '@better-auth/utils/base64';
import { createHMAC } from '@better-auth/utils/hmac';
import '@better-auth/utils/binary';
import { parseSetCookieHeader } from '../../cookies/index.mjs';
import { c as createAuthMiddleware } from '../../shared/better-auth.oUCDPPbQ.mjs';
import 'zod';
import '../../shared/better-auth.Cc72UxUH.mjs';
import '../../shared/better-auth.Cqykj82J.mjs';
import 'defu';
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
          handler: createAuthMiddleware(async (c) => {
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
              signedToken = (await serializeSignedCookie("", token, c.context.secret)).replace("=", "");
            }
            try {
              const decodedToken = decodeURIComponent(signedToken);
              const isValid = await createHMAC(
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
          handler: createAuthMiddleware(async (ctx) => {
            const setCookie = ctx.context.responseHeaders?.get("set-cookie");
            if (!setCookie) {
              return;
            }
            const parsedCookies = parseSetCookieHeader(setCookie);
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

export { bearer };
