import { z } from 'zod';
import { APIError } from 'better-call';
import { c as createAuthMiddleware, a as createAuthEndpoint, s as sessionMiddleware } from '../../shared/better-auth.oUCDPPbQ.mjs';
import { parseSetCookieHeader, parseCookies, setSessionCookie, deleteSessionCookie } from '../../cookies/index.mjs';
import '../../shared/better-auth.Cc72UxUH.mjs';
import '../../shared/better-auth.8zoxzg-F.mjs';
import '../../shared/better-auth.Cqykj82J.mjs';
import 'defu';
import '@better-auth/utils/random';
import '../../shared/better-auth.dn8_oqOu.mjs';
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
      listDeviceSessions: createAuthEndpoint(
        "/multi-session/list-device-sessions",
        {
          method: "GET",
          requireHeaders: true
        },
        async (ctx) => {
          const cookieHeader = ctx.headers?.get("cookie");
          if (!cookieHeader) return ctx.json([]);
          const cookies = Object.fromEntries(parseCookies(cookieHeader));
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
      setActiveSession: createAuthEndpoint(
        "/multi-session/set-active",
        {
          method: "POST",
          body: z.object({
            sessionToken: z.string({
              description: "The session token to set as active"
            })
          }),
          requireHeaders: true,
          use: [sessionMiddleware],
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
            throw new APIError("UNAUTHORIZED", {
              message: ERROR_CODES.INVALID_SESSION_TOKEN
            });
          }
          const session = await ctx.context.internalAdapter.findSession(sessionToken);
          if (!session || session.session.expiresAt < /* @__PURE__ */ new Date()) {
            ctx.setCookie(multiSessionCookieName, "", {
              ...ctx.context.authCookies.sessionToken.options,
              maxAge: 0
            });
            throw new APIError("UNAUTHORIZED", {
              message: ERROR_CODES.INVALID_SESSION_TOKEN
            });
          }
          await setSessionCookie(ctx, session);
          return ctx.json(session);
        }
      ),
      revokeDeviceSession: createAuthEndpoint(
        "/multi-session/revoke",
        {
          method: "POST",
          body: z.object({
            sessionToken: z.string({
              description: "The session token to revoke"
            })
          }),
          requireHeaders: true,
          use: [sessionMiddleware],
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
            throw new APIError("UNAUTHORIZED", {
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
            const cookies = Object.fromEntries(parseCookies(cookieHeader));
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
                await setSessionCookie(ctx, nextSession);
              } else {
                deleteSessionCookie(ctx);
              }
            } else {
              deleteSessionCookie(ctx);
            }
          } else {
            deleteSessionCookie(ctx);
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
          handler: createAuthMiddleware(async (ctx) => {
            const cookieString = ctx.context.responseHeaders?.get("set-cookie");
            if (!cookieString) return;
            const setCookies = parseSetCookieHeader(cookieString);
            const sessionCookieConfig = ctx.context.authCookies.sessionToken;
            const sessionToken = ctx.context.newSession?.session.token;
            if (!sessionToken) return;
            const cookies = parseCookies(ctx.headers?.get("cookie") || "");
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
          handler: createAuthMiddleware(async (ctx) => {
            const cookieHeader = ctx.headers?.get("cookie");
            if (!cookieHeader) return;
            const cookies = Object.fromEntries(parseCookies(cookieHeader));
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

export { multiSession };
