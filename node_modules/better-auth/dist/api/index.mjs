import { APIError, toResponse, createRouter } from 'better-call';
export { APIError } from 'better-call';
import { a as createAuthEndpoint, B as BASE_ERROR_CODES, e as createEmailVerificationToken, w as wildcardMatch, l as listSessions, u as updateUser, b as getSession, i as originCheckMiddleware, j as error, k as ok, m as accountInfo, n as getAccessToken, r as refreshToken, p as unlinkAccount, q as deleteUserCallback, t as listUserAccounts, v as linkSocialAccount, x as revokeOtherSessions, y as revokeSessions, z as revokeSession, A as requestPasswordResetCallback, C as requestPasswordReset, D as forgetPasswordCallback, E as deleteUser, F as setPassword, G as changePassword, I as changeEmail, J as sendVerificationEmail, K as verifyEmail, L as resetPassword, M as forgetPassword, N as signInEmail, O as signOut, P as callbackOAuth, Q as signInSocial } from '../shared/better-auth.oUCDPPbQ.mjs';
export { c as createAuthMiddleware, f as freshSessionMiddleware, g as getSessionFromCtx, S as optionsMiddleware, o as originCheck, R as requestOnlySessionMiddleware, d as sendVerificationEmailFn, s as sessionMiddleware } from '../shared/better-auth.oUCDPPbQ.mjs';
import { z } from 'zod';
import { setSessionCookie } from '../cookies/index.mjs';
import { f as parseUserInput } from '../shared/better-auth.Cc72UxUH.mjs';
import { b as isDevelopment } from '../shared/better-auth.8zoxzg-F.mjs';
import { l as logger } from '../shared/better-auth.Cqykj82J.mjs';
import { g as getIp } from '../shared/better-auth.iKoUsdFE.mjs';
import defu from 'defu';
import '@better-auth/utils/random';
import '../shared/better-auth.dn8_oqOu.mjs';
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
import '../shared/better-auth.B4Qoxdgc.mjs';
import '../social-providers/index.mjs';
import '@better-fetch/fetch';
import '../shared/better-auth.DufyW0qf.mjs';
import '../shared/better-auth.CW6D9eSx.mjs';
import '../shared/better-auth.DdzSJf-n.mjs';
import '../shared/better-auth.tB5eU6EY.mjs';
import '../shared/better-auth.BUPPRXfK.mjs';
import '@better-auth/utils/hmac';
import '@better-auth/utils/binary';
import '../shared/better-auth.DDEbWX-S.mjs';
import '../shared/better-auth.VTXNLFMT.mjs';
import 'jose/errors';

