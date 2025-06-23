import { s as schema } from '../../shared/better-auth.fsvwNeUx.mjs';
import { generateKeyPair, exportJWK, importJWK, SignJWT } from 'jose';
import 'better-call';
import { c as createAuthMiddleware, a as createAuthEndpoint, s as sessionMiddleware } from '../../shared/better-auth.oUCDPPbQ.mjs';
import 'zod';
import { B as BetterAuthError } from '../../shared/better-auth.DdzSJf-n.mjs';
import '../../shared/better-auth.8zoxzg-F.mjs';
import '@better-auth/utils/base64';
import '@better-auth/utils/hmac';
import '@better-auth/utils/binary';
import { m as mergeSchema } from '../../shared/better-auth.Cc72UxUH.mjs';
import '../../shared/better-auth.Cqykj82J.mjs';
import 'defu';
import { symmetricEncrypt, symmetricDecrypt } from '../../crypto/index.mjs';
import '../../cookies/index.mjs';
import '../../shared/better-auth.CW6D9eSx.mjs';
import '../../shared/better-auth.tB5eU6EY.mjs';
import '../../shared/better-auth.VTXNLFMT.mjs';
import '@better-auth/utils/random';
import '../../shared/better-auth.dn8_oqOu.mjs';
import '@better-auth/utils/hash';
import '@noble/ciphers/chacha';
import '@noble/ciphers/utils';
import '@noble/ciphers/webcrypto';
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
import '../../shared/better-auth.OT3XFeFk.mjs';

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
    const { publicKey, privateKey: privateKey2 } = await generateKeyPair(
      options?.jwks?.keyPairConfig?.alg ?? "EdDSA",
      options?.jwks?.keyPairConfig ?? {
        crv: "Ed25519",
        extractable: true
      }
    );
    const publicWebKey = await exportJWK(publicKey);
    const privateWebKey2 = await exportJWK(privateKey2);
    const stringifiedPrivateWebKey = JSON.stringify(privateWebKey2);
    let jwk = {
      publicKey: JSON.stringify(publicWebKey),
      privateKey: privateKeyEncryptionEnabled ? JSON.stringify(
        await symmetricEncrypt({
          key: ctx.context.secret,
          data: stringifiedPrivateWebKey
        })
      ) : stringifiedPrivateWebKey,
      createdAt: /* @__PURE__ */ new Date()
    };
    key = await adapter.createJwk(jwk);
  }
  let privateWebKey = privateKeyEncryptionEnabled ? await symmetricDecrypt({
    key: ctx.context.secret,
    data: JSON.parse(key.privateKey)
  }).catch(() => {
    throw new BetterAuthError(
      "Failed to decrypt private private key. Make sure the secret currently in use is the same as the one used to encrypt the private key. If you are using a different secret, either cleanup your jwks or disable private key encryption."
    );
  }) : key.privateKey;
  const privateKey = await importJWK(
    JSON.parse(privateWebKey),
    options?.jwks?.keyPairConfig?.alg ?? "EdDSA"
  );
  const payload = !options?.jwt?.definePayload ? ctx.context.session.user : await options?.jwt.definePayload(ctx.context.session);
  const jwt2 = await new SignJWT(payload).setProtectedHeader({
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
      getJwks: createAuthEndpoint(
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
            const { publicKey, privateKey } = await generateKeyPair(
              alg,
              options?.jwks?.keyPairConfig ?? {
                crv: "Ed25519",
                extractable: true
              }
            );
            const publicWebKey = await exportJWK(publicKey);
            const privateWebKey = await exportJWK(privateKey);
            const stringifiedPrivateWebKey = JSON.stringify(privateWebKey);
            const privateKeyEncryptionEnabled = !options?.jwks?.disablePrivateKeyEncryption;
            let jwk = {
              publicKey: JSON.stringify({ alg, ...publicWebKey }),
              privateKey: privateKeyEncryptionEnabled ? JSON.stringify(
                await symmetricEncrypt({
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
      getToken: createAuthEndpoint(
        "/token",
        {
          method: "GET",
          requireHeaders: true,
          use: [sessionMiddleware],
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
          handler: createAuthMiddleware(async (ctx) => {
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
    schema: mergeSchema(schema, options?.schema)
  };
};

export { getJwtToken, jwt };
