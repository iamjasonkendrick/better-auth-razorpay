import { APIError } from 'better-call';
import { c as createAuthMiddleware, a as createAuthEndpoint, g as getSessionFromCtx } from '../../shared/better-auth.oUCDPPbQ.mjs';
import 'zod';
import { parseSetCookieHeader, setSessionCookie } from '../../cookies/index.mjs';
import { m as mergeSchema } from '../../shared/better-auth.Cc72UxUH.mjs';
import '../../shared/better-auth.8zoxzg-F.mjs';
import '../../shared/better-auth.Cqykj82J.mjs';
import 'defu';
import { g as getOrigin } from '../../shared/better-auth.VTXNLFMT.mjs';
import '@better-auth/utils/random';
import '../../shared/better-auth.dn8_oqOu.mjs';
import '@better-auth/utils/hash';
import '@noble/ciphers/chacha';
import '@noble/ciphers/utils';
import '@noble/ciphers/webcrypto';
import '@better-auth/utils/base64';
import 'jose';
import '@noble/hashes/scrypt';
import '@better-auth/utils';
import '@better-auth/utils/hex';
import '@noble/hashes/utils';
import '../../shared/better-auth.B4Qoxdgc.mjs';
import '../../social-providers/index.mjs';
import '@better-fetch/fetch';
import '../../shared/better-auth.DufyW0qf.mjs';
import '../../shared/better-auth.CW6D9eSx.mjs';
import '../../shared/better-auth.DdzSJf-n.mjs';
import '../../shared/better-auth.tB5eU6EY.mjs';
import '../../shared/better-auth.BUPPRXfK.mjs';
import '@better-auth/utils/hmac';
import '@better-auth/utils/binary';
import '../../shared/better-auth.DDEbWX-S.mjs';
import 'jose/errors';

const schema = {
  user: {
    fields: {
      isAnonymous: {
        type: "boolean",
        required: false
      }
    }
  }
};
const anonymous = (options) => {
  const ERROR_CODES = {
    FAILED_TO_CREATE_USER: "Failed to create user",
    COULD_NOT_CREATE_SESSION: "Could not create session",
    ANONYMOUS_USERS_CANNOT_SIGN_IN_AGAIN_ANONYMOUSLY: "Anonymous users cannot sign in again anonymously"
  };
  return {
    id: "anonymous",
    endpoints: {
      signInAnonymous: createAuthEndpoint(
        "/sign-in/anonymous",
        {
          method: "POST",
          metadata: {
            openapi: {
              description: "Sign in anonymously",
              responses: {
                200: {
                  description: "Sign in anonymously",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          user: {
                            $ref: "#/components/schemas/User"
                          },
                          session: {
                            $ref: "#/components/schemas/Session"
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        async (ctx) => {
          const { emailDomainName = getOrigin(ctx.context.baseURL) } = options || {};
          const id = ctx.context.generateId({ model: "user" });
          const email = `temp-${id}@${emailDomainName}`;
          const name = options?.generateName?.(ctx) || "Anonymous";
          const newUser = await ctx.context.internalAdapter.createUser(
            {
              email,
              emailVerified: false,
              isAnonymous: true,
              name,
              createdAt: /* @__PURE__ */ new Date(),
              updatedAt: /* @__PURE__ */ new Date()
            },
            ctx
          );
          if (!newUser) {
            throw ctx.error("INTERNAL_SERVER_ERROR", {
              message: ERROR_CODES.FAILED_TO_CREATE_USER
            });
          }
          const session = await ctx.context.internalAdapter.createSession(
            newUser.id,
            ctx
          );
          if (!session) {
            return ctx.json(null, {
              status: 400,
              body: {
                message: ERROR_CODES.COULD_NOT_CREATE_SESSION
              }
            });
          }
          await setSessionCookie(ctx, {
            session,
            user: newUser
          });
          return ctx.json({
            token: session.token,
            user: {
              id: newUser.id,
              email: newUser.email,
              emailVerified: newUser.emailVerified,
              name: newUser.name,
              createdAt: newUser.createdAt,
              updatedAt: newUser.updatedAt
            }
          });
        }
      )
    },
    hooks: {
      after: [
        {
          matcher(ctx) {
            return ctx.path.startsWith("/sign-in") || ctx.path.startsWith("/sign-up") || ctx.path.startsWith("/callback") || ctx.path.startsWith("/oauth2/callback") || ctx.path.startsWith("/magic-link/verify") || ctx.path.startsWith("/email-otp/verify-email");
          },
          handler: createAuthMiddleware(async (ctx) => {
            const setCookie = ctx.context.responseHeaders?.get("set-cookie");
            const sessionTokenName = ctx.context.authCookies.sessionToken.name;
            const sessionCookie = parseSetCookieHeader(setCookie || "").get(sessionTokenName)?.value.split(".")[0];
            if (!sessionCookie) {
              return;
            }
            const session = await getSessionFromCtx(
              ctx,
              {
                disableRefresh: true
              }
            );
            if (!session || !session.user.isAnonymous) {
              return;
            }
            if (ctx.path === "/sign-in/anonymous") {
              throw new APIError("BAD_REQUEST", {
                message: ERROR_CODES.ANONYMOUS_USERS_CANNOT_SIGN_IN_AGAIN_ANONYMOUSLY
              });
            }
            const newSession = ctx.context.newSession;
            if (!newSession) {
              return;
            }
            if (options?.onLinkAccount) {
              await options?.onLinkAccount?.({
                anonymousUser: session,
                newUser: newSession
              });
            }
            if (!options?.disableDeleteAnonymousUser) {
              await ctx.context.internalAdapter.deleteUser(session.user.id);
            }
          })
        }
      ]
    },
    schema: mergeSchema(schema, options?.schema),
    $ERROR_CODES: ERROR_CODES
  };
};

export { anonymous };