const signUpEmail = () => createAuthEndpoint(
  "/sign-up/email",
  {
    method: "POST",
    body: z.record(z.string(), z.any()),
    metadata: {
      $Infer: {
        body: {}
      },
      openapi: {
        description: "Sign up a user using email and password",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    description: "The name of the user"
                  },
                  email: {
                    type: "string",
                    description: "The email of the user"
                  },
                  password: {
                    type: "string",
                    description: "The password of the user"
                  },
                  callbackURL: {
                    type: "string",
                    description: "The URL to use for email verification callback"
                  }
                },
                required: ["name", "email", "password"]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Successfully created user",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    token: {
                      type: "string",
                      nullable: true,
                      description: "Authentication token for the session"
                    },
                    user: {
                      type: "object",
                      properties: {
                        id: {
                          type: "string",
                          description: "The unique identifier of the user"
                        },
                        email: {
                          type: "string",
                          format: "email",
                          description: "The email address of the user"
                        },
                        name: {
                          type: "string",
                          description: "The name of the user"
                        },
                        image: {
                          type: "string",
                          format: "uri",
                          nullable: true,
                          description: "The profile image URL of the user"
                        },
                        emailVerified: {
                          type: "boolean",
                          description: "Whether the email has been verified"
                        },
                        createdAt: {
                          type: "string",
                          format: "date-time",
                          description: "When the user was created"
                        },
                        updatedAt: {
                          type: "string",
                          format: "date-time",
                          description: "When the user was last updated"
                        }
                      },
                      required: [
                        "id",
                        "email",
                        "name",
                        "emailVerified",
                        "createdAt",
                        "updatedAt"
                      ]
                    }
                  },
                  required: ["user"]
                  // token is optional
                }
              }
            }
          }
        }
      }
    }
  },
  async (ctx) => {
    if (!ctx.context.options.emailAndPassword?.enabled || ctx.context.options.emailAndPassword?.disableSignUp) {
      throw new APIError("BAD_REQUEST", {
        message: "Email and password sign up is not enabled"
      });
    }
    const body = ctx.body;
    const { name, email, password, image, callbackURL, ...additionalFields } = body;
    const isValidEmail = z.string().email().safeParse(email);
    if (!isValidEmail.success) {
      throw new APIError("BAD_REQUEST", {
        message: BASE_ERROR_CODES.INVALID_EMAIL
      });
    }
    const minPasswordLength = ctx.context.password.config.minPasswordLength;
    if (password.length < minPasswordLength) {
      ctx.context.logger.error("Password is too short");
      throw new APIError("BAD_REQUEST", {
        message: BASE_ERROR_CODES.PASSWORD_TOO_SHORT
      });
    }
    const maxPasswordLength = ctx.context.password.config.maxPasswordLength;
    if (password.length > maxPasswordLength) {
      ctx.context.logger.error("Password is too long");
      throw new APIError("BAD_REQUEST", {
        message: BASE_ERROR_CODES.PASSWORD_TOO_LONG
      });
    }
    const dbUser = await ctx.context.internalAdapter.findUserByEmail(email);
    if (dbUser?.user) {
      ctx.context.logger.info(`Sign-up attempt for existing email: ${email}`);
      throw new APIError("UNPROCESSABLE_ENTITY", {
        message: BASE_ERROR_CODES.USER_ALREADY_EXISTS
      });
    }
    const additionalData = parseUserInput(
      ctx.context.options,
      additionalFields
    );
    const hash = await ctx.context.password.hash(password);
    let createdUser;
    try {
      createdUser = await ctx.context.internalAdapter.createUser(
        {
          email: email.toLowerCase(),
          name,
          image,
          ...additionalData,
          emailVerified: false
        },
        ctx
      );
      if (!createdUser) {
        throw new APIError("BAD_REQUEST", {
          message: BASE_ERROR_CODES.FAILED_TO_CREATE_USER
        });
      }
    } catch (e) {
      if (isDevelopment) {
        ctx.context.logger.error("Failed to create user", e);
      }
      if (e instanceof APIError) {
        throw e;
      }
      throw new APIError("UNPROCESSABLE_ENTITY", {
        message: BASE_ERROR_CODES.FAILED_TO_CREATE_USER,
        details: e
      });
    }
    if (!createdUser) {
      throw new APIError("UNPROCESSABLE_ENTITY", {
        message: BASE_ERROR_CODES.FAILED_TO_CREATE_USER
      });
    }
    await ctx.context.internalAdapter.linkAccount(
      {
        userId: createdUser.id,
        providerId: "credential",
        accountId: createdUser.id,
        password: hash
      },
      ctx
    );
    if (ctx.context.options.emailVerification?.sendOnSignUp || ctx.context.options.emailAndPassword.requireEmailVerification) {
      const token = await createEmailVerificationToken(
        ctx.context.secret,
        createdUser.email,
        void 0,
        ctx.context.options.emailVerification?.expiresIn
      );
      const url = `${ctx.context.baseURL}/verify-email?token=${token}&callbackURL=${body.callbackURL || "/"}`;
      await ctx.context.options.emailVerification?.sendVerificationEmail?.(
        {
          user: createdUser,
          url,
          token
        },
        ctx.request
      );
    }
    if (ctx.context.options.emailAndPassword.autoSignIn === false || ctx.context.options.emailAndPassword.requireEmailVerification) {
      return ctx.json({
        token: null,
        user: {
          id: createdUser.id,
          email: createdUser.email,
          name: createdUser.name,
          image: createdUser.image,
          emailVerified: createdUser.emailVerified,
          createdAt: createdUser.createdAt,
          updatedAt: createdUser.updatedAt
        }
      });
    }
    const session = await ctx.context.internalAdapter.createSession(
      createdUser.id,
      ctx
    );
    if (!session) {
      throw new APIError("BAD_REQUEST", {
        message: BASE_ERROR_CODES.FAILED_TO_CREATE_SESSION
      });
    }
    await setSessionCookie(ctx, {
      session,
      user: createdUser
    });
    return ctx.json({
      token: session.token,
      user: {
        id: createdUser.id,
        email: createdUser.email,
        name: createdUser.name,
        image: createdUser.image,
        emailVerified: createdUser.emailVerified,
        createdAt: createdUser.createdAt,
        updatedAt: createdUser.updatedAt
      }
    });
  }
);

