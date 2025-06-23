'use strict';

const zod = require('zod');
const betterCall = require('better-call');
const account = require('../../shared/better-auth.CM7smaHY.cjs');
const cookies_index = require('../../cookies/index.cjs');
require('../../shared/better-auth.DcWKCjjf.cjs');
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

const multiSession = (options) => {
  const opts = {
    maximumSessions: 5,
    ...options
  };
  const isMultiSessionCookie = (key) => key.includes("_multi-");
  const ERROR_CODES = {
    INVALID_SESSION_TOKEN: "Invalid session token"
  };
  return {
    id: "multi-session",
    endpoints: {
      listDeviceSessions: account.createAuthEndpoint(
        "/multi-session/list-device-sessions",
        {
          method: "GET",
          requireHeaders: true
        },
        async (ctx) => {
          const cookieHeader = ctx.headers?.get("cookie");
          if (!cookieHeader) return ctx.json([]);
          const cookies = Object.fromEntries(cookies_index.parseCookies(cookieHeader));
          const sessionTokens = (await Promise.all(
            Object.entries(cookies).filter(([key]) => isMultiSessionCookie(key)).map(
              async ([key]) => await ctx.getSignedCookie(key, ctx.context.secret)
            )
          )).filter((v) => v !== null);
          if (!sessionTokens.length) return ctx.json([]);
          const sessions = await ctx.context.internalAdapter.findSessions(sessionTokens);
          const validSessions = sessions.filter(
            (session) => session && session.session.expiresAt > /* @__PURE__ */ new Date()
          );
          const uniqueUserSessions = validSessions.reduce(
            (acc, session) => {
              if (!acc.find((s) => s.user.id === session.user.id)) {
                acc.push(session);
              }
              return acc;
            },
            []
          );
          return ctx.json(uniqueUserSessions);
        }
      ),
      setActiveSession: account.createAuthEndpoint(
        "/multi-session/set-active",
        {
          method: "POST",
          body: zod.z.object({
            sessionToken: zod.z.string({
              description: "The session token to set as active"
            })
          }),
          requireHeaders: true,
          use: [account.sessionMiddleware],
          metadata: {
            openapi: {
              description: "Set the active session",
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
          const sessionToken = ctx.body.sessionToken;
          const multiSessionCookieName = `${ctx.context.authCookies.sessionToken.name}_multi-${sessionToken.toLowerCase()}`;
          const sessionCookie = await ctx.getSignedCookie(
            multiSessionCookieName,
            ctx.context.secret
          );
          if (!sessionCookie) {
            throw new betterCall.APIError("UNAUTHORIZED", {
              message: ERROR_CODES.INVALID_SESSION_TOKEN
            });
          }
          const session = await ctx.context.internalAdapter.findSession(sessionToken);
          if (!session || session.session.expiresAt < /* @__PURE__ */ new Date()) {
            ctx.setCookie(multiSessionCookieName, "", {
              ...ctx.context.authCookies.sessionToken.options,
              maxAge: 0
            });
            throw new betterCall.APIError("UNAUTHORIZED", {
              message: ERROR_CODES.INVALID_SESSION_TOKEN
            });
          }
          await cookies_index.setSessionCookie(ctx, session);
          return ctx.json(session);
        }
      ),
      revokeDeviceSession: account.createAuthEndpoint(
        "/multi-session/revoke",
        {
          method: "POST",
          body: zod.z.object({
            sessionToken: zod.z.string({
              description: "The session token to revoke"
            })
          }),
          requireHeaders: true,
          use: [account.sessionMiddleware],
          metadata: {
            openapi: {
              description: "Revoke a device session",
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
          const sessionToken = ctx.body.sessionToken;
          const multiSessionCookieName = `${ctx.context.authCookies.sessionToken.name}_multi-${sessionToken.toLowerCase()}`;
          const sessionCookie = await ctx.getSignedCookie(
            multiSessionCookieName,
            ctx.context.secret
          );
          if (!sessionCookie) {
            throw new betterCall.APIError("UNAUTHORIZED", {
              message: ERROR_CODES.INVALID_SESSION_TOKEN
            });
          }
          await ctx.context.internalAdapter.deleteSession(sessionToken);
          ctx.setCookie(multiSessionCookieName, "", {
            ...ctx.context.authCookies.sessionToken.options,
            maxAge: 0
          });
          const isActive = ctx.context.session?.session.token === sessionToken;
          if (!isActive) return ctx.json({ status: true });
          const cookieHeader = ctx.headers?.get("cookie");
          if (cookieHeader) {
            const cookies = Object.fromEntries(cookies_index.parseCookies(cookieHeader));
            const sessionTokens = (await Promise.all(
              Object.entries(cookies).filter(([key]) => isMultiSessionCookie(key)).map(
                async ([key]) => await ctx.getSignedCookie(key, ctx.context.secret)
              )
            )).filter((v) => v !== void 0);
            const internalAdapter = ctx.context.internalAdapter;
            if (sessionTokens.length > 0) {
              const sessions = await internalAdapter.findSessions(sessionTokens);
              const validSessions = sessions.filter(
                (session) => session && session.session.expiresAt > /* @__PURE__ */ new Date()
              );
              if (validSessions.length > 0) {
                const nextSession = validSessions[0];
                await cookies_index.setSessionCookie(ctx, nextSession);
              } else {
                cookies_index.deleteSessionCookie(ctx);
              }
            } else {
              cookies_index.deleteSessionCookie(ctx);
            }
          } else {
            cookies_index.deleteSessionCookie(ctx);
          }
          return ctx.json({
            status: true
          });
        }
      )
    },
    hooks: {
      after: [
        {
          matcher: () => true,
          handler: account.createAuthMiddleware(async (ctx) => {
            const cookieString = ctx.context.responseHeaders?.get("set-cookie");
            if (!cookieString) return;
            const setCookies = cookies_index.parseSetCookieHeader(cookieString);
            const sessionCookieConfig = ctx.context.authCookies.sessionToken;
            const sessionToken = ctx.context.newSession?.session.token;
            if (!sessionToken) return;
            const cookies = cookies_index.parseCookies(ctx.headers?.get("cookie") || "");
            const cookieName = `${sessionCookieConfig.name}_multi-${sessionToken.toLowerCase()}`;
            if (setCookies.get(cookieName) || cookies.get(cookieName)) return;
            const currentMultiSessions = Object.keys(Object.fromEntries(cookies)).filter(
              isMultiSessionCookie
            ).length + (cookieString.includes("session_token") ? 1 : 0);
            if (currentMultiSessions >= opts.maximumSessions) {
              return;
            }
            await ctx.setSignedCookie(
              cookieName,
              sessionToken,
              ctx.context.secret,
              sessionCookieConfig.options
            );
          })
        },
        {
          matcher: (context) => context.path === "/sign-out",
          handler: account.createAuthMiddleware(async (ctx) => {
            const cookieHeader = ctx.headers?.get("cookie");
            if (!cookieHeader) return;
            const cookies = Object.fromEntries(cookies_index.parseCookies(cookieHeader));
            const ids = Object.keys(cookies).map((key) => {
              if (isMultiSessionCookie(key)) {
                ctx.setCookie(key.toLowerCase(), "", {
                  ...ctx.context.authCookies.sessionToken.options,
                  maxAge: 0
                });
                const token = cookies[key].split(".")[0];
                return token;
              }
              return null;
            }).filter((v) => v !== null);
            await ctx.context.internalAdapter.deleteSessions(ids);
          })
        }
      ]
    },
    $ERROR_CODES: ERROR_CODES
  };
};

exports.multiSession = multiSession;
