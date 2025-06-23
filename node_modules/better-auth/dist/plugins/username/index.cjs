'use strict';

const zod = require('zod');
const account = require('../../shared/better-auth.CM7smaHY.cjs');
const betterCall = require('better-call');
const cookies_index = require('../../cookies/index.cjs');
const schema$1 = require('../../shared/better-auth.DcWKCjjf.cjs');
require('../../shared/better-auth.DiSjtgs9.cjs');
require('../../shared/better-auth.GpOOav9x.cjs');
require('defu');
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
require('../../shared/better-auth.C-R0J0n1.cjs');
require('jose/errors');

const schema = {
  user: {
    fields: {
      username: {
        type: "string",
        required: false,
        sortable: true,
        unique: true,
        returned: true,
        transform: {
          input(value) {
            return value?.toString().toLowerCase();
          }
        }
      },
      displayUsername: {
        type: "string",
        required: false
      }
    }
  }
};

const USERNAME_ERROR_CODES = {
  INVALID_USERNAME_OR_PASSWORD: "invalid username or password",
  EMAIL_NOT_VERIFIED: "email not verified",
  UNEXPECTED_ERROR: "unexpected error",
  USERNAME_IS_ALREADY_TAKEN: "username is already taken. please try another.",
  USERNAME_TOO_SHORT: "username is too short",
  USERNAME_TOO_LONG: "username is too long",
  INVALID_USERNAME: "username is invalid"
};