function shouldRateLimit(max, window, rateLimitData) {
  const now = Date.now();
  const windowInMs = window * 1e3;
  const timeSinceLastRequest = now - rateLimitData.lastRequest;
  return timeSinceLastRequest < windowInMs && rateLimitData.count >= max;
}
function rateLimitResponse(retryAfter) {
  return new Response(
    JSON.stringify({
      message: "Too many requests. Please try again later."
    }),
    {
      status: 429,
      statusText: "Too Many Requests",
      headers: {
        "X-Retry-After": retryAfter.toString()
      }
    }
  );
}
function getRetryAfter(lastRequest, window) {
  const now = Date.now();
  const windowInMs = window * 1e3;
  return Math.ceil((lastRequest + windowInMs - now) / 1e3);
}
function createDBStorage(ctx, modelName) {
  const model = ctx.options.rateLimit?.modelName || "rateLimit";
  const db = ctx.adapter;
  return {
    get: async (key) => {
      const res = await db.findMany({
        model,
        where: [{ field: "key", value: key }]
      });
      const data = res[0];
      if (typeof data?.lastRequest === "bigint") {
        data.lastRequest = Number(data.lastRequest);
      }
      return data;
    },
    set: async (key, value, _update) => {
      try {
        if (_update) {
          await db.updateMany({
            model: "rateLimit",
            where: [{ field: "key", value: key }],
            update: {
              count: value.count,
              lastRequest: value.lastRequest
            }
          });
        } else {
          await db.create({
            model: "rateLimit",
            data: {
              key,
              count: value.count,
              lastRequest: value.lastRequest
            }
          });
        }
      } catch (e) {
        ctx.logger.error("Error setting rate limit", e);
      }
    }
  };
}
const memory = /* @__PURE__ */ new Map();
function getRateLimitStorage(ctx) {
  if (ctx.options.rateLimit?.customStorage) {
    return ctx.options.rateLimit.customStorage;
  }
  if (ctx.rateLimit.storage === "secondary-storage") {
    return {
      get: async (key) => {
        const stringified = await ctx.options.secondaryStorage?.get(key);
        return stringified ? JSON.parse(stringified) : void 0;
      },
      set: async (key, value) => {
        await ctx.options.secondaryStorage?.set?.(key, JSON.stringify(value));
      }
    };
  }
  const storage = ctx.rateLimit.storage;
  if (storage === "memory") {
    return {
      async get(key) {
        return memory.get(key);
      },
      async set(key, value, _update) {
        memory.set(key, value);
      }
    };
  }
  return createDBStorage(ctx, ctx.rateLimit.modelName);
}
async function onRequestRateLimit(req, ctx) {
  if (!ctx.rateLimit.enabled) {
    return;
  }
  const path = new URL(req.url).pathname.replace(
    ctx.options.basePath || "/api/auth",
    ""
  );
  let window = ctx.rateLimit.window;
  let max = ctx.rateLimit.max;
  const ip = getIp(req, ctx.options);
  if (!ip) {
    return;
  }
  const key = ip + path;
  const specialRules = getDefaultSpecialRules();
  const specialRule = specialRules.find((rule) => rule.pathMatcher(path));
  if (specialRule) {
    window = specialRule.window;
    max = specialRule.max;
  }
  for (const plugin of ctx.options.plugins || []) {
    if (plugin.rateLimit) {
      const matchedRule = plugin.rateLimit.find(
        (rule) => rule.pathMatcher(path)
      );
      if (matchedRule) {
        window = matchedRule.window;
        max = matchedRule.max;
        break;
      }
    }
  }
  if (ctx.rateLimit.customRules) {
    const _path = Object.keys(ctx.rateLimit.customRules).find((p) => {
      if (p.includes("*")) {
        const isMatch = wildcardMatch(p)(path);
        return isMatch;
      }
      return p === path;
    });
    if (_path) {
      const customRule = ctx.rateLimit.customRules[_path];
      const resolved = typeof customRule === "function" ? await customRule(req) : customRule;
      if (resolved) {
        window = resolved.window;
        max = resolved.max;
      }
    }
  }
  const storage = getRateLimitStorage(ctx);
  const data = await storage.get(key);
  const now = Date.now();
  if (!data) {
    await storage.set(key, {
      key,
      count: 1,
      lastRequest: now
    });
  } else {
    const timeSinceLastRequest = now - data.lastRequest;
    if (shouldRateLimit(max, window, data)) {
      const retryAfter = getRetryAfter(data.lastRequest, window);
      return rateLimitResponse(retryAfter);
    } else if (timeSinceLastRequest > window * 1e3) {
      await storage.set(
        key,
        {
          ...data,
          count: 1,
          lastRequest: now
        },
        true
      );
    } else {
      await storage.set(
        key,
        {
          ...data,
          count: data.count + 1,
          lastRequest: now
        },
        true
      );
    }
  }
}
function getDefaultSpecialRules() {
  const specialRules = [
    {
      pathMatcher(path) {
        return path.startsWith("/sign-in") || path.startsWith("/sign-up") || path.startsWith("/change-password") || path.startsWith("/change-email");
      },
      window: 10,
      max: 3
    }
  ];
  return specialRules;
}

