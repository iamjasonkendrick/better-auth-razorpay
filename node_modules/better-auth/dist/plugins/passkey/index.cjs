'use strict';

const server = require('@simplewebauthn/server');
const betterCall = require('better-call');
const random = require('../../shared/better-auth.CYeOI8C-.cjs');
const zod = require('zod');
const account = require('../../shared/better-auth.CM7smaHY.cjs');
const cookies_index = require('../../cookies/index.cjs');
const schema$1 = require('../../shared/better-auth.DcWKCjjf.cjs');
require('../../shared/better-auth.DiSjtgs9.cjs');
require('../../shared/better-auth.GpOOav9x.cjs');
require('defu');
const id = require('../../shared/better-auth.Bg6iw3ig.cjs');
require('@better-auth/utils/hash');
require('@noble/ciphers/chacha');
require('@noble/ciphers/utils');
require('@noble/ciphers/webcrypto');
const base64 = require('@better-auth/utils/base64');
require('jose');
require('@noble/hashes/scrypt');
require('@better-auth/utils');
require('@better-auth/utils/hex');
require('@noble/hashes/utils');
require('@better-auth/utils/random');
require('../../shared/better-auth.CWJ7qc0w.cjs');
require('../../social-providers/index.cjs');
require('@better-fetch/fetch');
require('../../shared/better-auth.6XyKj7DG.cjs');
require('../../shared/better-auth.C1hdVENX.cjs');
require('../../shared/better-auth.ANpbi45u.cjs');
require('../../shared/better-auth.D3mtHEZg.cjs');
require('@better-auth/utils/hmac');
require('@better-auth/utils/binary');
require('../../shared/better-auth.BMYo0QR-.cjs');
require('../../shared/better-auth.C-R0J0n1.cjs');
require('jose/errors');

