'use strict';

const betterCall = require('better-call');
const account = require('../../shared/better-auth.CM7smaHY.cjs');
require('zod');
const cookies_index = require('../../cookies/index.cjs');
const schema$1 = require('../../shared/better-auth.DcWKCjjf.cjs');
require('../../shared/better-auth.DiSjtgs9.cjs');
require('../../shared/better-auth.GpOOav9x.cjs');
require('defu');
const url = require('../../shared/better-auth.C-R0J0n1.cjs');
require('@better-auth/utils/random');
require('../../shared/better-auth.CWJ7qc0w.cjs');
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
require('../../shared/better-auth.CYeOI8C-.cjs');
require('../../social-providers/index.cjs');
require('@better-fetch/fetch');
require('../../shared/better-auth.6XyKj7DG.cjs');
require('../../shared/better-auth.C1hdVENX.cjs');
require('../../shared/better-auth.ANpbi45u.cjs');
require('../../shared/better-auth.D3mtHEZg.cjs');
require('../../shared/better-auth.Bg6iw3ig.cjs');
require('@better-auth/utils/hmac');
require('@better-auth/utils/binary');
require('../../shared/better-auth.BMYo0QR-.cjs');
require('jose/errors');

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
      signInAnonymous: account.createAuthEndpoint(
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
          const { emailDomainName = url.getOrigin(ctx.context.baseURL) } = options || {};
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
          await cookies_index.setSessionCookie(ctx, {
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
          handler: account.createAuthMiddleware(async (ctx) => {
            const setCookie = ctx.context.responseHeaders?.get("set-cookie");
            const sessionTokenName = ctx.context.authCookies.sessionToken.name;
            const sessionCookie = cookies_index.parseSetCookieHeader(setCookie || "").get(sessionTokenName)?.value.split(".")[0];
            if (!sessionCookie) {
              return;
            }
            const session = await account.getSessionFromCtx(
              ctx,
              {
                disableRefresh: true
              }
            );
            if (!session || !session.user.isAnonymous) {
              return;
            }
            if (ctx.path === "/sign-in/anonymous") {
              throw new betterCall.APIError("BAD_REQUEST", {
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
    schema: schema$1.mergeSchema(schema, options?.schema),
    $ERROR_CODES: ERROR_CODES
  };
};

exports.anonymous = anonymous;