function toAuthEndpoints(endpoints, ctx) {
  const api = {};
  for (const [key, endpoint] of Object.entries(endpoints)) {
    api[key] = async (context) => {
      const authContext = await ctx;
      let internalContext = {
        ...context,
        context: {
          ...authContext,
          returned: void 0,
          responseHeaders: void 0,
          session: null
        },
        path: endpoint.path,
        headers: context?.headers ? new Headers(context?.headers) : void 0
      };
      const { beforeHooks, afterHooks } = getHooks(authContext);
      const before = await runBeforeHooks(internalContext, beforeHooks);
      if ("context" in before && before.context && typeof before.context === "object") {
        const { headers, ...rest } = before.context;
        if (headers) {
          headers.forEach((value, key2) => {
            internalContext.headers.set(key2, value);
          });
        }
        internalContext = defu(rest, internalContext);
      } else if (before) {
        return before;
      }
      internalContext.asResponse = false;
      internalContext.returnHeaders = true;
      const result = await endpoint(internalContext).catch((e) => {
        if (e instanceof APIError) {
          return {
            response: e,
            headers: e.headers ? new Headers(e.headers) : null
          };
        }
        throw e;
      });
      internalContext.context.returned = result.response;
      internalContext.context.responseHeaders = result.headers;
      const after = await runAfterHooks(internalContext, afterHooks);
      if (after.response) {
        result.response = after.response;
      }
      if (result.response instanceof APIError && !context?.asResponse) {
        throw result.response;
      }
      const response = context?.asResponse ? toResponse(result.response, {
        headers: result.headers
      }) : context?.returnHeaders ? {
        headers: result.headers,
        response: result.response
      } : result.response;
      return response;
    };
    api[key].path = endpoint.path;
    api[key].options = endpoint.options;
  }
  return api;
}
async function runBeforeHooks(context, hooks) {
  let modifiedContext = {};
  for (const hook of hooks) {
    if (hook.matcher(context)) {
      const result = await hook.handler({
        ...context,
        returnHeaders: false
      });
      if (result && typeof result === "object") {
        if ("context" in result && typeof result.context === "object") {
          const { headers, ...rest } = result.context;
          if (headers instanceof Headers) {
            if (modifiedContext.headers) {
              headers.forEach((value, key) => {
                modifiedContext.headers?.set(key, value);
              });
            } else {
              modifiedContext.headers = headers;
            }
          }
          modifiedContext = defu(rest, modifiedContext);
          continue;
        }
        return result;
      }
    }
  }
  return { context: modifiedContext };
}
async function runAfterHooks(context, hooks) {
  for (const hook of hooks) {
    if (hook.matcher(context)) {
      const result = await hook.handler(context).catch((e) => {
        if (e instanceof APIError) {
          return {
            response: e,
            headers: e.headers ? new Headers(e.headers) : null
          };
        }
        throw e;
      });
      if (result.headers) {
        result.headers.forEach((value, key) => {
          if (!context.context.responseHeaders) {
            context.context.responseHeaders = new Headers({
              [key]: value
            });
          } else {
            if (key.toLowerCase() === "set-cookie") {
              context.context.responseHeaders.append(key, value);
            } else {
              context.context.responseHeaders.set(key, value);
            }
          }
        });
      }
      if (result.response) {
        context.context.returned = result.response;
      }
    }
  }
  return {
    response: context.context.returned,
    headers: context.context.responseHeaders
  };
}
function getHooks(authContext) {
  const plugins = authContext.options.plugins || [];
  const beforeHooks = [];
  const afterHooks = [];
  if (authContext.options.hooks?.before) {
    beforeHooks.push({
      matcher: () => true,
      handler: authContext.options.hooks.before
    });
  }
  if (authContext.options.hooks?.after) {
    afterHooks.push({
      matcher: () => true,
      handler: authContext.options.hooks.after
    });
  }
  const pluginBeforeHooks = plugins.map((plugin) => {
    if (plugin.hooks?.before) {
      return plugin.hooks.before;
    }
  }).filter((plugin) => plugin !== void 0).flat();
  const pluginAfterHooks = plugins.map((plugin) => {
    if (plugin.hooks?.after) {
      return plugin.hooks.after;
    }
  }).filter((plugin) => plugin !== void 0).flat();
  pluginBeforeHooks.length && beforeHooks.push(...pluginBeforeHooks);
  pluginAfterHooks.length && afterHooks.push(...pluginAfterHooks);
  return {
    beforeHooks,
    afterHooks
  };
}

