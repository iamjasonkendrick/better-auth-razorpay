'use strict';

const random = require('../../shared/better-auth.CYeOI8C-.cjs');
const zod = require('zod');
const account = require('../../shared/better-auth.CM7smaHY.cjs');
const betterCall = require('better-call');
const cookies_index = require('../../cookies/index.cjs');
const schema$1 = require('../../shared/better-auth.DcWKCjjf.cjs');
require('../../shared/better-auth.DiSjtgs9.cjs');
require('../../shared/better-auth.GpOOav9x.cjs');
require('defu');
const crypto_index = require('../../crypto/index.cjs');
require('@better-auth/utils/base64');
const hmac = require('@better-auth/utils/hmac');
require('@better-auth/utils/binary');
require('@better-auth/utils/hash');
require('@noble/ciphers/chacha');
require('@noble/ciphers/utils');
require('@noble/ciphers/webcrypto');
require('jose');
require('@noble/hashes/scrypt');
require('@better-auth/utils');
require('@better-auth/utils/hex');
require('@noble/hashes/utils');
const otp = require('@better-auth/utils/otp');
const password = require('../../shared/better-auth.CDXNofOe.cjs');
const client = require('../../shared/better-auth.DnER2-iT.cjs');
require('@better-auth/utils/random');
require('../../shared/better-auth.CWJ7qc0w.cjs');
require('../../social-providers/index.cjs');
require('@better-fetch/fetch');
require('../../shared/better-auth.6XyKj7DG.cjs');
require('../../shared/better-auth.C1hdVENX.cjs');
require('../../shared/better-auth.ANpbi45u.cjs');
require('../../shared/better-auth.D3mtHEZg.cjs');
require('../../shared/better-auth.Bg6iw3ig.cjs');
require('../../shared/better-auth.BMYo0QR-.cjs');
require('../../shared/better-auth.C-R0J0n1.cjs');
require('jose/errors');
require('../../shared/better-auth.YUF6P-PB.cjs');

const TWO_FACTOR_ERROR_CODES = {
  OTP_NOT_ENABLED: "OTP not enabled",
  OTP_HAS_EXPIRED: "OTP has expired",
  TOTP_NOT_ENABLED: "TOTP not enabled",
  TWO_FACTOR_NOT_ENABLED: "Two factor isn't enabled",
  BACKUP_CODES_NOT_ENABLED: "Backup codes aren't enabled",
  INVALID_BACKUP_CODE: "Invalid backup code",
  INVALID_CODE: "Invalid code",
  TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE: "Too many attempts. Please request a new code.",
  INVALID_TWO_FACTOR_COOKIE: "Invalid two factor cookie"
};

const TWO_FACTOR_COOKIE_NAME = "two_factor";
const TRUST_DEVICE_COOKIE_NAME = "trust_device";

