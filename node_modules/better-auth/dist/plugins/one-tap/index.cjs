'use strict';

const zod = require('zod');
const betterCall = require('better-call');
const account = require('../../shared/better-auth.CM7smaHY.cjs');
const cookies_index = require('../../cookies/index.cjs');
require('../../shared/better-auth.DcWKCjjf.cjs');
require('../../shared/better-auth.DiSjtgs9.cjs');
require('../../shared/better-auth.GpOOav9x.cjs');
require('defu');
const jose = require('jose');
require('@better-auth/utils/random');
require('../../shared/better-auth.CWJ7qc0w.cjs');
require('@better-auth/utils/hash');
require('@noble/ciphers/chacha');
require('@noble/ciphers/utils');
require('@noble/ciphers/webcrypto');
require('@better-auth/utils/base64');
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

function toBoolean(value) {
  return value === "true" || value === true;
}

const oneTap = (options) => ({
  id: "one-tap",
  endpoints: {
    oneTapCallback: account.createAuthEndpoint(
      "/one-tap/callback",
      {
        method: "POST",
        body: zod.z.object({
          idToken: zod.z.string({
            description: "Google ID token, which the client obtains from the One Tap API"
          })
        }),
        metadata: {
          openapi: {
            summary: "One tap callback",
            description: "Use this endpoint to authenticate with Google One Tap",
            responses: {
              200: {
                description: "Successful response",
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
              },
              400: {
                description: "Invalid token"
              }
            }
          }
        }
      },
      async (ctx) => {
        const { idToken } = ctx.body;
        let payload;
        try {
          const JWKS = jose.createRemoteJWKSet(
            new URL("https://www.googleapis.com/oauth2/v3/certs")
          );
          const { payload: verifiedPayload } = await jose.jwtVerify(
            idToken,
            JWKS,
            {
              issuer: ["https://accounts.google.com", "accounts.google.com"],
              audience: options?.clientId || ctx.context.options.socialProviders?.google?.clientId
            }
          );
          payload = verifiedPayload;
        } catch (error) {
          throw new betterCall.APIError("BAD_REQUEST", {
            message: "invalid id token"
          });
        }
        const { email, email_verified, name, picture, sub } = payload;
        if (!email) {
          return ctx.json({ error: "Email not available in token" });
        }
        const user = await ctx.context.internalAdapter.findUserByEmail(email);
        if (!user) {
          if (options?.disableSignup) {
            throw new betterCall.APIError("BAD_GATEWAY", {
              message: "User not found"
            });
          }
          const newUser = await ctx.context.internalAdapter.createOAuthUser(
            {
              email,
              emailVerified: typeof email_verified === "boolean" ? email_verified : toBoolean(email_verified),
              name,
              image: picture
            },
            {
              providerId: "google",
              accountId: sub
            },
            ctx
          );
          if (!newUser) {
            throw new betterCall.APIError("INTERNAL_SERVER_ERROR", {
              message: "Could not create user"
            });
          }
          const session2 = await ctx.context.internalAdapter.createSession(
            newUser.user.id,
            ctx
          );
          await cookies_index.setSessionCookie(ctx, {
            user: newUser.user,
            session: session2
          });
          return ctx.json({
            token: session2.token,
            user: {
              id: newUser.user.id,
              email: newUser.user.email,
              emailVerified: newUser.user.emailVerified,
              name: newUser.user.name,
              image: newUser.user.image,
              createdAt: newUser.user.createdAt,
              updatedAt: newUser.user.updatedAt
            }
          });
        }
        const account = await ctx.context.internalAdapter.findAccount(sub);
        if (!account) {
          const accountLinking = ctx.context.options.account?.accountLinking;
          const shouldLinkAccount = accountLinking?.enabled && (accountLinking.trustedProviders?.includes("google") || email_verified);
          if (shouldLinkAccount) {
            await ctx.context.internalAdapter.linkAccount({
              userId: user.user.id,
              providerId: "google",
              accountId: sub,
              scope: "openid,profile,email",
              idToken
            });
          } else {
            throw new betterCall.APIError("UNAUTHORIZED", {
              message: "Google sub doesn't match"
            });
          }
        }
        const session = await ctx.context.internalAdapter.createSession(
          user.user.id,
          ctx
        );
        await cookies_index.setSessionCookie(ctx, {
          user: user.user,
          session
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
    )
  }
});

exports.oneTap = oneTap;
