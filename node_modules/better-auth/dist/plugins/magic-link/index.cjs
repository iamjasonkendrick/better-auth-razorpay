'use strict';

const zod = require('zod');
const account = require('../../shared/better-auth.CM7smaHY.cjs');
const betterCall = require('better-call');
const cookies_index = require('../../cookies/index.cjs');
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
require('../../shared/better-auth.DcWKCjjf.cjs');
require('../../shared/better-auth.DiSjtgs9.cjs');
require('../../shared/better-auth.GpOOav9x.cjs');
require('defu');
require('@better-auth/utils/random');
require('../../shared/better-auth.CWJ7qc0w.cjs');
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

const magicLink = (options) => {
  return {
    id: "magic-link",
    endpoints: {
      signInMagicLink: account.createAuthEndpoint(
        "/sign-in/magic-link",
        {
          method: "POST",
          requireHeaders: true,
          body: zod.z.object({
            email: zod.z.string({
              description: "Email address to send the magic link"
            }).email(),
            name: zod.z.string({
              description: "User display name. Only used if the user is registering for the first time."
            }).optional(),
            callbackURL: zod.z.string({
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
              throw new betterCall.APIError("BAD_REQUEST", {
                message: account.BASE_ERROR_CODES.USER_NOT_FOUND
              });
            }
          }
          const verificationToken = options?.generateToken ? await options.generateToken(email) : random.generateRandomString(32, "a-z", "A-Z");
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
      magicLinkVerify: account.createAuthEndpoint(
        "/magic-link/verify",
        {
          method: "GET",
          query: zod.z.object({
            token: zod.z.string({
              description: "Verification token"
            }),
            callbackURL: zod.z.string({
              description: "URL to redirect after magic link verification, if not provided will return session"
            }).optional()
          }),
          use: [
            account.originCheck((ctx) => {
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
          await cookies_index.setSessionCookie(ctx, {
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

exports.magicLink = magicLink;