async function verifyTwoFactor(ctx) {
  const session = await account.getSessionFromCtx(ctx);
  if (!session) {
    const cookieName = ctx.context.createAuthCookie(TWO_FACTOR_COOKIE_NAME);
    const twoFactorCookie = await ctx.getSignedCookie(
      cookieName.name,
      ctx.context.secret
    );
    if (!twoFactorCookie) {
      throw new betterCall.APIError("UNAUTHORIZED", {
        message: TWO_FACTOR_ERROR_CODES.INVALID_TWO_FACTOR_COOKIE
      });
    }
    const verificationToken = await ctx.context.internalAdapter.findVerificationValue(twoFactorCookie);
    if (!verificationToken) {
      throw new betterCall.APIError("UNAUTHORIZED", {
        message: TWO_FACTOR_ERROR_CODES.INVALID_TWO_FACTOR_COOKIE
      });
    }
    const user = await ctx.context.internalAdapter.findUserById(
      verificationToken.value
    );
    if (!user) {
      throw new betterCall.APIError("UNAUTHORIZED", {
        message: TWO_FACTOR_ERROR_CODES.INVALID_TWO_FACTOR_COOKIE
      });
    }
    const dontRememberMe = await ctx.getSignedCookie(
      ctx.context.authCookies.dontRememberToken.name,
      ctx.context.secret
    );
    return {
      valid: async (ctx2) => {
        const session2 = await ctx2.context.internalAdapter.createSession(
          verificationToken.value,
          ctx2,
          !!dontRememberMe
        );
        if (!session2) {
          throw new betterCall.APIError("INTERNAL_SERVER_ERROR", {
            message: "failed to create session"
          });
        }
        await cookies_index.setSessionCookie(ctx2, {
          session: session2,
          user
        });
        if (ctx2.body.trustDevice) {
          const trustDeviceCookie = ctx2.context.createAuthCookie(
            TRUST_DEVICE_COOKIE_NAME,
            {
              maxAge: 30 * 24 * 60 * 60
              // 30 days, it'll be refreshed on sign in requests
            }
          );
          const token = await hmac.createHMAC("SHA-256", "base64urlnopad").sign(
            ctx2.context.secret,
            `${user.id}!${session2.token}`
          );
          await ctx2.setSignedCookie(
            trustDeviceCookie.name,
            `${token}!${session2.token}`,
            ctx2.context.secret,
            trustDeviceCookie.attributes
          );
          ctx2.setCookie(ctx2.context.authCookies.dontRememberToken.name, "", {
            maxAge: 0
          });
          ctx2.setCookie(cookieName.name, "", {
            maxAge: 0
          });
        }
        return ctx2.json({
          token: session2.token,
          user: {
            id: user.id,
            email: user.email,
            emailVerified: user.emailVerified,
            name: user.name,
            image: user.image,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          }
        });
      },
      invalid: async (errorKey) => {
        throw new betterCall.APIError("UNAUTHORIZED", {
          message: TWO_FACTOR_ERROR_CODES[errorKey]
        });
      },
      session: {
        session: null,
        user
      },
      key: twoFactorCookie
    };
  }
  return {
    valid: async (ctx2) => {
      return ctx2.json({
        token: session.session.token,
        user: {
          id: session.user.id,
          email: session.user.email,
          emailVerified: session.user.emailVerified,
          name: session.user.name,
          image: session.user.image,
          createdAt: session.user.createdAt,
          updatedAt: session.user.updatedAt
        }
      });
    },
    invalid: async () => {
      throw new betterCall.APIError("UNAUTHORIZED", {
        message: TWO_FACTOR_ERROR_CODES.INVALID_TWO_FACTOR_COOKIE
      });
    },
    session,
    key: `${session.user.id}!${session.session.id}`
  };
}

