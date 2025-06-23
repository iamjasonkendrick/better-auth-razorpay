'use strict';

const schema$1 = require('../../shared/better-auth.BG6vHVNT.cjs');
const jose = require('jose');
require('better-call');
const account = require('../../shared/better-auth.CM7smaHY.cjs');
require('zod');
const index = require('../../shared/better-auth.ANpbi45u.cjs');
require('../../shared/better-auth.DiSjtgs9.cjs');
require('@better-auth/utils/base64');
require('@better-auth/utils/hmac');
require('@better-auth/utils/binary');
const schema = require('../../shared/better-auth.DcWKCjjf.cjs');
require('../../shared/better-auth.GpOOav9x.cjs');
require('defu');
const crypto_index = require('../../crypto/index.cjs');
require('../../cookies/index.cjs');
require('../../shared/better-auth.C1hdVENX.cjs');
require('../../shared/better-auth.D3mtHEZg.cjs');
require('../../shared/better-auth.C-R0J0n1.cjs');
require('@better-auth/utils/random');
require('../../shared/better-auth.CWJ7qc0w.cjs');
require('@better-auth/utils/hash');
require('@noble/ciphers/chacha');
require('@noble/ciphers/utils');
require('@noble/ciphers/webcrypto');
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
require('../../shared/better-auth.YUF6P-PB.cjs');

const getJwksAdapter = (adapter) => {
  return {
    getAllKeys: async () => {
      return await adapter.findMany({
        model: "jwks"
      });
    },
    getLatestKey: async () => {
      const key = await adapter.findMany({
        model: "jwks",
        sortBy: {
          field: "createdAt",
          direction: "desc"
        },
        limit: 1
      });
      return key[0];
    },
    createJwk: async (webKey) => {
      const jwk = await adapter.create({
        model: "jwks",
        data: {
          ...webKey,
          createdAt: /* @__PURE__ */ new Date()
        }
      });
      return jwk;
    }
  };
};

