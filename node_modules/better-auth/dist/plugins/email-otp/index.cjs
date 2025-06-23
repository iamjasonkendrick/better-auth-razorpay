'use strict';

const zod = require('zod');
const betterCall = require('better-call');
const account = require('../../shared/better-auth.CM7smaHY.cjs');
const cookies_index = require('../../cookies/index.cjs');
require('../../shared/better-auth.DcWKCjjf.cjs');
require('../../shared/better-auth.DiSjtgs9.cjs');
require('../../shared/better-auth.GpOOav9x.cjs');
require('defu');
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
const random = require('../../shared/better-auth.CYeOI8C-.cjs');
const date = require('../../shared/better-auth.C1hdVENX.cjs');
const pluginHelper = require('../../shared/better-auth.DNqtHmvg.cjs');
require('@better-auth/utils/random');
require('../../shared/better-auth.CWJ7qc0w.cjs');
require('../../social-providers/index.cjs');
require('@better-fetch/fetch');
require('../../shared/better-auth.6XyKj7DG.cjs');
require('../../shared/better-auth.ANpbi45u.cjs');
require('../../shared/better-auth.D3mtHEZg.cjs');
require('../../shared/better-auth.Bg6iw3ig.cjs');
require('@better-auth/utils/hmac');
require('@better-auth/utils/binary');
require('../../shared/better-auth.BMYo0QR-.cjs');
require('../../shared/better-auth.C-R0J0n1.cjs');
require('jose/errors');