function generateBackupCodesFn(options) {
  return Array.from({ length: options?.amount ?? 10 }).fill(null).map(() => random.generateRandomString(options?.length ?? 10, "a-z", "0-9", "A-Z")).map((code) => `${code.slice(0, 5)}-${code.slice(5)}`);
}
async function generateBackupCodes(secret, options) {
  const key = secret;
  const backupCodes = options?.customBackupCodesGenerate ? options.customBackupCodesGenerate() : generateBackupCodesFn(options);
  const encCodes = await crypto_index.symmetricEncrypt({
    data: JSON.stringify(backupCodes),
    key
  });
  return {
    backupCodes,
    encryptedBackupCodes: encCodes
  };
}
async function verifyBackupCode(data, key) {
  const codes = await getBackupCodes(data.backupCodes, key);
  if (!codes) {
    return {
      status: false,
      updated: null
    };
  }
  return {
    status: codes.includes(data.code),
    updated: codes.filter((code) => code !== data.code)
  };
}
async function getBackupCodes(backupCodes, key) {
  const secret = new TextDecoder("utf-8").decode(
    new TextEncoder().encode(
      await crypto_index.symmetricDecrypt({ key, data: backupCodes })
    )
  );
  const data = JSON.parse(secret);
  const result = zod.z.array(zod.z.string()).safeParse(data);
  if (result.success) {
    return result.data;
  }
  return null;
}
const backupCode2fa = (options) => {
  const twoFactorTable = "twoFactor";
  return {
    id: "backup_code",
    endpoints: {
      verifyBackupCode: account.createAuthEndpoint(
        "/two-factor/verify-backup-code",
        {
          method: "POST",
          body: zod.z.object({
            code: zod.z.string(),
            /**
             * Disable setting the session cookie
             */
            disableSession: zod.z.boolean({
              description: "If true, the session cookie will not be set."
            }).optional(),
            /**
             * if true, the device will be trusted
             * for 30 days. It'll be refreshed on
             * every sign in request within this time.
             */
            trustDevice: zod.z.boolean({
              description: "If true, the device will be trusted for 30 days. It'll be refreshed on every sign in request within this time."
            }).optional()
          }),
          metadata: {
            openapi: {
              description: "Verify a backup code for two-factor authentication",
              responses: {
                "200": {
                  description: "Backup code verified successfully",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          user: {
                            type: "object",
                            properties: {
                              id: {
                                type: "string",
                                description: "Unique identifier of the user"
                              },
                              email: {
                                type: "string",
                                format: "email",
                                nullable: true,
                                description: "User's email address"
                              },
                              emailVerified: {
                                type: "boolean",
                                nullable: true,
                                description: "Whether the email is verified"
                              },
                              name: {
                                type: "string",
                                nullable: true,
                                description: "User's name"
                              },
                              image: {
                                type: "string",
                                format: "uri",
                                nullable: true,
                                description: "User's profile image URL"
                              },
                              twoFactorEnabled: {
                                type: "boolean",
                                description: "Whether two-factor authentication is enabled for the user"
                              },
                              createdAt: {
                                type: "string",
                                format: "date-time",
                                description: "Timestamp when the user was created"
                              },
                              updatedAt: {
                                type: "string",
                                format: "date-time",
                                description: "Timestamp when the user was last updated"
                              }
                            },
                            required: [
                              "id",
                              "twoFactorEnabled",
                              "createdAt",
                              "updatedAt"
                            ],
                            description: "The authenticated user object with two-factor details"
                          },
                          session: {
                            type: "object",
                            properties: {
                              token: {
                                type: "string",
                                description: "Session token"
                              },
                              userId: {
                                type: "string",
                                description: "ID of the user associated with the session"
                              },
                              createdAt: {
                                type: "string",
                                format: "date-time",
                                description: "Timestamp when the session was created"
                              },
                              expiresAt: {
                                type: "string",
                                format: "date-time",
                                description: "Timestamp when the session expires"
                              }
                            },
                            required: [
                              "token",
                              "userId",
                              "createdAt",
                              "expiresAt"
                            ],
                            description: "The current session object, included unless disableSession is true"
                          }
                        },
                        required: ["user", "session"]
                      }
                    }
                  }
                }
              }
            }
          }
        },
        async (ctx) => {
          const { session, valid } = await verifyTwoFactor(ctx);
          const user = session.user;
          const twoFactor = await ctx.context.adapter.findOne({
            model: twoFactorTable,
            where: [
              {
                field: "userId",
                value: user.id
              }
            ]
          });
          if (!twoFactor) {
            throw new betterCall.APIError("BAD_REQUEST", {
              message: TWO_FACTOR_ERROR_CODES.BACKUP_CODES_NOT_ENABLED
            });
          }
          const validate = await verifyBackupCode(
            {
              backupCodes: twoFactor.backupCodes,
              code: ctx.body.code
            },
            ctx.context.secret
          );
          if (!validate.status) {
            throw new betterCall.APIError("UNAUTHORIZED", {
              message: TWO_FACTOR_ERROR_CODES.INVALID_BACKUP_CODE
            });
          }
          const updatedBackupCodes = await crypto_index.symmetricEncrypt({
            key: ctx.context.secret,
            data: JSON.stringify(validate.updated)
          });
          await ctx.context.adapter.updateMany({
            model: twoFactorTable,
            update: {
              backupCodes: updatedBackupCodes
            },
            where: [
              {
                field: "userId",
                value: user.id
              }
            ]
          });
          if (!ctx.body.disableSession) {
            return valid(ctx);
          }
          return ctx.json({
            token: session.session?.token,
            user: {
              id: session.user?.id,
              email: session.user.email,
              emailVerified: session.user.emailVerified,
              name: session.user.name,
              image: session.user.image,
              createdAt: session.user.createdAt,
              updatedAt: session.user.updatedAt
            }
          });
        }
      ),
      generateBackupCodes: account.createAuthEndpoint(
        "/two-factor/generate-backup-codes",
        {
          method: "POST",
          body: zod.z.object({
            password: zod.z.string()
          }),
          use: [account.sessionMiddleware],
          metadata: {
            openapi: {
              description: "Generate new backup codes for two-factor authentication",
              responses: {
                "200": {
                  description: "Backup codes generated successfully",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          status: {
                            type: "boolean",
                            description: "Indicates if the backup codes were generated successfully",
                            enum: [true]
                          },
                          backupCodes: {
                            type: "array",
                            items: { type: "string" },
                            description: "Array of generated backup codes in plain text"
                          }
                        },
                        required: ["status", "backupCodes"]
                      }
                    }
                  }
                }
              }
            }
          }
        },
        async (ctx) => {
          const user = ctx.context.session.user;
          if (!user.twoFactorEnabled) {
            throw new betterCall.APIError("BAD_REQUEST", {
              message: TWO_FACTOR_ERROR_CODES.TWO_FACTOR_NOT_ENABLED
            });
          }
          await ctx.context.password.checkPassword(user.id, ctx);
          const backupCodes = await generateBackupCodes(
            ctx.context.secret,
            options
          );
          await ctx.context.adapter.update({
            model: twoFactorTable,
            update: {
              backupCodes: backupCodes.encryptedBackupCodes
            },
            where: [
              {
                field: "userId",
                value: ctx.context.session.user.id
              }
            ]
          });
          return ctx.json({
            status: true,
            backupCodes: backupCodes.backupCodes
          });
        }
      ),
      viewBackupCodes: account.createAuthEndpoint(
        "/two-factor/view-backup-codes",
        {
          method: "GET",
          body: zod.z.object({
            userId: zod.z.coerce.string()
          }),
          metadata: {
            SERVER_ONLY: true
          }
        },
        async (ctx) => {
          const twoFactor = await ctx.context.adapter.findOne({
            model: twoFactorTable,
            where: [
              {
                field: "userId",
                value: ctx.body.userId
              }
            ]
          });
          if (!twoFactor) {
            throw new betterCall.APIError("BAD_REQUEST", {
              message: "Backup codes aren't enabled"
            });
          }
          const backupCodes = await getBackupCodes(
            twoFactor.backupCodes,
            ctx.context.secret
          );
          if (!backupCodes) {
            throw new betterCall.APIError("BAD_REQUEST", {
              message: TWO_FACTOR_ERROR_CODES.BACKUP_CODES_NOT_ENABLED
            });
          }
          return ctx.json({
            status: true,
            backupCodes
          });
        }
      )
    }
  };
};

