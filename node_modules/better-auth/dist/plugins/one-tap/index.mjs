import { z } from 'zod';
import { APIError } from 'better-call';
import { a as createAuthEndpoint } from '../../shared/better-auth.oUCDPPbQ.mjs';
import { setSessionCookie } from '../../cookies/index.mjs';
import '../../shared/better-auth.Cc72UxUH.mjs';
import '../../shared/better-auth.8zoxzg-F.mjs';
import '../../shared/better-auth.Cqykj82J.mjs';
import 'defu';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import '@better-auth/utils/random';
import '../../shared/better-auth.dn8_oqOu.mjs';
import '@better-auth/utils/hash';
import '@noble/ciphers/chacha';
import '@noble/ciphers/utils';
import '@noble/ciphers/webcrypto';
import '@better-auth/utils/base64';
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
import '../../shared/better-auth.VTXNLFMT.mjs';
import 'jose/errors';

function toBoolean(value) {
  return value === "true" || value === true;
}

const oneTap = (options) => ({
  id: "one-tap",
  endpoints: {
    oneTapCallback: createAuthEndpoint(
      "/one-tap/callback",
      {
        method: "POST",
        body: z.object({
          idToken: z.string({
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
          const JWKS = createRemoteJWKSet(
            new URL("https://www.googleapis.com/oauth2/v3/certs")
          );
          const { payload: verifiedPayload } = await jwtVerify(
            idToken,
            JWKS,
            {
              issuer: ["https://accounts.google.com", "accounts.google.com"],
              audience: options?.clientId || ctx.context.options.socialProviders?.google?.clientId
            }
          );
          payload = verifiedPayload;
        } catch (error) {
          throw new APIError("BAD_REQUEST", {
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
            throw new APIError("BAD_GATEWAY", {
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
            throw new APIError("INTERNAL_SERVER_ERROR", {
              message: "Could not create user"
            });
          }
          const session2 = await ctx.context.internalAdapter.createSession(
            newUser.user.id,
            ctx
          );
          await setSessionCookie(ctx, {
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
            throw new APIError("UNAUTHORIZED", {
              message: "Google sub doesn't match"
            });
          }
        }
        const session = await ctx.context.internalAdapter.createSession(
          user.user.id,
          ctx
        );
        await setSessionCookie(ctx, {
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

export { oneTap };