function getEndpoints(ctx, options) {
  const pluginEndpoints = options.plugins?.reduce(
    (acc, plugin) => {
      return {
        ...acc,
        ...plugin.endpoints
      };
    },
    {}
  );
  const middlewares = options.plugins?.map(
    (plugin) => plugin.middlewares?.map((m) => {
      const middleware = async (context) => {
        return m.middleware({
          ...context,
          context: {
            ...ctx,
            ...context.context
          }
        });
      };
      middleware.options = m.middleware.options;
      return {
        path: m.path,
        middleware
      };
    })
  ).filter((plugin) => plugin !== void 0).flat() || [];
  const baseEndpoints = {
    signInSocial,
    callbackOAuth,
    getSession: getSession(),
    signOut,
    signUpEmail: signUpEmail(),
    signInEmail,
    forgetPassword,
    resetPassword,
    verifyEmail,
    sendVerificationEmail,
    changeEmail,
    changePassword,
    setPassword,
    updateUser: updateUser(),
    deleteUser,
    forgetPasswordCallback,
    requestPasswordReset,
    requestPasswordResetCallback,
    listSessions: listSessions(),
    revokeSession,
    revokeSessions,
    revokeOtherSessions,
    linkSocialAccount,
    listUserAccounts,
    deleteUserCallback,
    unlinkAccount,
    refreshToken,
    getAccessToken,
    accountInfo
  };
  const endpoints = {
    ...baseEndpoints,
    ...pluginEndpoints,
    ok,
    error
  };
  const api = toAuthEndpoints(endpoints, ctx);
  return {
    api,
    middlewares
  };
}
const router = (ctx, options) => {
  const { api, middlewares } = getEndpoints(ctx, options);
  const basePath = new URL(ctx.baseURL).pathname;
  return createRouter(api, {
    routerContext: ctx,
    openapi: {
      disabled: true
    },
    basePath,
    routerMiddleware: [
      {
        path: "/**",
        middleware: originCheckMiddleware
      },
      ...middlewares
    ],
    async onRequest(req) {
      const disabledPaths = ctx.options.disabledPaths || [];
      const path = new URL(req.url).pathname.replace(basePath, "");
      if (disabledPaths.includes(path)) {
        return new Response("Not Found", { status: 404 });
      }
      for (const plugin of ctx.options.plugins || []) {
        if (plugin.onRequest) {
          const response = await plugin.onRequest(req, ctx);
          if (response && "response" in response) {
            return response.response;
          }
        }
      }
      return onRequestRateLimit(req, ctx);
    },
    async onResponse(res) {
      for (const plugin of ctx.options.plugins || []) {
        if (plugin.onResponse) {
          const response = await plugin.onResponse(res, ctx);
          if (response) {
            return response.response;
          }
        }
      }
      return res;
    },
    onError(e) {
      if (e instanceof APIError && e.status === "FOUND") {
        return;
      }
      if (options.onAPIError?.throw) {
        throw e;
      }
      if (options.onAPIError?.onError) {
        options.onAPIError.onError(e, ctx);
        return;
      }
      const optLogLevel = options.logger?.level;
      const log = optLogLevel === "error" || optLogLevel === "warn" || optLogLevel === "debug" ? logger : void 0;
      if (options.logger?.disabled !== true) {
        if (e && typeof e === "object" && "message" in e && typeof e.message === "string") {
          if (e.message.includes("no column") || e.message.includes("column") || e.message.includes("relation") || e.message.includes("table") || e.message.includes("does not exist")) {
            ctx.logger?.error(e.message);
            return;
          }
        }
        if (e instanceof APIError) {
          if (e.status === "INTERNAL_SERVER_ERROR") {
            ctx.logger.error(e.status, e);
          }
          log?.error(e.message);
        } else {
          ctx.logger?.error(
            e && typeof e === "object" && "name" in e ? e.name : "",
            e
          );
        }
      }
    }
  });
};

export { accountInfo, callbackOAuth, changeEmail, changePassword, createAuthEndpoint, createEmailVerificationToken, deleteUser, deleteUserCallback, error, forgetPassword, forgetPasswordCallback, getAccessToken, getEndpoints, getSession, linkSocialAccount, listSessions, listUserAccounts, ok, originCheckMiddleware, refreshToken, requestPasswordReset, requestPasswordResetCallback, resetPassword, revokeOtherSessions, revokeSession, revokeSessions, router, sendVerificationEmail, setPassword, signInEmail, signInSocial, signOut, signUpEmail, unlinkAccount, updateUser, verifyEmail };