const types = ["email-verification", "sign-in", "forget-password"];
const emailOTP = (options) => {
  const opts = {
    expiresIn: 5 * 60,
    generateOTP: () => random.generateRandomString(options.otpLength ?? 6, "0-9"),
    ...options
  };
  const ERROR_CODES = {
    OTP_EXPIRED: "otp expired",
    INVALID_OTP: "Invalid OTP",
    INVALID_EMAIL: "Invalid email",
    USER_NOT_FOUND: "User not found",
    TOO_MANY_ATTEMPTS: "Too many attempts"
  };
  return {
    id: "email-otp",
    endpoints: {
      sendVerificationOTP: account.createAuthEndpoint(
        "/email-otp/send-verification-otp",
        {
          method: "POST",
          body: zod.z.object({
            email: zod.z.string({
              description: "Email address to send the OTP"
            }),
            type: zod.z.enum(types, {
              description: "Type of the OTP"
            })
          }),
          metadata: {
            openapi: {
              description: "Send verification OTP",
              responses: {
                200: {
                  description: "Success",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          success: {
                            type: "boolean"
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
          if (!options?.sendVerificationOTP) {
            ctx.context.logger.error(
              "send email verification is not implemented"
            );
            throw new betterCall.APIError("BAD_REQUEST", {
              message: "send email verification is not implemented"
            });
          }
          const email = ctx.body.email;
          const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
          if (!emailRegex.test(email)) {
            throw ctx.error("BAD_REQUEST", {
              message: ERROR_CODES.INVALID_EMAIL
            });
          }
          if (ctx.body.type === "forget-password" || opts.disableSignUp) {
            const user = await ctx.context.internalAdapter.findUserByEmail(email);
            if (!user) {
              return ctx.json({
                success: true
              });
            }
          }
          const otp = opts.generateOTP(
            { email, type: ctx.body.type },
            ctx.request
          );
          await ctx.context.internalAdapter.createVerificationValue(
            {
              value: `${otp}:0`,
              identifier: `${ctx.body.type}-otp-${email}`,
              expiresAt: date.getDate(opts.expiresIn, "sec")
            },
            ctx
          ).catch(async (error) => {
            await ctx.context.internalAdapter.deleteVerificationByIdentifier(
              `${ctx.body.type}-otp-${email}`
            );
            await ctx.context.internalAdapter.createVerificationValue(
              {
                value: `${otp}:0`,
                identifier: `${ctx.body.type}-otp-${email}`,
                expiresAt: date.getDate(opts.expiresIn, "sec")
              },
              ctx
            );
          });
          await options.sendVerificationOTP(
            {
              email,
              otp,
              type: ctx.body.type
            },
            ctx.request
          );
          return ctx.json({
            success: true
          });
        }
      ),
      createVerificationOTP: account.createAuthEndpoint(
        "/email-otp/create-verification-otp",
        {
          method: "POST",
          body: zod.z.object({
            email: zod.z.string({
              description: "Email address to send the OTP"
            }),
            type: zod.z.enum(types, {
              description: "Type of the OTP"
            })
          }),
          metadata: {
            SERVER_ONLY: true,
            openapi: {
              description: "Create verification OTP",
              responses: {
                200: {
                  description: "Success",
                  content: {
                    "application/json": {
                      schema: {
                        type: "string"
                      }
                    }
                  }
                }
              }
            }
          }
        },
        async (ctx) => {
          const email = ctx.body.email;
          const otp = opts.generateOTP(
            { email, type: ctx.body.type },
            ctx.request
          );
          await ctx.context.internalAdapter.createVerificationValue(
            {
              value: `${otp}:0`,
              identifier: `${ctx.body.type}-otp-${email}`,
              expiresAt: date.getDate(opts.expiresIn, "sec")
            },
            ctx
          );
          return otp;
        }
      ),
      getVerificationOTP: account.createAuthEndpoint(
        "/email-otp/get-verification-otp",
        {
          method: "GET",
          query: zod.z.object({
            email: zod.z.string({
              description: "Email address to get the OTP"
            }),
            type: zod.z.enum(types)
          }),
          metadata: {
            SERVER_ONLY: true,
            openapi: {
              description: "Get verification OTP",
              responses: {
                "200": {
                  description: "OTP retrieved successfully or not found/expired",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          otp: {
                            type: "string",
                            nullable: true,
                            description: "The stored OTP, or null if not found or expired"
                          }
                        },
                        required: ["otp"]
                      }
                    }
                  }
                }
              }
            }
          }
        },
        async (ctx) => {
          const email = ctx.query.email;
          const verificationValue = await ctx.context.internalAdapter.findVerificationValue(
            `${ctx.query.type}-otp-${email}`
          );
          if (!verificationValue || verificationValue.expiresAt < /* @__PURE__ */ new Date()) {
            return ctx.json({
              otp: null
            });
          }
          return ctx.json({
            otp: verificationValue.value
          });
        }
      ),
      verifyEmailOTP: account.createAuthEndpoint(
        "/email-otp/verify-email",
        {
          method: "POST",
          body: zod.z.object({
            email: zod.z.string({
              description: "Email address to verify"
            }),
            otp: zod.z.string({
              description: "OTP to verify"
            })
          }),
          metadata: {
            openapi: {
              description: "Verify email OTP",
              responses: {
                200: {
                  description: "Success",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          status: {
                            type: "boolean",
                            description: "Indicates if the verification was successful",
                            enum: [true]
                          },
                          token: {
                            type: "string",
                            nullable: true,
                            description: "Session token if autoSignInAfterVerification is enabled, otherwise null"
                          },
                          user: {
                            $ref: "#/components/schemas/User"
                          },
                          required: ["status", "token", "user"]
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
          const email = ctx.body.email;
          const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
          if (!emailRegex.test(email)) {
            throw new betterCall.APIError("BAD_REQUEST", {
              message: ERROR_CODES.INVALID_EMAIL
            });
          }
          const verificationValue = await ctx.context.internalAdapter.findVerificationValue(
            `email-verification-otp-${email}`
          );
          if (!verificationValue) {
            throw new betterCall.APIError("BAD_REQUEST", {
              message: ERROR_CODES.INVALID_OTP
            });
          }
          if (verificationValue.expiresAt < /* @__PURE__ */ new Date()) {
            throw new betterCall.APIError("BAD_REQUEST", {
              message: ERROR_CODES.OTP_EXPIRED
            });
          }
          const [otpValue, attempts] = verificationValue.value.split(":");
          const allowedAttempts = options?.allowedAttempts || 3;
          if (attempts && parseInt(attempts) >= allowedAttempts) {
            await ctx.context.internalAdapter.deleteVerificationValue(
              verificationValue.id
            );
            throw new betterCall.APIError("FORBIDDEN", {
              message: ERROR_CODES.TOO_MANY_ATTEMPTS
            });
          }
          if (ctx.body.otp !== otpValue) {
            await ctx.context.internalAdapter.updateVerificationValue(
              verificationValue.id,
              {
                value: `${otpValue}:${parseInt(attempts || "0") + 1}`
              }
            );
            throw new betterCall.APIError("BAD_REQUEST", {
              message: ERROR_CODES.INVALID_OTP
            });
          }
          await ctx.context.internalAdapter.deleteVerificationValue(
            verificationValue.id
          );
          const user = await ctx.context.internalAdapter.findUserByEmail(email);
          if (!user) {
            throw new betterCall.APIError("BAD_REQUEST", {
              message: ERROR_CODES.USER_NOT_FOUND
            });
          }
          const updatedUser = await ctx.context.internalAdapter.updateUser(
            user.user.id,
            {
              email,
              emailVerified: true
            },
            ctx
          );
          if (ctx.context.options.emailVerification?.autoSignInAfterVerification) {
            const session = await ctx.context.internalAdapter.createSession(
              updatedUser.id,
              ctx
            );
            await cookies_index.setSessionCookie(ctx, {
              session,
              user: updatedUser
            });
            return ctx.json({
              status: true,
              token: session.token,
              user: {
                id: updatedUser.id,
                email: updatedUser.email,
                emailVerified: updatedUser.emailVerified,
                name: updatedUser.name,
                image: updatedUser.image,
                createdAt: updatedUser.createdAt,
                updatedAt: updatedUser.updatedAt
              }
            });
          }
          return ctx.json({
            status: true,
            token: null,
            user: {
              id: updatedUser.id,
              email: updatedUser.email,
              emailVerified: updatedUser.emailVerified,
              name: updatedUser.name,
              image: updatedUser.image,
              createdAt: updatedUser.createdAt,
              updatedAt: updatedUser.updatedAt
            }
          });
        }
      ),
      signInEmailOTP: account.createAuthEndpoint(
        "/sign-in/email-otp",
        {
          method: "POST",
          body: zod.z.object({
            email: zod.z.string({
              description: "Email address to sign in"
            }),
            otp: zod.z.string({
              description: "OTP sent to the email"
            })
          }),
          metadata: {
            openapi: {
              description: "Sign in with email OTP",
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
          const email = ctx.body.email;
          const verificationValue = await ctx.context.internalAdapter.findVerificationValue(
            `sign-in-otp-${email}`
          );
          if (!verificationValue) {
            throw new betterCall.APIError("BAD_REQUEST", {
              message: ERROR_CODES.INVALID_OTP
            });
          }
          if (verificationValue.expiresAt < /* @__PURE__ */ new Date()) {
            throw new betterCall.APIError("BAD_REQUEST", {
              message: ERROR_CODES.OTP_EXPIRED
            });
          }
          const [otpValue, attempts] = verificationValue.value.split(":");
          const allowedAttempts = options?.allowedAttempts || 3;
          if (attempts && parseInt(attempts) >= allowedAttempts) {
            await ctx.context.internalAdapter.deleteVerificationValue(
              verificationValue.id
            );
            throw new betterCall.APIError("FORBIDDEN", {
              message: ERROR_CODES.TOO_MANY_ATTEMPTS
            });
          }
          if (ctx.body.otp !== otpValue) {
            await ctx.context.internalAdapter.updateVerificationValue(
              verificationValue.id,
              {
                value: `${otpValue}:${parseInt(attempts || "0") + 1}`
              }
            );
            throw new betterCall.APIError("BAD_REQUEST", {
              message: ERROR_CODES.INVALID_OTP
            });
          }
          await ctx.context.internalAdapter.deleteVerificationValue(
            verificationValue.id
          );
          const user = await ctx.context.internalAdapter.findUserByEmail(email);
          if (!user) {
            if (opts.disableSignUp) {
              throw new betterCall.APIError("BAD_REQUEST", {
                message: ERROR_CODES.USER_NOT_FOUND
              });
            }
            const newUser = await ctx.context.internalAdapter.createUser(
              {
                email,
                emailVerified: true,
                name: ""
              },
              ctx
            );
            const session2 = await ctx.context.internalAdapter.createSession(
              newUser.id,
              ctx
            );
            await cookies_index.setSessionCookie(ctx, {
              session: session2,
              user: newUser
            });
            return ctx.json({
              token: session2.token,
              user: {
                id: newUser.id,
                email: newUser.email,
                emailVerified: newUser.emailVerified,
                name: newUser.name,
                image: newUser.image,
                createdAt: newUser.createdAt,
                updatedAt: newUser.updatedAt
              }
            });
          }
          if (!user.user.emailVerified) {
            await ctx.context.internalAdapter.updateUser(
              user.user.id,
              {
                emailVerified: true
              },
              ctx
            );
          }
          const session = await ctx.context.internalAdapter.createSession(
            user.user.id,
            ctx
          );
          await cookies_index.setSessionCookie(ctx, {
            session,
            user: user.user
          });
          return ctx.json({
            token: session.token,
            user: {
              id: user.user.id,
              email: user.user.email,
              emailVerified: user.user.emailVerified,
              name: user.user.name,
              image: user.user.image,
              createdAt: user.user.createdAt,
              updatedAt: user.user.updatedAt
            }
          });
        }
      ),
      forgetPasswordEmailOTP: account.createAuthEndpoint(
        "/forget-password/email-otp",
        {
          method: "POST",
          body: zod.z.object({
            email: zod.z.string({
              description: "Email address to send the OTP"
            })
          }),
          metadata: {
            openapi: {
              description: "Forget password with email OTP",
              responses: {
                200: {
                  description: "Success",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          success: {
                            type: "boolean",
                            description: "Indicates if the OTP was sent successfully"
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
          const email = ctx.body.email;
          const user = await ctx.context.internalAdapter.findUserByEmail(email);
          if (!user) {
            throw new betterCall.APIError("BAD_REQUEST", {
              message: ERROR_CODES.USER_NOT_FOUND
            });
          }
          const otp = opts.generateOTP(
            { email, type: "forget-password" },
            ctx.request
          );
          await ctx.context.internalAdapter.createVerificationValue(
            {
              value: `${otp}:0`,
              identifier: `forget-password-otp-${email}`,
              expiresAt: date.getDate(opts.expiresIn, "sec")
            },
            ctx
          );
          await options.sendVerificationOTP(
            {
              email,
              otp,
              type: "forget-password"
            },
            ctx.request
          );
          return ctx.json({
            success: true
          });
        }
      ),
      resetPasswordEmailOTP: account.createAuthEndpoint(
        "/email-otp/reset-password",
        {
          method: "POST",
          body: zod.z.object({
            email: zod.z.string({
              description: "Email address to reset the password"
            }),
            otp: zod.z.string({
              description: "OTP sent to the email"
            }),
            password: zod.z.string({
              description: "New password"
            })
          }),
          metadata: {
            openapi: {
              description: "Reset password with email OTP",
              responses: {
                200: {
                  description: "Success",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          success: {
                            type: "boolean"
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
          const email = ctx.body.email;
          const user = await ctx.context.internalAdapter.findUserByEmail(
            email,
            {
              includeAccounts: true
            }
          );
          if (!user) {
            throw new betterCall.APIError("BAD_REQUEST", {
              message: ERROR_CODES.USER_NOT_FOUND
            });
          }
          const verificationValue = await ctx.context.internalAdapter.findVerificationValue(
            `forget-password-otp-${email}`
          );
          if (!verificationValue) {
            throw new betterCall.APIError("BAD_REQUEST", {
              message: ERROR_CODES.INVALID_OTP
            });
          }
          if (verificationValue.expiresAt < /* @__PURE__ */ new Date()) {
            await ctx.context.internalAdapter.deleteVerificationValue(
              verificationValue.id
            );
            throw new betterCall.APIError("BAD_REQUEST", {
              message: ERROR_CODES.OTP_EXPIRED
            });
          }
          const [otpValue, attempts] = verificationValue.value.split(":");
          const allowedAttempts = options?.allowedAttempts || 3;
          if (attempts && parseInt(attempts) >= allowedAttempts) {
            await ctx.context.internalAdapter.deleteVerificationValue(
              verificationValue.id
            );
            throw new betterCall.APIError("FORBIDDEN", {
              message: ERROR_CODES.TOO_MANY_ATTEMPTS
            });
          }
          if (ctx.body.otp !== otpValue) {
            await ctx.context.internalAdapter.updateVerificationValue(
              verificationValue.id,
              {
                value: `${otpValue}:${parseInt(attempts || "0") + 1}`
              }
            );
            throw new betterCall.APIError("BAD_REQUEST", {
              message: ERROR_CODES.INVALID_OTP
            });
          }
          await ctx.context.internalAdapter.deleteVerificationValue(
            verificationValue.id
          );
          const passwordHash = await ctx.context.password.hash(
            ctx.body.password
          );
          const account = user.accounts.find(
            (account2) => account2.providerId === "credential"
          );
          if (!account) {
            await ctx.context.internalAdapter.createAccount(
              {
                userId: user.user.id,
                providerId: "credential",
                accountId: user.user.id,
                password: passwordHash
              },
              ctx
            );
          } else {
            await ctx.context.internalAdapter.updatePassword(
              user.user.id,
              passwordHash,
              ctx
            );
          }
          return ctx.json({
            success: true
          });
        }
      )
    },
    hooks: {
      after: [
        {
          matcher(context) {
            return !!(context.path?.startsWith("/sign-up") && opts.sendVerificationOnSignUp);
          },
          handler: account.createAuthMiddleware(async (ctx) => {
            const response = await pluginHelper.getEndpointResponse(ctx);
            const email = response?.user.email;
            if (email) {
              const otp = opts.generateOTP(
                { email, type: ctx.body.type },
                ctx.request
              );
              await ctx.context.internalAdapter.createVerificationValue(
                {
                  value: `${otp}:0`,
                  identifier: `email-verification-otp-${email}`,
                  expiresAt: date.getDate(opts.expiresIn, "sec")
                },
                ctx
              );
              await options.sendVerificationOTP(
                {
                  email,
                  otp,
                  type: "email-verification"
                },
                ctx.request
              );
            }
          })
        }
      ]
    },
    $ERROR_CODES: ERROR_CODES,
    rateLimit: [
      {
        pathMatcher(path) {
          return path === "/email-otp/send-verification-otp";
        },
        window: 60,
        max: 3
      },
      {
        pathMatcher(path) {
          return path === "/email-otp/verify-email";
        },
        window: 60,
        max: 3
      },
      {
        pathMatcher(path) {
          return path === "/sign-in/email-otp";
        },
        window: 60,
        max: 3
      }
    ]
  };
};

exports.emailOTP = emailOTP;