const otp2fa = (options) => {
  const opts = {
    ...options,
    digits: options?.digits || 6,
    period: (options?.period || 3) * 60 * 1e3
  };
  const twoFactorTable = "twoFactor";
  const send2FaOTP = account.createAuthEndpoint(
    "/two-factor/send-otp",
    {
      method: "POST",
      body: zod.z.object({
        /**
         * if true, the device will be trusted
         * for 30 days. It'll be refreshed on
         * every sign in request within this time.
         */
        trustDevice: zod.z.boolean().optional()
      }).optional(),
      metadata: {
        openapi: {
          summary: "Send two factor OTP",
          description: "Send two factor OTP to the user",
          responses: {
            200: {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: {
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
      if (!options || !options.sendOTP) {
        ctx.context.logger.error(
          "send otp isn't configured. Please configure the send otp function on otp options."
        );
        throw new betterCall.APIError("BAD_REQUEST", {
          message: "otp isn't configured"
        });
      }
      const { session, key } = await verifyTwoFactor(ctx);
      const twoFactor = await ctx.context.adapter.findOne({
        model: twoFactorTable,
        where: [
          {
            field: "userId",
            value: session.user.id
          }
        ]
      });
      if (!twoFactor) {
        throw new betterCall.APIError("BAD_REQUEST", {
          message: TWO_FACTOR_ERROR_CODES.OTP_NOT_ENABLED
        });
      }
      const code = random.generateRandomString(opts.digits, "0-9");
      await ctx.context.internalAdapter.createVerificationValue(
        {
          value: `${code}!0`,
          identifier: `2fa-otp-${key}`,
          expiresAt: new Date(Date.now() + opts.period)
        },
        ctx
      );
      await options.sendOTP(
        { user: session.user, otp: code },
        ctx.request
      );
      return ctx.json({ status: true });
    }
  );
  const verifyOTP = account.createAuthEndpoint(
    "/two-factor/verify-otp",
    {
      method: "POST",
      body: zod.z.object({
        code: zod.z.string({
          description: "The otp code to verify"
        }),
        /**
         * if true, the device will be trusted
         * for 30 days. It'll be refreshed on
         * every sign in request within this time.
         */
        trustDevice: zod.z.boolean().optional()
      }),
      metadata: {
        openapi: {
          summary: "Verify two factor OTP",
          description: "Verify two factor OTP",
          responses: {
            "200": {
              description: "Two-factor OTP verified successfully",
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
                        type: "object",
                        properties: {
                          id: {
                            type: "string",
                            description: "Unique identifier of the user"
                          },
                          email: {
                            type: "string",
                            format: "email",
                            nullable: true,
                            description: "User's email address"
                          },
                          emailVerified: {
                            type: "boolean",
                            nullable: true,
                            description: "Whether the email is verified"
                          },
                          name: {
                            type: "string",
                            nullable: true,
                            description: "User's name"
                          },
                          image: {
                            type: "string",
                            format: "uri",
                            nullable: true,
                            description: "User's profile image URL"
                          },
                          createdAt: {
                            type: "string",
                            format: "date-time",
                            description: "Timestamp when the user was created"
                          },
                          updatedAt: {
                            type: "string",
                            format: "date-time",
                            description: "Timestamp when the user was last updated"
                          }
                        },
                        required: ["id", "createdAt", "updatedAt"],
                        description: "The authenticated user object"
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
      const { session, key, valid, invalid } = await verifyTwoFactor(ctx);
      const twoFactor = await ctx.context.adapter.findOne({
        model: twoFactorTable,
        where: [
          {
            field: "userId",
            value: session.user.id
          }
        ]
      });
      if (!twoFactor) {
        throw new betterCall.APIError("BAD_REQUEST", {
          message: TWO_FACTOR_ERROR_CODES.OTP_NOT_ENABLED
        });
      }
      const toCheckOtp = await ctx.context.internalAdapter.findVerificationValue(
        `2fa-otp-${key}`
      );
      const [otp, counter] = toCheckOtp?.value?.split("!") ?? [];
      if (!toCheckOtp || toCheckOtp.expiresAt < /* @__PURE__ */ new Date()) {
        if (toCheckOtp) {
          await ctx.context.internalAdapter.deleteVerificationValue(
            toCheckOtp.id
          );
        }
        throw new betterCall.APIError("BAD_REQUEST", {
          message: TWO_FACTOR_ERROR_CODES.OTP_HAS_EXPIRED
        });
      }
      const allowedAttempts = options?.allowedAttempts || 5;
      if (parseInt(counter) >= allowedAttempts) {
        await ctx.context.internalAdapter.deleteVerificationValue(
          toCheckOtp.id
        );
        throw new betterCall.APIError("BAD_REQUEST", {
          message: TWO_FACTOR_ERROR_CODES.TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE
        });
      }
      if (otp === ctx.body.code) {
        if (!session.user.twoFactorEnabled) {
          if (!session.session) {
            throw new betterCall.APIError("BAD_REQUEST", {
              message: account.BASE_ERROR_CODES.FAILED_TO_CREATE_SESSION
            });
          }
          const updatedUser = await ctx.context.internalAdapter.updateUser(
            session.user.id,
            {
              twoFactorEnabled: true
            }
          );
          const newSession = await ctx.context.internalAdapter.createSession(
            session.user.id,
            ctx,
            false,
            session.session
          );
          await ctx.context.internalAdapter.deleteSession(
            session.session.token
          );
          await cookies_index.setSessionCookie(ctx, {
            session: newSession,
            user: updatedUser
          });
          return ctx.json({
            token: newSession.token,
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
        return valid(ctx);
      } else {
        await ctx.context.internalAdapter.updateVerificationValue(
          toCheckOtp.id,
          {
            value: `${otp}!${parseInt(counter) + 1}`
          }
        );
        return invalid("INVALID_CODE");
      }
    }
  );
  return {
    id: "otp",
    endpoints: {
      sendTwoFactorOTP: send2FaOTP,
      verifyTwoFactorOTP: verifyOTP
    }
  };
};

const totp2fa = (options) => {
  const opts = {
    ...options,
    digits: options?.digits || 6,
    period: options?.period || 30
  };
  const twoFactorTable = "twoFactor";
  const generateTOTP = account.createAuthEndpoint(
    "/totp/generate",
    {
      method: "POST",
      body: zod.z.object({
        secret: zod.z.string({
          description: "The secret to generate the TOTP code"
        })
      }),
      metadata: {
        openapi: {
          summary: "Generate TOTP code",
          description: "Use this endpoint to generate a TOTP code",
          responses: {
            200: {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      code: {
                        type: "string"
                      }
                    }
                  }
                }
              }
            }
          }
        },
        SERVER_ONLY: true
      }
    },
    async (ctx) => {
      if (options?.disable) {
        ctx.context.logger.error(
          "totp isn't configured. please pass totp option on two factor plugin to enable totp"
        );
        throw new betterCall.APIError("BAD_REQUEST", {
          message: "totp isn't configured"
        });
      }
      const code = await otp.createOTP(ctx.body.secret, {
        period: opts.period,
        digits: opts.digits
      }).totp();
      return { code };
    }
  );
  const getTOTPURI = account.createAuthEndpoint(
    "/two-factor/get-totp-uri",
    {
      method: "POST",
      use: [account.sessionMiddleware],
      body: zod.z.object({
        password: zod.z.string({
          description: "User password"
        })
      }),
      metadata: {
        openapi: {
          summary: "Get TOTP URI",
          description: "Use this endpoint to get the TOTP URI",
          responses: {
            200: {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      totpURI: {
                        type: "string"
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
      if (options?.disable) {
        ctx.context.logger.error(
          "totp isn't configured. please pass totp option on two factor plugin to enable totp"
        );
        throw new betterCall.APIError("BAD_REQUEST", {
          message: "totp isn't configured"
        });
      }
      const user = ctx.context.session.user;
      const twoFactor = await ctx.context.adapter.findOne({
        model: twoFactorTable,
        where: [
          {
            field: "userId",
            value: user.id
          }
        ]
      });
      if (!twoFactor || !user.twoFactorEnabled) {
        throw new betterCall.APIError("BAD_REQUEST", {
          message: TWO_FACTOR_ERROR_CODES.TOTP_NOT_ENABLED
        });
      }
      const secret = await crypto_index.symmetricDecrypt({
        key: ctx.context.secret,
        data: twoFactor.secret
      });
      await ctx.context.password.checkPassword(user.id, ctx);
      const totpURI = otp.createOTP(secret, {
        digits: opts.digits,
        period: opts.period
      }).url(options?.issuer || ctx.context.appName, user.email);
      return {
        totpURI
      };
    }
  );
  const verifyTOTP = account.createAuthEndpoint(
    "/two-factor/verify-totp",
    {
      method: "POST",
      body: zod.z.object({
        code: zod.z.string({
          description: "The otp code to verify"
        }),
        /**
         * if true, the device will be trusted
         * for 30 days. It'll be refreshed on
         * every sign in request within this time.
         */
        trustDevice: zod.z.boolean({
          description: "If true, the device will be trusted for 30 days. It'll be refreshed on every sign in request within this time."
        }).optional()
      }),
      metadata: {
        openapi: {
          summary: "Verify two factor TOTP",
          description: "Verify two factor TOTP",
          responses: {
            200: {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: {
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
      if (options?.disable) {
        ctx.context.logger.error(
          "totp isn't configured. please pass totp option on two factor plugin to enable totp"
        );
        throw new betterCall.APIError("BAD_REQUEST", {
          message: "totp isn't configured"
        });
      }
      const { session, valid, invalid } = await verifyTwoFactor(ctx);
      const user = session.user;
      const twoFactor = await ctx.context.adapter.findOne({
        model: twoFactorTable,
        where: [
          {
            field: "userId",
            value: user.id
          }
        ]
      });
      if (!twoFactor) {
        throw new betterCall.APIError("BAD_REQUEST", {
          message: TWO_FACTOR_ERROR_CODES.TOTP_NOT_ENABLED
        });
      }
      const decrypted = await crypto_index.symmetricDecrypt({
        key: ctx.context.secret,
        data: twoFactor.secret
      });
      const status = await otp.createOTP(decrypted, {
        period: opts.period,
        digits: opts.digits
      }).verify(ctx.body.code);
      if (!status) {
        return invalid("INVALID_CODE");
      }
      if (!user.twoFactorEnabled) {
        if (!session.session) {
          throw new betterCall.APIError("BAD_REQUEST", {
            message: account.BASE_ERROR_CODES.FAILED_TO_CREATE_SESSION
          });
        }
        const updatedUser = await ctx.context.internalAdapter.updateUser(
          user.id,
          {
            twoFactorEnabled: true
          },
          ctx
        );
        const newSession = await ctx.context.internalAdapter.createSession(user.id, ctx, false, session.session).catch((e) => {
          throw e;
        });
        await ctx.context.internalAdapter.deleteSession(session.session.token);
        await cookies_index.setSessionCookie(ctx, {
          session: newSession,
          user: updatedUser
        });
      }
      return valid(ctx);
    }
  );
  return {
    id: "totp",
    endpoints: {
      generateTOTP,
      getTOTPURI,
      verifyTOTP
    }
  };
};

const schema = {
  user: {
    fields: {
      twoFactorEnabled: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false
      }
    }
  },
  twoFactor: {
    fields: {
      secret: {
        type: "string",
        required: true,
        returned: false
      },
      backupCodes: {
        type: "string",
        required: true,
        returned: false
      },
      userId: {
        type: "string",
        required: true,
        returned: false,
        references: {
          model: "user",
          field: "id"
        }
      }
    }
  }
};

const twoFactor = (options) => {
  const opts = {
    twoFactorTable: "twoFactor"
  };
  const totp = totp2fa(options?.totpOptions);
  const backupCode = backupCode2fa(options?.backupCodeOptions);
  const otp$1 = otp2fa(options?.otpOptions);
  return {
    id: "two-factor",
    endpoints: {
      ...totp.endpoints,
      ...otp$1.endpoints,
      ...backupCode.endpoints,
      enableTwoFactor: account.createAuthEndpoint(
        "/two-factor/enable",
        {
          method: "POST",
          body: zod.z.object({
            password: zod.z.string({
              description: "User password"
            }),
            issuer: zod.z.string({
              description: "Custom issuer for the TOTP URI"
            }).optional()
          }),
          use: [account.sessionMiddleware],
          metadata: {
            openapi: {
              summary: "Enable two factor authentication",
              description: "Use this endpoint to enable two factor authentication. This will generate a TOTP URI and backup codes. Once the user verifies the TOTP URI, the two factor authentication will be enabled.",
              responses: {
                200: {
                  description: "Successful response",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          totpURI: {
                            type: "string",
                            description: "TOTP URI"
                          },
                          backupCodes: {
                            type: "array",
                            items: {
                              type: "string"
                            },
                            description: "Backup codes"
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
          const user = ctx.context.session.user;
          const { password: password$1, issuer } = ctx.body;
          const isPasswordValid = await password.validatePassword(ctx, {
            password: password$1,
            userId: user.id
          });
          if (!isPasswordValid) {
            throw new betterCall.APIError("BAD_REQUEST", {
              message: account.BASE_ERROR_CODES.INVALID_PASSWORD
            });
          }
          const secret = random.generateRandomString(32);
          const encryptedSecret = await crypto_index.symmetricEncrypt({
            key: ctx.context.secret,
            data: secret
          });
          const backupCodes = await generateBackupCodes(
            ctx.context.secret,
            options?.backupCodeOptions
          );
          if (options?.skipVerificationOnEnable) {
            const updatedUser = await ctx.context.internalAdapter.updateUser(
              user.id,
              {
                twoFactorEnabled: true
              },
              ctx
            );
            const newSession = await ctx.context.internalAdapter.createSession(
              updatedUser.id,
              ctx,
              false,
              ctx.context.session.session
            );
            await cookies_index.setSessionCookie(ctx, {
              session: newSession,
              user: updatedUser
            });
            await ctx.context.internalAdapter.deleteSession(
              ctx.context.session.session.token
            );
          }
          await ctx.context.adapter.deleteMany({
            model: opts.twoFactorTable,
            where: [
              {
                field: "userId",
                value: user.id
              }
            ]
          });
          await ctx.context.adapter.create({
            model: opts.twoFactorTable,
            data: {
              secret: encryptedSecret,
              backupCodes: backupCodes.encryptedBackupCodes,
              userId: user.id
            }
          });
          const totpURI = otp.createOTP(secret, {
            digits: options?.totpOptions?.digits || 6,
            period: options?.totpOptions?.period
          }).url(issuer || options?.issuer || ctx.context.appName, user.email);
          return ctx.json({ totpURI, backupCodes: backupCodes.backupCodes });
        }
      ),
      disableTwoFactor: account.createAuthEndpoint(
        "/two-factor/disable",
        {
          method: "POST",
          body: zod.z.object({
            password: zod.z.string({
              description: "User password"
            })
          }),
          use: [account.sessionMiddleware],
          metadata: {
            openapi: {
              summary: "Disable two factor authentication",
              description: "Use this endpoint to disable two factor authentication.",
              responses: {
                200: {
                  description: "Successful response",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          status: {
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
          const user = ctx.context.session.user;
          const { password: password$1 } = ctx.body;
          const isPasswordValid = await password.validatePassword(ctx, {
            password: password$1,
            userId: user.id
          });
          if (!isPasswordValid) {
            throw new betterCall.APIError("BAD_REQUEST", {
              message: "Invalid password"
            });
          }
          const updatedUser = await ctx.context.internalAdapter.updateUser(
            user.id,
            {
              twoFactorEnabled: false
            },
            ctx
          );
          await ctx.context.adapter.delete({
            model: opts.twoFactorTable,
            where: [
              {
                field: "userId",
                value: updatedUser.id
              }
            ]
          });
          const newSession = await ctx.context.internalAdapter.createSession(
            updatedUser.id,
            ctx,
            false,
            ctx.context.session.session
          );
          await cookies_index.setSessionCookie(ctx, {
            session: newSession,
            user: updatedUser
          });
          await ctx.context.internalAdapter.deleteSession(
            ctx.context.session.session.token
          );
          return ctx.json({ status: true });
        }
      )
    },
    options,
    hooks: {
      after: [
        {
          matcher(context) {
            return context.path === "/sign-in/email" || context.path === "/sign-in/username" || context.path === "/sign-in/phone-number";
          },
          handler: account.createAuthMiddleware(async (ctx) => {
            const data = ctx.context.newSession;
            if (!data) {
              return;
            }
            if (!data?.user.twoFactorEnabled) {
              return;
            }
            const trustDeviceCookieName = ctx.context.createAuthCookie(
              TRUST_DEVICE_COOKIE_NAME
            );
            const trustDeviceCookie = await ctx.getSignedCookie(
              trustDeviceCookieName.name,
              ctx.context.secret
            );
            if (trustDeviceCookie) {
              const [token, sessionToken] = trustDeviceCookie.split("!");
              const expectedToken = await hmac.createHMAC(
                "SHA-256",
                "base64urlnopad"
              ).sign(ctx.context.secret, `${data.user.id}!${sessionToken}`);
              if (token === expectedToken) {
                const newToken = await hmac.createHMAC(
                  "SHA-256",
                  "base64urlnopad"
                ).sign(ctx.context.secret, `${data.user.id}!${sessionToken}`);
                await ctx.setSignedCookie(
                  trustDeviceCookieName.name,
                  `${newToken}!${data.session.token}`,
                  ctx.context.secret,
                  trustDeviceCookieName.attributes
                );
                return;
              }
            }
            cookies_index.deleteSessionCookie(ctx, true);
            await ctx.context.internalAdapter.deleteSession(data.session.token);
            const maxAge = options?.otpOptions?.period || 60 * 5;
            const twoFactorCookie = ctx.context.createAuthCookie(
              TWO_FACTOR_COOKIE_NAME,
              {
                maxAge
              }
            );
            const identifier = `2fa-${random.generateRandomString(20)}`;
            await ctx.context.internalAdapter.createVerificationValue(
              {
                value: data.user.id,
                identifier,
                expiresAt: new Date(Date.now() + maxAge * 1e3)
              },
              ctx
            );
            await ctx.setSignedCookie(
              twoFactorCookie.name,
              identifier,
              ctx.context.secret,
              twoFactorCookie.attributes
            );
            return ctx.json({
              twoFactorRedirect: true
            });
          })
        }
      ]
    },
    schema: schema$1.mergeSchema(schema, options?.schema),
    rateLimit: [
      {
        pathMatcher(path) {
          return path.startsWith("/two-factor/");
        },
        window: 10,
        max: 3
      }
    ],
    $ERROR_CODES: TWO_FACTOR_ERROR_CODES
  };
};

exports.twoFactorClient = client.twoFactorClient;
exports.TWO_FACTOR_ERROR_CODES = TWO_FACTOR_ERROR_CODES;
exports.twoFactor = twoFactor;