function defaultUsernameValidator(username2) {
  return /^[a-zA-Z0-9_.]+$/.test(username2);
}
const username = (options) => {
  return {
    id: "username",
    endpoints: {
      signInUsername: account.createAuthEndpoint(
        "/sign-in/username",
        {
          method: "POST",
          body: zod.z.object({
            username: zod.z.string({
              description: "The username of the user"
            }),
            password: zod.z.string({
              description: "The password of the user"
            }),
            rememberMe: zod.z.boolean({
              description: "Remember the user session"
            }).optional()
          }),
          metadata: {
            openapi: {
              summary: "Sign in with username",
              description: "Sign in with username",
              responses: {
                200: {
                  description: "Success",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          token: {
                            type: "string",
                            description: "Session token for the authenticated session"
                          },
                          user: {
                            $ref: "#/components/schemas/User"
                          }
                        },
                        required: ["token", "user"]
                      }
                    }
                  }
                }
              }
            }
          }
        },
        async (ctx) => {
          if (!ctx.body.username || !ctx.body.password) {
            ctx.context.logger.error("Username or password not found");
            throw new betterCall.APIError("UNAUTHORIZED", {
              message: USERNAME_ERROR_CODES.INVALID_USERNAME_OR_PASSWORD
            });
          }
          const minUsernameLength = options?.minUsernameLength || 3;
          const maxUsernameLength = options?.maxUsernameLength || 30;
          if (ctx.body.username.length < minUsernameLength) {
            ctx.context.logger.error("Username too short", {
              username: ctx.body.username
            });
            throw new betterCall.APIError("UNPROCESSABLE_ENTITY", {
              message: USERNAME_ERROR_CODES.USERNAME_TOO_SHORT
            });
          }
          if (ctx.body.username.length > maxUsernameLength) {
            ctx.context.logger.error("Username too long", {
              username: ctx.body.username
            });
            throw new betterCall.APIError("UNPROCESSABLE_ENTITY", {
              message: USERNAME_ERROR_CODES.USERNAME_TOO_LONG
            });
          }
          const validator = options?.usernameValidator || defaultUsernameValidator;
          if (!validator(ctx.body.username)) {
            throw new betterCall.APIError("UNPROCESSABLE_ENTITY", {
              message: USERNAME_ERROR_CODES.INVALID_USERNAME
            });
          }
          const user = await ctx.context.adapter.findOne({
            model: "user",
            where: [
              {
                field: "username",
                value: ctx.body.username.toLowerCase()
              }
            ]
          });
          if (!user) {
            await ctx.context.password.hash(ctx.body.password);
            ctx.context.logger.error("User not found", { username });
            throw new betterCall.APIError("UNAUTHORIZED", {
              message: USERNAME_ERROR_CODES.INVALID_USERNAME_OR_PASSWORD
            });
          }
          if (!user.emailVerified && ctx.context.options.emailAndPassword?.requireEmailVerification) {
            await account.sendVerificationEmailFn(ctx, user);
            throw new betterCall.APIError("FORBIDDEN", {
              message: USERNAME_ERROR_CODES.EMAIL_NOT_VERIFIED
            });
          }
          const account$1 = await ctx.context.adapter.findOne({
            model: "account",
            where: [
              {
                field: "userId",
                value: user.id
              },
              {
                field: "providerId",
                value: "credential"
              }
            ]
          });
          if (!account$1) {
            throw new betterCall.APIError("UNAUTHORIZED", {
              message: USERNAME_ERROR_CODES.INVALID_USERNAME_OR_PASSWORD
            });
          }
          const currentPassword = account$1?.password;
          if (!currentPassword) {
            ctx.context.logger.error("Password not found", { username });
            throw new betterCall.APIError("UNAUTHORIZED", {
              message: USERNAME_ERROR_CODES.INVALID_USERNAME_OR_PASSWORD
            });
          }
          const validPassword = await ctx.context.password.verify({
            hash: currentPassword,
            password: ctx.body.password
          });
          if (!validPassword) {
            ctx.context.logger.error("Invalid password");
            throw new betterCall.APIError("UNAUTHORIZED", {
              message: USERNAME_ERROR_CODES.INVALID_USERNAME_OR_PASSWORD
            });
          }
          const session = await ctx.context.internalAdapter.createSession(
            user.id,
            ctx,
            ctx.body.rememberMe === false
          );
          if (!session) {
            return ctx.json(null, {
              status: 500,
              body: {
                message: account.BASE_ERROR_CODES.FAILED_TO_CREATE_SESSION
              }
            });
          }
          await cookies_index.setSessionCookie(
            ctx,
            { session, user },
            ctx.body.rememberMe === false
          );
          return ctx.json({
            token: session.token,
            user: {
              id: user.id,
              email: user.email,
              emailVerified: user.emailVerified,
              username: user.username,
              name: user.name,
              image: user.image,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt
            }
          });
        }
      )
    },
    schema: schema$1.mergeSchema(schema, options?.schema),
    hooks: {
      before: [
        {
          matcher(context) {
            return context.path === "/sign-up/email" || context.path === "/update-user";
          },
          handler: account.createAuthMiddleware(async (ctx) => {
            const username2 = ctx.body.username;
            if (username2 !== void 0 && typeof username2 === "string") {
              const minUsernameLength = options?.minUsernameLength || 3;
              const maxUsernameLength = options?.maxUsernameLength || 30;
              if (username2.length < minUsernameLength) {
                throw new betterCall.APIError("UNPROCESSABLE_ENTITY", {
                  message: USERNAME_ERROR_CODES.USERNAME_TOO_SHORT
                });
              }
              if (username2.length > maxUsernameLength) {
                throw new betterCall.APIError("UNPROCESSABLE_ENTITY", {
                  message: USERNAME_ERROR_CODES.USERNAME_TOO_LONG
                });
              }
              const validator = options?.usernameValidator || defaultUsernameValidator;
              const valid = await validator(username2);
              if (!valid) {
                throw new betterCall.APIError("UNPROCESSABLE_ENTITY", {
                  message: USERNAME_ERROR_CODES.INVALID_USERNAME
                });
              }
              const user = await ctx.context.adapter.findOne({
                model: "user",
                where: [
                  {
                    field: "username",
                    value: username2.toLowerCase()
                  }
                ]
              });
              if (user) {
                throw new betterCall.APIError("UNPROCESSABLE_ENTITY", {
                  message: USERNAME_ERROR_CODES.USERNAME_IS_ALREADY_TAKEN
                });
              }
            }
          })
        },
        {
          matcher(context) {
            return context.path === "/sign-up/email" || context.path === "/update-user";
          },
          handler: account.createAuthMiddleware(async (ctx) => {
            if (!ctx.body.displayUsername && ctx.body.username) {
              ctx.body.displayUsername = ctx.body.username;
            }
          })
        }
      ]
    },
    $ERROR_CODES: USERNAME_ERROR_CODES
  };
};

exports.USERNAME_ERROR_CODES = USERNAME_ERROR_CODES;
exports.username = username;