function getRpID(options, baseURL) {
  return options.rpID || (baseURL ? new URL(baseURL).hostname : "localhost");
}
const passkey = (options) => {
  const opts = {
    origin: null,
    ...options,
    advanced: {
      webAuthnChallengeCookie: "better-auth-passkey",
      ...options?.advanced
    }
  };
  const expirationTime = new Date(Date.now() + 1e3 * 60 * 5);
  const currentTime = /* @__PURE__ */ new Date();
  const maxAgeInSeconds = Math.floor(
    (expirationTime.getTime() - currentTime.getTime()) / 1e3
  );
  const ERROR_CODES = {
    CHALLENGE_NOT_FOUND: "Challenge not found",
    YOU_ARE_NOT_ALLOWED_TO_REGISTER_THIS_PASSKEY: "You are not allowed to register this passkey",
    FAILED_TO_VERIFY_REGISTRATION: "Failed to verify registration",
    PASSKEY_NOT_FOUND: "Passkey not found",
    AUTHENTICATION_FAILED: "Authentication failed",
    UNABLE_TO_CREATE_SESSION: "Unable to create session",
    FAILED_TO_UPDATE_PASSKEY: "Failed to update passkey"
  };
  return {
    id: "passkey",
    endpoints: {
      generatePasskeyRegistrationOptions: account.createAuthEndpoint(
        "/passkey/generate-register-options",
        {
          method: "GET",
          use: [account.freshSessionMiddleware],
          query: zod.z.object({
            authenticatorAttachment: zod.z.enum(["platform", "cross-platform"]).optional()
          }).optional(),
          metadata: {
            client: false,
            openapi: {
              description: "Generate registration options for a new passkey",
              responses: {
                200: {
                  description: "Success",
                  parameters: {
                    query: {
                      authenticatorAttachment: {
                        description: `Type of authenticator to use for registration. 
                          "platform" for device-specific authenticators, 
                          "cross-platform" for authenticators that can be used across devices.`,
                        required: false
                      }
                    }
                  },
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          challenge: {
                            type: "string"
                          },
                          rp: {
                            type: "object",
                            properties: {
                              name: {
                                type: "string"
                              },
                              id: {
                                type: "string"
                              }
                            }
                          },
                          user: {
                            type: "object",
                            properties: {
                              id: {
                                type: "string"
                              },
                              name: {
                                type: "string"
                              },
                              displayName: {
                                type: "string"
                              }
                            }
                          },
                          pubKeyCredParams: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                type: {
                                  type: "string"
                                },
                                alg: {
                                  type: "number"
                                }
                              }
                            }
                          },
                          timeout: {
                            type: "number"
                          },
                          excludeCredentials: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                id: {
                                  type: "string"
                                },
                                type: {
                                  type: "string"
                                },
                                transports: {
                                  type: "array",
                                  items: {
                                    type: "string"
                                  }
                                }
                              }
                            }
                          },
                          authenticatorSelection: {
                            type: "object",
                            properties: {
                              authenticatorAttachment: {
                                type: "string"
                              },
                              requireResidentKey: {
                                type: "boolean"
                              },
                              userVerification: {
                                type: "string"
                              }
                            }
                          },
                          attestation: {
                            type: "string"
                          },
                          extensions: {
                            type: "object"
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
          const { session } = ctx.context;
          const userPasskeys = await ctx.context.adapter.findMany({
            model: "passkey",
            where: [
              {
                field: "userId",
                value: session.user.id
              }
            ]
          });
          const userID = new TextEncoder().encode(
            random.generateRandomString(32, "a-z", "0-9")
          );
          let options2;
          options2 = await server.generateRegistrationOptions({
            rpName: opts.rpName || ctx.context.appName,
            rpID: getRpID(opts, ctx.context.options.baseURL),
            userID,
            userName: session.user.email || session.user.id,
            userDisplayName: session.user.email || session.user.id,
            attestationType: "none",
            excludeCredentials: userPasskeys.map((passkey2) => ({
              id: passkey2.credentialID,
              transports: passkey2.transports?.split(
                ","
              )
            })),
            authenticatorSelection: {
              residentKey: "preferred",
              userVerification: "preferred",
              ...opts.authenticatorSelection || {},
              ...ctx.query?.authenticatorAttachment ? {
                authenticatorAttachment: ctx.query.authenticatorAttachment
              } : {}
            }
          });
          const id$1 = id.generateId(32);
          const webAuthnCookie = ctx.context.createAuthCookie(
            opts.advanced.webAuthnChallengeCookie
          );
          await ctx.setSignedCookie(
            webAuthnCookie.name,
            id$1,
            ctx.context.secret,
            {
              ...webAuthnCookie.attributes,
              maxAge: maxAgeInSeconds
            }
          );
          await ctx.context.internalAdapter.createVerificationValue(
            {
              identifier: id$1,
              value: JSON.stringify({
                expectedChallenge: options2.challenge,
                userData: {
                  id: session.user.id
                }
              }),
              expiresAt: expirationTime
            },
            ctx
          );
          return ctx.json(options2, {
            status: 200
          });
        }
      ),
      generatePasskeyAuthenticationOptions: account.createAuthEndpoint(
        "/passkey/generate-authenticate-options",
        {
          method: "POST",
          body: zod.z.object({
            email: zod.z.string({
              description: "The email address of the user"
            }).optional()
          }).optional(),
          metadata: {
            openapi: {
              description: "Generate authentication options for a passkey",
              responses: {
                200: {
                  description: "Success",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          challenge: {
                            type: "string"
                          },
                          rp: {
                            type: "object",
                            properties: {
                              name: {
                                type: "string"
                              },
                              id: {
                                type: "string"
                              }
                            }
                          },
                          user: {
                            type: "object",
                            properties: {
                              id: {
                                type: "string"
                              },
                              name: {
                                type: "string"
                              },
                              displayName: {
                                type: "string"
                              }
                            }
                          },
                          timeout: {
                            type: "number"
                          },
                          allowCredentials: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                id: {
                                  type: "string"
                                },
                                type: {
                                  type: "string"
                                },
                                transports: {
                                  type: "array",
                                  items: {
                                    type: "string"
                                  }
                                }
                              }
                            }
                          },
                          userVerification: {
                            type: "string"
                          },
                          authenticatorSelection: {
                            type: "object",
                            properties: {
                              authenticatorAttachment: {
                                type: "string"
                              },
                              requireResidentKey: {
                                type: "boolean"
                              },
                              userVerification: {
                                type: "string"
                              }
                            }
                          },
                          extensions: {
                            type: "object"
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
          const session = await account.getSessionFromCtx(ctx);
          let userPasskeys = [];
          if (session) {
            userPasskeys = await ctx.context.adapter.findMany({
              model: "passkey",
              where: [
                {
                  field: "userId",
                  value: session.user.id
                }
              ]
            });
          }
          const options2 = await server.generateAuthenticationOptions({
            rpID: getRpID(opts, ctx.context.options.baseURL),
            userVerification: "preferred",
            ...userPasskeys.length ? {
              allowCredentials: userPasskeys.map((passkey2) => ({
                id: passkey2.credentialID,
                transports: passkey2.transports?.split(
                  ","
                )
              }))
            } : {}
          });
          const data = {
            expectedChallenge: options2.challenge,
            userData: {
              id: session?.user.id || ""
            }
          };
          const id$1 = id.generateId(32);
          const webAuthnCookie = ctx.context.createAuthCookie(
            opts.advanced.webAuthnChallengeCookie
          );
          await ctx.setSignedCookie(
            webAuthnCookie.name,
            id$1,
            ctx.context.secret,
            {
              ...webAuthnCookie.attributes,
              maxAge: maxAgeInSeconds
            }
          );
          await ctx.context.internalAdapter.createVerificationValue(
            {
              identifier: id$1,
              value: JSON.stringify(data),
              expiresAt: expirationTime
            },
            ctx
          );
          return ctx.json(options2, {
            status: 200
          });
        }
      ),
      verifyPasskeyRegistration: account.createAuthEndpoint(
        "/passkey/verify-registration",
        {
          method: "POST",
          body: zod.z.object({
            response: zod.z.any({
              description: "The response from the authenticator"
            }),
            name: zod.z.string({
              description: "Name of the passkey"
            }).optional()
          }),
          use: [account.freshSessionMiddleware],
          metadata: {
            openapi: {
              description: "Verify registration of a new passkey",
              responses: {
                200: {
                  description: "Success",
                  content: {
                    "application/json": {
                      schema: {
                        $ref: "#/components/schemas/Passkey"
                      }
                    }
                  }
                },
                400: {
                  description: "Bad request"
                }
              }
            }
          }
        },
        async (ctx) => {
          const origin = options?.origin || ctx.headers?.get("origin") || "";
          if (!origin) {
            return ctx.json(null, {
              status: 400
            });
          }
          const resp = ctx.body.response;
          const webAuthnCookie = ctx.context.createAuthCookie(
            opts.advanced.webAuthnChallengeCookie
          );
          const challengeId = await ctx.getSignedCookie(
            webAuthnCookie.name,
            ctx.context.secret
          );
          if (!challengeId) {
            throw new betterCall.APIError("BAD_REQUEST", {
              message: ERROR_CODES.CHALLENGE_NOT_FOUND
            });
          }
          const data = await ctx.context.internalAdapter.findVerificationValue(
            challengeId
          );
          if (!data) {
            return ctx.json(null, {
              status: 400
            });
          }
          const { expectedChallenge, userData } = JSON.parse(
            data.value
          );
          if (userData.id !== ctx.context.session.user.id) {
            throw new betterCall.APIError("UNAUTHORIZED", {
              message: ERROR_CODES.YOU_ARE_NOT_ALLOWED_TO_REGISTER_THIS_PASSKEY
            });
          }
          try {
            const verification = await server.verifyRegistrationResponse({
              response: resp,
              expectedChallenge,
              expectedOrigin: origin,
              expectedRPID: getRpID(opts, ctx.context.options.baseURL),
              requireUserVerification: false
            });
            const { verified, registrationInfo } = verification;
            if (!verified || !registrationInfo) {
              return ctx.json(null, {
                status: 400
              });
            }
            const {
              aaguid,
              // credentialID,
              // credentialPublicKey,
              // counter,
              credentialDeviceType,
              credentialBackedUp,
              credential,
              credentialType
            } = registrationInfo;
            const pubKey = base64.base64.encode(credential.publicKey);
            const newPasskey = {
              name: ctx.body.name,
              userId: userData.id,
              credentialID: credential.id,
              publicKey: pubKey,
              counter: credential.counter,
              deviceType: credentialDeviceType,
              transports: resp.response.transports.join(","),
              backedUp: credentialBackedUp,
              createdAt: /* @__PURE__ */ new Date(),
              aaguid
            };
            const newPasskeyRes = await ctx.context.adapter.create({
              model: "passkey",
              data: newPasskey
            });
            return ctx.json(newPasskeyRes, {
              status: 200
            });
          } catch (e) {
            console.log(e);
            throw new betterCall.APIError("INTERNAL_SERVER_ERROR", {
              message: ERROR_CODES.FAILED_TO_VERIFY_REGISTRATION
            });
          }
        }
      ),
      verifyPasskeyAuthentication: account.createAuthEndpoint(
        "/passkey/verify-authentication",
        {
          method: "POST",
          body: zod.z.object({
            response: zod.z.record(zod.z.any())
          }),
          metadata: {
            openapi: {
              description: "Verify authentication of a passkey",
              responses: {
                200: {
                  description: "Success",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          session: {
                            $ref: "#/components/schemas/Session"
                          },
                          user: {
                            $ref: "#/components/schemas/User"
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            $Infer: {
              body: {}
            }
          }
        },
        async (ctx) => {
          const origin = options?.origin || ctx.headers?.get("origin") || "";
          if (!origin) {
            throw new betterCall.APIError("BAD_REQUEST", {
              message: "origin missing"
            });
          }
          const resp = ctx.body.response;
          const webAuthnCookie = ctx.context.createAuthCookie(
            opts.advanced.webAuthnChallengeCookie
          );
          const challengeId = await ctx.getSignedCookie(
            webAuthnCookie.name,
            ctx.context.secret
          );
          if (!challengeId) {
            throw new betterCall.APIError("BAD_REQUEST", {
              message: ERROR_CODES.CHALLENGE_NOT_FOUND
            });
          }
          const data = await ctx.context.internalAdapter.findVerificationValue(
            challengeId
          );
          if (!data) {
            throw new betterCall.APIError("BAD_REQUEST", {
              message: ERROR_CODES.CHALLENGE_NOT_FOUND
            });
          }
          const { expectedChallenge } = JSON.parse(
            data.value
          );
          const passkey2 = await ctx.context.adapter.findOne({
            model: "passkey",
            where: [
              {
                field: "credentialID",
                value: resp.id
              }
            ]
          });
          if (!passkey2) {
            throw new betterCall.APIError("UNAUTHORIZED", {
              message: ERROR_CODES.PASSKEY_NOT_FOUND
            });
          }
          try {
            const verification = await server.verifyAuthenticationResponse({
              response: resp,
              expectedChallenge,
              expectedOrigin: origin,
              expectedRPID: getRpID(opts, ctx.context.options.baseURL),
              credential: {
                id: passkey2.credentialID,
                publicKey: base64.base64.decode(passkey2.publicKey),
                counter: passkey2.counter,
                transports: passkey2.transports?.split(
                  ","
                )
              },
              requireUserVerification: false
            });
            const { verified } = verification;
            if (!verified)
              throw new betterCall.APIError("UNAUTHORIZED", {
                message: ERROR_CODES.AUTHENTICATION_FAILED
              });
            await ctx.context.adapter.update({
              model: "passkey",
              where: [
                {
                  field: "id",
                  value: passkey2.id
                }
              ],
              update: {
                counter: verification.authenticationInfo.newCounter
              }
            });
            const s = await ctx.context.internalAdapter.createSession(
              passkey2.userId,
              ctx
            );
            if (!s) {
              throw new betterCall.APIError("INTERNAL_SERVER_ERROR", {
                message: ERROR_CODES.UNABLE_TO_CREATE_SESSION
              });
            }
            const user = await ctx.context.internalAdapter.findUserById(
              passkey2.userId
            );
            if (!user) {
              throw new betterCall.APIError("INTERNAL_SERVER_ERROR", {
                message: "User not found"
              });
            }
            await cookies_index.setSessionCookie(ctx, {
              session: s,
              user
            });
            return ctx.json(
              {
                session: s
              },
              {
                status: 200
              }
            );
          } catch (e) {
            ctx.context.logger.error("Failed to verify authentication", e);
            throw new betterCall.APIError("BAD_REQUEST", {
              message: ERROR_CODES.AUTHENTICATION_FAILED
            });
          }
        }
      ),
      listPasskeys: account.createAuthEndpoint(
        "/passkey/list-user-passkeys",
        {
          method: "GET",
          use: [account.sessionMiddleware],
          metadata: {
            openapi: {
              description: "List all passkeys for the authenticated user",
              responses: {
                "200": {
                  description: "Passkeys retrieved successfully",
                  content: {
                    "application/json": {
                      schema: {
                        type: "array",
                        items: {
                          $ref: "#/components/schemas/Passkey",
                          required: [
                            "id",
                            "userId",
                            "publicKey",
                            "createdAt",
                            "updatedAt"
                          ]
                        },
                        description: "Array of passkey objects associated with the user"
                      }
                    }
                  }
                }
              }
            }
          }
        },
        async (ctx) => {
          const passkeys = await ctx.context.adapter.findMany({
            model: "passkey",
            where: [{ field: "userId", value: ctx.context.session.user.id }]
          });
          return ctx.json(passkeys, {
            status: 200
          });
        }
      ),
      deletePasskey: account.createAuthEndpoint(
        "/passkey/delete-passkey",
        {
          method: "POST",
          body: zod.z.object({
            id: zod.z.string()
          }),
          use: [account.sessionMiddleware],
          metadata: {
            openapi: {
              description: "Delete a specific passkey",
              responses: {
                "200": {
                  description: "Passkey deleted successfully",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          status: {
                            type: "boolean",
                            description: "Indicates whether the deletion was successful"
                          }
                        },
                        required: ["status"]
                      }
                    }
                  }
                }
              }
            }
          }
        },
        async (ctx) => {
          await ctx.context.adapter.delete({
            model: "passkey",
            where: [
              {
                field: "id",
                value: ctx.body.id
              }
            ]
          });
          return ctx.json(null, {
            status: 200
          });
        }
      ),
      updatePasskey: account.createAuthEndpoint(
        "/passkey/update-passkey",
        {
          method: "POST",
          body: zod.z.object({
            id: zod.z.string(),
            name: zod.z.string()
          }),
          use: [account.sessionMiddleware],
          metadata: {
            openapi: {
              description: "Update a specific passkey's name",
              responses: {
                "200": {
                  description: "Passkey updated successfully",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          passkey: {
                            $ref: "#/components/schemas/Passkey"
                          }
                        },
                        required: ["passkey"]
                      }
                    }
                  }
                }
              }
            }
          }
        },
        async (ctx) => {
          const passkey2 = await ctx.context.adapter.findOne({
            model: "passkey",
            where: [
              {
                field: "id",
                value: ctx.body.id
              }
            ]
          });
          if (!passkey2) {
            throw new betterCall.APIError("NOT_FOUND", {
              message: ERROR_CODES.PASSKEY_NOT_FOUND
            });
          }
          if (passkey2.userId !== ctx.context.session.user.id) {
            throw new betterCall.APIError("UNAUTHORIZED", {
              message: ERROR_CODES.YOU_ARE_NOT_ALLOWED_TO_REGISTER_THIS_PASSKEY
            });
          }
          const updatedPasskey = await ctx.context.adapter.update({
            model: "passkey",
            where: [
              {
                field: "id",
                value: ctx.body.id
              }
            ],
            update: {
              name: ctx.body.name
            }
          });
          if (!updatedPasskey) {
            throw new betterCall.APIError("INTERNAL_SERVER_ERROR", {
              message: ERROR_CODES.FAILED_TO_UPDATE_PASSKEY
            });
          }
          return ctx.json(
            {
              passkey: updatedPasskey
            },
            {
              status: 200
            }
          );
        }
      )
    },
    schema: schema$1.mergeSchema(schema, options?.schema),
    $ERROR_CODES: ERROR_CODES
  };
};
const schema = {
  passkey: {
    fields: {
      name: {
        type: "string",
        required: false
      },
      publicKey: {
        type: "string",
        required: true
      },
      userId: {
        type: "string",
        references: {
          model: "user",
          field: "id"
        },
        required: true
      },
      credentialID: {
        type: "string",
        required: true
      },
      counter: {
        type: "number",
        required: true
      },
      deviceType: {
        type: "string",
        required: true
      },
      backedUp: {
        type: "boolean",
        required: true
      },
      transports: {
        type: "string",
        required: false
      },
      createdAt: {
        type: "date",
        required: false
      },
      aaguid: {
        type: "string",
        required: false
      }
    }
  }
};

exports.passkey = passkey;