async function getJwtToken(ctx, options) {
  const adapter = getJwksAdapter(ctx.context.adapter);
  let key = await adapter.getLatestKey();
  const privateKeyEncryptionEnabled = !options?.jwks?.disablePrivateKeyEncryption;
  if (key === void 0) {
    const { publicKey, privateKey: privateKey2 } = await jose.generateKeyPair(
      options?.jwks?.keyPairConfig?.alg ?? "EdDSA",
      options?.jwks?.keyPairConfig ?? {
        crv: "Ed25519",
        extractable: true
      }
    );
    const publicWebKey = await jose.exportJWK(publicKey);
    const privateWebKey2 = await jose.exportJWK(privateKey2);
    const stringifiedPrivateWebKey = JSON.stringify(privateWebKey2);
    let jwk = {
      publicKey: JSON.stringify(publicWebKey),
      privateKey: privateKeyEncryptionEnabled ? JSON.stringify(
        await crypto_index.symmetricEncrypt({
          key: ctx.context.secret,
          data: stringifiedPrivateWebKey
        })
      ) : stringifiedPrivateWebKey,
      createdAt: /* @__PURE__ */ new Date()
    };
    key = await adapter.createJwk(jwk);
  }
  let privateWebKey = privateKeyEncryptionEnabled ? await crypto_index.symmetricDecrypt({
    key: ctx.context.secret,
    data: JSON.parse(key.privateKey)
  }).catch(() => {
    throw new index.BetterAuthError(
      "Failed to decrypt private private key. Make sure the secret currently in use is the same as the one used to encrypt the private key. If you are using a different secret, either cleanup your jwks or disable private key encryption."
    );
  }) : key.privateKey;
  const privateKey = await jose.importJWK(
    JSON.parse(privateWebKey),
    options?.jwks?.keyPairConfig?.alg ?? "EdDSA"
  );
  const payload = !options?.jwt?.definePayload ? ctx.context.session.user : await options?.jwt.definePayload(ctx.context.session);
  const jwt2 = await new jose.SignJWT(payload).setProtectedHeader({
    alg: options?.jwks?.keyPairConfig?.alg ?? "EdDSA",
    kid: key.id
  }).setIssuedAt().setIssuer(options?.jwt?.issuer ?? ctx.context.options.baseURL).setAudience(options?.jwt?.audience ?? ctx.context.options.baseURL).setExpirationTime(options?.jwt?.expirationTime ?? "15m").setSubject(
    await options?.jwt?.getSubject?.(ctx.context.session) ?? ctx.context.session.user.id
  ).sign(privateKey);
  return jwt2;
}
const jwt = (options) => {
  return {
    id: "jwt",
    endpoints: {
      getJwks: account.createAuthEndpoint(
        "/jwks",
        {
          method: "GET",
          metadata: {
            openapi: {
              description: "Get the JSON Web Key Set",
              responses: {
                "200": {
                  description: "JSON Web Key Set retrieved successfully",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          keys: {
                            type: "array",
                            description: "Array of public JSON Web Keys",
                            items: {
                              type: "object",
                              properties: {
                                kid: {
                                  type: "string",
                                  description: "Key ID uniquely identifying the key, corresponds to the 'id' from the stored Jwk"
                                },
                                kty: {
                                  type: "string",
                                  description: "Key type (e.g., 'RSA', 'EC', 'OKP')"
                                },
                                alg: {
                                  type: "string",
                                  description: "Algorithm intended for use with the key (e.g., 'EdDSA', 'RS256')"
                                },
                                use: {
                                  type: "string",
                                  description: "Intended use of the public key (e.g., 'sig' for signature)",
                                  enum: ["sig"],
                                  nullable: true
                                },
                                n: {
                                  type: "string",
                                  description: "Modulus for RSA keys (base64url-encoded)",
                                  nullable: true
                                },
                                e: {
                                  type: "string",
                                  description: "Exponent for RSA keys (base64url-encoded)",
                                  nullable: true
                                },
                                crv: {
                                  type: "string",
                                  description: "Curve name for elliptic curve keys (e.g., 'Ed25519', 'P-256')",
                                  nullable: true
                                },
                                x: {
                                  type: "string",
                                  description: "X coordinate for elliptic curve keys (base64url-encoded)",
                                  nullable: true
                                },
                                y: {
                                  type: "string",
                                  description: "Y coordinate for elliptic curve keys (base64url-encoded)",
                                  nullable: true
                                }
                              },
                              required: ["kid", "kty", "alg"]
                            }
                          }
                        },
                        required: ["keys"]
                      }
                    }
                  }
                }
              }
            }
          }
        },
        async (ctx) => {
          const adapter = getJwksAdapter(ctx.context.adapter);
          const keySets = await adapter.getAllKeys();
          if (keySets.length === 0) {
            const alg = options?.jwks?.keyPairConfig?.alg ?? "EdDSA";
            const { publicKey, privateKey } = await jose.generateKeyPair(
              alg,
              options?.jwks?.keyPairConfig ?? {
                crv: "Ed25519",
                extractable: true
              }
            );
            const publicWebKey = await jose.exportJWK(publicKey);
            const privateWebKey = await jose.exportJWK(privateKey);
            const stringifiedPrivateWebKey = JSON.stringify(privateWebKey);
            const privateKeyEncryptionEnabled = !options?.jwks?.disablePrivateKeyEncryption;
            let jwk = {
              publicKey: JSON.stringify({ alg, ...publicWebKey }),
              privateKey: privateKeyEncryptionEnabled ? JSON.stringify(
                await crypto_index.symmetricEncrypt({
                  key: ctx.context.secret,
                  data: stringifiedPrivateWebKey
                })
              ) : stringifiedPrivateWebKey,
              createdAt: /* @__PURE__ */ new Date()
            };
            await adapter.createJwk(jwk);
            return ctx.json({
              keys: [
                {
                  ...publicWebKey,
                  alg,
                  kid: jwk.id
                }
              ]
            });
          }
          return ctx.json({
            keys: keySets.map((keySet) => ({
              ...JSON.parse(keySet.publicKey),
              kid: keySet.id
            }))
          });
        }
      ),
      getToken: account.createAuthEndpoint(
        "/token",
        {
          method: "GET",
          requireHeaders: true,
          use: [account.sessionMiddleware],
          metadata: {
            openapi: {
              description: "Get a JWT token",
              responses: {
                200: {
                  description: "Success",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          token: {
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
          const jwt2 = await getJwtToken(ctx, options);
          return ctx.json({
            token: jwt2
          });
        }
      )
    },
    hooks: {
      after: [
        {
          matcher(context) {
            return context.path === "/get-session";
          },
          handler: account.createAuthMiddleware(async (ctx) => {
            const session = ctx.context.session || ctx.context.newSession;
            if (session && session.session) {
              const jwt2 = await getJwtToken(ctx, options);
              ctx.setHeader("set-auth-jwt", jwt2);
              ctx.setHeader("Access-Control-Expose-Headers", "set-auth-jwt");
            }
          })
        }
      ]
    },
    schema: schema.mergeSchema(schema$1.schema, options?.schema)
  };
};

exports.getJwtToken = getJwtToken;
exports.jwt = jwt;
