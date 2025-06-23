import { z } from 'zod';
import { a as createAuthEndpoint, o as originCheck, B as BASE_ERROR_CODES } from '../../shared/better-auth.oUCDPPbQ.mjs';
import { APIError } from 'better-call';
import { setSessionCookie } from '../../cookies/index.mjs';
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
import { g as generateRandomString } from '../../shared/better-auth.B4Qoxdgc.mjs';
import '../../shared/better-auth.Cc72UxUH.mjs';
import '../../shared/better-auth.8zoxzg-F.mjs';
import '../../shared/better-auth.Cqykj82J.mjs';
import 'defu';
import '@better-auth/utils/random';
import '../../shared/better-auth.dn8_oqOu.mjs';
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

const magicLink = (options) => {
  return {
    id: "magic-link",
    endpoints: {
      signInMagicLink: createAuthEndpoint(
        "/sign-in/magic-link",
        {
          method: "POST",
          requireHeaders: true,
          body: z.object({
            email: z.string({
              description: "Email address to send the magic link"
            }).email(),
            name: z.string({
              description: "User display name. Only used if the user is registering for the first time."
            }).optional(),
            callbackURL: z.string({
              description: "URL to redirect after magic link verification"
            }).optional()
          }),
          metadata: {
            openapi: {
              description: "Sign in with magic link",
              responses: {
                200: {
                  description: "Success",
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
          const { email } = ctx.body;
          if (options.disableSignUp) {
            const user = await ctx.context.internalAdapter.findUserByEmail(email);
            if (!user) {
              throw new APIError("BAD_REQUEST", {
                message: BASE_ERROR_CODES.USER_NOT_FOUND
              });
            }
          }
          const verificationToken = options?.generateToken ? await options.generateToken(email) : generateRandomString(32, "a-z", "A-Z");
          await ctx.context.internalAdapter.createVerificationValue(
            {
              identifier: verificationToken,
              value: JSON.stringify({ email, name: ctx.body.name }),
              expiresAt: new Date(
                Date.now() + (options.expiresIn || 60 * 5) * 1e3
              )
            },
            ctx
          );
          const url = `${ctx.context.baseURL}/magic-link/verify?token=${verificationToken}&callbackURL=${encodeURIComponent(
            ctx.body.callbackURL || "/"
          )}`;
          await options.sendMagicLink(
            {
              email,
              url,
              token: verificationToken
            },
            ctx.request
          );
          return ctx.json({
            status: true
          });
        }
      ),
      magicLinkVerify: createAuthEndpoint(
        "/magic-link/verify",
        {
          method: "GET",
          query: z.object({
            token: z.string({
              description: "Verification token"
            }),
            callbackURL: z.string({
              description: "URL to redirect after magic link verification, if not provided will return session"
            }).optional()
          }),
          use: [
            originCheck((ctx) => {
              return ctx.query.callbackURL ? decodeURIComponent(ctx.query.callbackURL) : "/";
            })
          ],
          requireHeaders: true,
          metadata: {
            openapi: {
              description: "Verify magic link",
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
            }
          }
        },
        async (ctx) => {
          const token = ctx.query.token;
          const callbackURL = ctx.query.callbackURL ? decodeURIComponent(ctx.query.callbackURL) : "/";
          const toRedirectTo = callbackURL?.startsWith("http") ? callbackURL : callbackURL ? `${ctx.context.options.baseURL}${callbackURL}` : ctx.context.options.baseURL;
          const tokenValue = await ctx.context.internalAdapter.findVerificationValue(token);
          if (!tokenValue) {
            throw ctx.redirect(`${toRedirectTo}?error=INVALID_TOKEN`);
          }
          if (tokenValue.expiresAt < /* @__PURE__ */ new Date()) {
            await ctx.context.internalAdapter.deleteVerificationValue(
              tokenValue.id
            );
            throw ctx.redirect(`${toRedirectTo}?error=EXPIRED_TOKEN`);
          }
          await ctx.context.internalAdapter.deleteVerificationValue(
            tokenValue.id
          );
          const { email, name } = JSON.parse(tokenValue.value);
          let user = await ctx.context.internalAdapter.findUserByEmail(email).then((res) => res?.user);
          if (!user) {
            if (!options.disableSignUp) {
              const newUser = await ctx.context.internalAdapter.createUser(
                {
                  email,
                  emailVerified: true,
                  name: name || ""
                },
                ctx
              );
              user = newUser;
              if (!user) {
                throw ctx.redirect(
                  `${toRedirectTo}?error=failed_to_create_user`
                );
              }
            } else {
              throw ctx.redirect(
                `${toRedirectTo}?error=new_user_signup_disabled`
              );
            }
          }
          if (!user.emailVerified) {
            await ctx.context.internalAdapter.updateUser(
              user.id,
              {
                emailVerified: true
              },
              ctx
            );
          }
          const session = await ctx.context.internalAdapter.createSession(
            user.id,
            ctx
          );
          if (!session) {
            throw ctx.redirect(
              `${toRedirectTo}?error=failed_to_create_session`
            );
          }
          await setSessionCookie(ctx, {
            session,
            user
          });
          if (!ctx.query.callbackURL) {
            return ctx.json({
              token: session.token,
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
          }
          throw ctx.redirect(callbackURL);
        }
      )
    },
    rateLimit: [
      {
        pathMatcher(path) {
          return path.startsWith("/sign-in/magic-link") || path.startsWith("/magic-link/verify");
        },
        window: options.rateLimit?.window || 60,
        max: options.rateLimit?.max || 5
      }
    ]
  };
};

export { magicLink };
