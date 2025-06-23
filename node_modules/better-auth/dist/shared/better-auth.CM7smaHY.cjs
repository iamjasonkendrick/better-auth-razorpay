'use strict';

const zod = require('zod');
const cookies_index = require('../cookies/index.cjs');
const betterCall = require('better-call');
require('@better-auth/utils/random');
const state = require('./better-auth.CWJ7qc0w.cjs');
const logger = require('./better-auth.GpOOav9x.cjs');
const socialProviders_index = require('../social-providers/index.cjs');
const json = require('./better-auth.D3mtHEZg.cjs');
const date = require('./better-auth.C1hdVENX.cjs');
const id = require('./better-auth.Bg6iw3ig.cjs');
require('@better-auth/utils/hash');
require('@noble/ciphers/chacha');
require('@noble/ciphers/utils');
require('@noble/ciphers/webcrypto');
const base64 = require('@better-auth/utils/base64');
const jose = require('jose');
require('@noble/hashes/scrypt');
require('@better-auth/utils');
require('@better-auth/utils/hex');
require('@noble/hashes/utils');
const random = require('./better-auth.CYeOI8C-.cjs');
const schema$1 = require('./better-auth.DcWKCjjf.cjs');
const env = require('./better-auth.DiSjtgs9.cjs');
const hmac = require('@better-auth/utils/hmac');
const binary = require('@better-auth/utils/binary');
require('@better-fetch/fetch');
require('defu');
const jwt = require('./better-auth.BMYo0QR-.cjs');
const url = require('./better-auth.C-R0J0n1.cjs');
const errors = require('jose/errors');

const optionsMiddleware = betterCall.createMiddleware(async () => {
  return {};
});
const createAuthMiddleware = betterCall.createMiddleware.create({
  use: [
    optionsMiddleware,
    /**
     * Only use for post hooks
     */
    betterCall.createMiddleware(async () => {
      return {};
    })
  ]
});
const createAuthEndpoint = betterCall.createEndpoint.create({
  use: [optionsMiddleware]
});

function escapeRegExpChar(char) {
  if (char === "-" || char === "^" || char === "$" || char === "+" || char === "." || char === "(" || char === ")" || char === "|" || char === "[" || char === "]" || char === "{" || char === "}" || char === "*" || char === "?" || char === "\\") {
    return `\\${char}`;
  } else {
    return char;
  }
}
function escapeRegExpString(str) {
  let result = "";
  for (let i = 0; i < str.length; i++) {
    result += escapeRegExpChar(str[i]);
  }
  return result;
}
function transform(pattern, separator = true) {
  if (Array.isArray(pattern)) {
    let regExpPatterns = pattern.map((p) => `^${transform(p, separator)}$`);
    return `(?:${regExpPatterns.join("|")})`;
  }
  let separatorSplitter = "";
  let separatorMatcher = "";
  let wildcard = ".";
  if (separator === true) {
    separatorSplitter = "/";
    separatorMatcher = "[/\\\\]";
    wildcard = "[^/\\\\]";
  } else if (separator) {
    separatorSplitter = separator;
    separatorMatcher = escapeRegExpString(separatorSplitter);
    if (separatorMatcher.length > 1) {
      separatorMatcher = `(?:${separatorMatcher})`;
      wildcard = `((?!${separatorMatcher}).)`;
    } else {
      wildcard = `[^${separatorMatcher}]`;
    }
  }
  let requiredSeparator = separator ? `${separatorMatcher}+?` : "";
  let optionalSeparator = separator ? `${separatorMatcher}*?` : "";
  let segments = separator ? pattern.split(separatorSplitter) : [pattern];
  let result = "";
  for (let s = 0; s < segments.length; s++) {
    let segment = segments[s];
    let nextSegment = segments[s + 1];
    let currentSeparator = "";
    if (!segment && s > 0) {
      continue;
    }
    if (separator) {
      if (s === segments.length - 1) {
        currentSeparator = optionalSeparator;
      } else if (nextSegment !== "**") {
        currentSeparator = requiredSeparator;
      } else {
        currentSeparator = "";
      }
    }
    if (separator && segment === "**") {
      if (currentSeparator) {
        result += s === 0 ? "" : currentSeparator;
        result += `(?:${wildcard}*?${currentSeparator})*?`;
      }
      continue;
    }
    for (let c = 0; c < segment.length; c++) {
      let char = segment[c];
      if (char === "\\") {
        if (c < segment.length - 1) {
          result += escapeRegExpChar(segment[c + 1]);
          c++;
        }
      } else if (char === "?") {
        result += wildcard;
      } else if (char === "*") {
        result += `${wildcard}*?`;
      } else {
        result += escapeRegExpChar(char);
      }
    }
    result += currentSeparator;
  }
  return result;
}
function isMatch(regexp, sample) {
  if (typeof sample !== "string") {
    throw new TypeError(`Sample must be a string, but ${typeof sample} given`);
  }
  return regexp.test(sample);
}
function wildcardMatch(pattern, options) {
  if (typeof pattern !== "string" && !Array.isArray(pattern)) {
    throw new TypeError(
      `The first argument must be a single pattern string or an array of patterns, but ${typeof pattern} given`
    );
  }
  if (typeof options === "string" || typeof options === "boolean") {
    options = { separator: options };
  }
  if (arguments.length === 2 && !(typeof options === "undefined" || typeof options === "object" && options !== null && !Array.isArray(options))) {
    throw new TypeError(
      `The second argument must be an options object or a string/boolean separator, but ${typeof options} given`
    );
  }
  options = options || {};
  if (options.separator === "\\") {
    throw new Error(
      "\\ is not a valid separator because it is used for escaping. Try setting the separator to `true` instead"
    );
  }
  let regexpPattern = transform(pattern, options.separator);
  let regexp = new RegExp(`^${regexpPattern}$`, options.flags);
  let fn = isMatch.bind(null, regexp);
  fn.options = options;
  fn.pattern = pattern;
  fn.regexp = regexp;
  return fn;
}

const originCheckMiddleware = createAuthMiddleware(async (ctx) => {
  if (ctx.request?.method !== "POST" || !ctx.request) {
    return;
  }
  const { body, query, context } = ctx;
  const originHeader = ctx.headers?.get("origin") || ctx.headers?.get("referer") || "";
  const callbackURL = body?.callbackURL || query?.callbackURL;
  const redirectURL = body?.redirectTo;
  const errorCallbackURL = body?.errorCallbackURL;
  const newUserCallbackURL = body?.newUserCallbackURL;
  const trustedOrigins = Array.isArray(context.options.trustedOrigins) ? context.trustedOrigins : [
    ...context.trustedOrigins,
    ...await context.options.trustedOrigins?.(ctx.request) || []
  ];
  const usesCookies = ctx.headers?.has("cookie");
  const matchesPattern = (url$1, pattern) => {
    if (url$1.startsWith("/")) {
      return false;
    }
    if (pattern.includes("*")) {
      return wildcardMatch(pattern)(url.getHost(url$1));
    }
    const protocol = url.getProtocol(url$1);
    return protocol === "http:" || protocol === "https:" || !protocol ? pattern === url.getOrigin(url$1) : url$1.startsWith(pattern);
  };
  const validateURL = (url, label) => {
    if (!url) {
      return;
    }
    const isTrustedOrigin = trustedOrigins.some(
      (origin) => matchesPattern(url, origin) || url?.startsWith("/") && label !== "origin" && /^\/(?!\/|\\|%2f|%5c)[\w\-.\+/@]*(?:\?[\w\-.\+/=&%@]*)?$/.test(url)
    );
    if (!isTrustedOrigin) {
      ctx.context.logger.error(`Invalid ${label}: ${url}`);
      ctx.context.logger.info(
        `If it's a valid URL, please add ${url} to trustedOrigins in your auth config
`,
        `Current list of trustedOrigins: ${trustedOrigins}`
      );
      throw new betterCall.APIError("FORBIDDEN", { message: `Invalid ${label}` });
    }
  };
  if (usesCookies && !ctx.context.options.advanced?.disableCSRFCheck) {
    validateURL(originHeader, "origin");
  }
  callbackURL && validateURL(callbackURL, "callbackURL");
  redirectURL && validateURL(redirectURL, "redirectURL");
  errorCallbackURL && validateURL(errorCallbackURL, "errorCallbackURL");
  newUserCallbackURL && validateURL(newUserCallbackURL, "newUserCallbackURL");
});
const originCheck = (getValue) => createAuthMiddleware(async (ctx) => {
  if (!ctx.request) {
    return;
  }
  const { context } = ctx;
  const callbackURL = getValue(ctx);
  const trustedOrigins = Array.isArray(
    context.options.trustedOrigins
  ) ? context.trustedOrigins : [
    ...context.trustedOrigins,
    ...await context.options.trustedOrigins?.(ctx.request) || []
  ];
  const matchesPattern = (url$1, pattern) => {
    if (url$1.startsWith("/")) {
      return false;
    }
    if (pattern.includes("*")) {
      return wildcardMatch(pattern)(url.getHost(url$1));
    }
    return url$1.startsWith(pattern);
  };
  const validateURL = (url, label) => {
    if (!url) {
      return;
    }
    const isTrustedOrigin = trustedOrigins.some(
      (origin) => matchesPattern(url, origin) || url?.startsWith("/") && label !== "origin" && /^\/(?!\/|\\|%2f|%5c)[\w\-.\+/@]*(?:\?[\w\-.\+/=&%@]*)?$/.test(
        url
      )
    );
    if (!isTrustedOrigin) {
      ctx.context.logger.error(`Invalid ${label}: ${url}`);
      ctx.context.logger.info(
        `If it's a valid URL, please add ${url} to trustedOrigins in your auth config
`,
        `Current list of trustedOrigins: ${trustedOrigins}`
      );
      throw new betterCall.APIError("FORBIDDEN", { message: `Invalid ${label}` });
    }
  };
  const callbacks = Array.isArray(callbackURL) ? callbackURL : [callbackURL];
  for (const url of callbacks) {
    validateURL(url, "callbackURL");
  }
});

const BASE_ERROR_CODES = {
  USER_NOT_FOUND: "User not found",
  FAILED_TO_CREATE_USER: "Failed to create user",
  FAILED_TO_CREATE_SESSION: "Failed to create session",
  FAILED_TO_UPDATE_USER: "Failed to update user",
  FAILED_TO_GET_SESSION: "Failed to get session",
  INVALID_PASSWORD: "Invalid password",
  INVALID_EMAIL: "Invalid email",
  INVALID_EMAIL_OR_PASSWORD: "Invalid email or password",
  SOCIAL_ACCOUNT_ALREADY_LINKED: "Social account already linked",
  PROVIDER_NOT_FOUND: "Provider not found",
  INVALID_TOKEN: "invalid token",
  ID_TOKEN_NOT_SUPPORTED: "id_token not supported",
  FAILED_TO_GET_USER_INFO: "Failed to get user info",
  USER_EMAIL_NOT_FOUND: "User email not found",
  EMAIL_NOT_VERIFIED: "Email not verified",
  PASSWORD_TOO_SHORT: "Password too short",
  PASSWORD_TOO_LONG: "Password too long",
  USER_ALREADY_EXISTS: "User already exists",
  EMAIL_CAN_NOT_BE_UPDATED: "Email can not be updated",
  CREDENTIAL_ACCOUNT_NOT_FOUND: "Credential account not found",
  SESSION_EXPIRED: "Session expired. Re-authenticate to perform this action.",
  FAILED_TO_UNLINK_LAST_ACCOUNT: "You can't unlink your last account",
  ACCOUNT_NOT_FOUND: "Account not found",
  USER_ALREADY_HAS_PASSWORD: "User already has a password. Provide that to delete the account."
};

const getSession = () => createAuthEndpoint(
  "/get-session",
  {
    method: "GET",
    query: zod.z.optional(
      zod.z.object({
        /**
         * If cookie cache is enabled, it will disable the cache
         * and fetch the session from the database
         */
        disableCookieCache: zod.z.optional(
          zod.z.boolean({
            description: "Disable cookie cache and fetch session from database"
          }).or(zod.z.string().transform((v) => v === "true"))
        ).optional(),
        disableRefresh: zod.z.boolean({
          description: "Disable session refresh. Useful for checking session status, without updating the session"
        }).or(zod.z.string().transform((v) => v === "true")).optional()
      })
    ),
    requireHeaders: true,
    metadata: {
      openapi: {
        description: "Get the current session",
        responses: {
          "200": {
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
                  },
                  required: ["session", "user"]
                }
              }
            }
          }
        }
      }
    }
  },
  async (ctx) => {
    try {
      const sessionCookieToken = await ctx.getSignedCookie(
        ctx.context.authCookies.sessionToken.name,
        ctx.context.secret
      );
      if (!sessionCookieToken) {
        return null;
      }
      const sessionDataCookie = ctx.getCookie(
        ctx.context.authCookies.sessionData.name
      );
      const sessionDataPayload = sessionDataCookie ? json.safeJSONParse(binary.binary.decode(base64.base64.decode(sessionDataCookie))) : null;
      if (sessionDataPayload) {
        const isValid = await hmac.createHMAC("SHA-256", "base64urlnopad").verify(
          ctx.context.secret,
          JSON.stringify({
            ...sessionDataPayload.session,
            expiresAt: sessionDataPayload.expiresAt
          }),
          sessionDataPayload.signature
        );
        if (!isValid) {
          const dataCookie = ctx.context.authCookies.sessionData.name;
          ctx.setCookie(dataCookie, "", {
            maxAge: 0
          });
          return ctx.json(null);
        }
      }
      const dontRememberMe = await ctx.getSignedCookie(
        ctx.context.authCookies.dontRememberToken.name,
        ctx.context.secret
      );
      if (sessionDataPayload?.session && ctx.context.options.session?.cookieCache?.enabled && !ctx.query?.disableCookieCache) {
        const session2 = sessionDataPayload.session;
        const hasExpired = sessionDataPayload.expiresAt < Date.now() || session2.session.expiresAt < /* @__PURE__ */ new Date();
        if (!hasExpired) {
          return ctx.json(
            session2
          );
        } else {
          const dataCookie = ctx.context.authCookies.sessionData.name;
          ctx.setCookie(dataCookie, "", {
            maxAge: 0
          });
        }
      }
      const session = await ctx.context.internalAdapter.findSession(sessionCookieToken);
      ctx.context.session = session;
      if (!session || session.session.expiresAt < /* @__PURE__ */ new Date()) {
        cookies_index.deleteSessionCookie(ctx);
        if (session) {
          await ctx.context.internalAdapter.deleteSession(
            session.session.token
          );
        }
        return ctx.json(null);
      }
      if (dontRememberMe || ctx.query?.disableRefresh) {
        return ctx.json(
          session
        );
      }
      const expiresIn = ctx.context.sessionConfig.expiresIn;
      const updateAge = ctx.context.sessionConfig.updateAge;
      const sessionIsDueToBeUpdatedDate = session.session.expiresAt.valueOf() - expiresIn * 1e3 + updateAge * 1e3;
      const shouldBeUpdated = sessionIsDueToBeUpdatedDate <= Date.now();
      if (shouldBeUpdated && (!ctx.query?.disableRefresh || !ctx.context.options.session?.disableSessionRefresh)) {
        const updatedSession = await ctx.context.internalAdapter.updateSession(
          session.session.token,
          {
            expiresAt: date.getDate(ctx.context.sessionConfig.expiresIn, "sec"),
            updatedAt: /* @__PURE__ */ new Date()
          }
        );
        if (!updatedSession) {
          cookies_index.deleteSessionCookie(ctx);
          return ctx.json(null, { status: 401 });
        }
        const maxAge = (updatedSession.expiresAt.valueOf() - Date.now()) / 1e3;
        await cookies_index.setSessionCookie(
          ctx,
          {
            session: updatedSession,
            user: session.user
          },
          false,
          {
            maxAge
          }
        );
        return ctx.json({
          session: updatedSession,
          user: session.user
        });
      }
      await cookies_index.setCookieCache(ctx, session);
      return ctx.json(
        session
      );
    } catch (error) {
      ctx.context.logger.error("INTERNAL_SERVER_ERROR", error);
      throw new betterCall.APIError("INTERNAL_SERVER_ERROR", {
        message: BASE_ERROR_CODES.FAILED_TO_GET_SESSION
      });
    }
  }
);
const getSessionFromCtx = async (ctx, config) => {
  if (ctx.context.session) {
    return ctx.context.session;
  }
  const session = await getSession()({
    ...ctx,
    asResponse: false,
    headers: ctx.headers,
    returnHeaders: false,
    query: {
      ...config,
      ...ctx.query
    }
  }).catch((e) => {
    return null;
  });
  ctx.context.session = session;
  return session;
};
const sessionMiddleware = createAuthMiddleware(async (ctx) => {
  const session = await getSessionFromCtx(ctx);
  if (!session?.session) {
    throw new betterCall.APIError("UNAUTHORIZED");
  }
  return {
    session
  };
});
const requestOnlySessionMiddleware = createAuthMiddleware(
  async (ctx) => {
    const session = await getSessionFromCtx(ctx);
    if (!session?.session && (ctx.request || ctx.headers)) {
      throw new betterCall.APIError("UNAUTHORIZED");
    }
    return { session };
  }
);
const freshSessionMiddleware = createAuthMiddleware(async (ctx) => {
  const session = await getSessionFromCtx(ctx);
  if (!session?.session) {
    throw new betterCall.APIError("UNAUTHORIZED");
  }
  if (ctx.context.sessionConfig.freshAge === 0) {
    return {
      session
    };
  }
  const freshAge = ctx.context.sessionConfig.freshAge;
  const lastUpdated = session.session.updatedAt?.valueOf() || session.session.createdAt.valueOf();
  const now = Date.now();
  const isFresh = now - lastUpdated < freshAge * 1e3;
  if (!isFresh) {
    throw new betterCall.APIError("FORBIDDEN", {
      message: "Session is not fresh"
    });
  }
  return {
    session
  };
});
const listSessions = () => createAuthEndpoint(
  "/list-sessions",
  {
    method: "GET",
    use: [sessionMiddleware],
    requireHeaders: true,
    metadata: {
      openapi: {
        description: "List all active sessions for the user",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/Session"
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
    try {
      const sessions = await ctx.context.internalAdapter.listSessions(
        ctx.context.session.user.id
      );
      const activeSessions = sessions.filter((session) => {
        return session.expiresAt > /* @__PURE__ */ new Date();
      });
      return ctx.json(
        activeSessions
      );
    } catch (e) {
      ctx.context.logger.error(e);
      throw ctx.error("INTERNAL_SERVER_ERROR");
    }
  }
);
const revokeSession = createAuthEndpoint(
  "/revoke-session",
  {
    method: "POST",
    body: zod.z.object({
      token: zod.z.string({
        description: "The token to revoke"
      })
    }),
    use: [sessionMiddleware],
    requireHeaders: true,
    metadata: {
      openapi: {
        description: "Revoke a single session",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  token: {
                    type: "string",
                    description: "The token to revoke"
                  }
                },
                required: ["token"]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: {
                      type: "boolean",
                      description: "Indicates if the session was revoked successfully"
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
    const token = ctx.body.token;
    const findSession = await ctx.context.internalAdapter.findSession(token);
    if (!findSession) {
      throw new betterCall.APIError("BAD_REQUEST", {
        message: "Session not found"
      });
    }
    if (findSession.session.userId !== ctx.context.session.user.id) {
      throw new betterCall.APIError("UNAUTHORIZED");
    }
    try {
      await ctx.context.internalAdapter.deleteSession(token);
    } catch (error) {
      ctx.context.logger.error(
        error && typeof error === "object" && "name" in error ? error.name : "",
        error
      );
      throw new betterCall.APIError("INTERNAL_SERVER_ERROR");
    }
    return ctx.json({
      status: true
    });
  }
);
const revokeSessions = createAuthEndpoint(
  "/revoke-sessions",
  {
    method: "POST",
    use: [sessionMiddleware],
    requireHeaders: true,
    metadata: {
      openapi: {
        description: "Revoke all sessions for the user",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: {
                      type: "boolean",
                      description: "Indicates if all sessions were revoked successfully"
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
    try {
      await ctx.context.internalAdapter.deleteSessions(
        ctx.context.session.user.id
      );
    } catch (error) {
      ctx.context.logger.error(
        error && typeof error === "object" && "name" in error ? error.name : "",
        error
      );
      throw new betterCall.APIError("INTERNAL_SERVER_ERROR");
    }
    return ctx.json({
      status: true
    });
  }
);
const revokeOtherSessions = createAuthEndpoint(
  "/revoke-other-sessions",
  {
    method: "POST",
    requireHeaders: true,
    use: [sessionMiddleware],
    metadata: {
      openapi: {
        description: "Revoke all other sessions for the user except the current one",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: {
                      type: "boolean",
                      description: "Indicates if all other sessions were revoked successfully"
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
    const session = ctx.context.session;
    if (!session.user) {
      throw new betterCall.APIError("UNAUTHORIZED");
    }
    const sessions = await ctx.context.internalAdapter.listSessions(
      session.user.id
    );
    const activeSessions = sessions.filter((session2) => {
      return session2.expiresAt > /* @__PURE__ */ new Date();
    });
    const otherSessions = activeSessions.filter(
      (session2) => session2.token !== ctx.context.session.session.token
    );
    await Promise.all(
      otherSessions.map(
        (session2) => ctx.context.internalAdapter.deleteSession(session2.token)
      )
    );
    return ctx.json({
      status: true
    });
  }
);

async function createEmailVerificationToken(secret, email, updateTo, expiresIn = 3600) {
  const token = await jwt.signJWT(
    {
      email: email.toLowerCase(),
      updateTo
    },
    secret,
    expiresIn
  );
  return token;
}
async function sendVerificationEmailFn(ctx, user) {
  if (!ctx.context.options.emailVerification?.sendVerificationEmail) {
    ctx.context.logger.error("Verification email isn't enabled.");
    throw new betterCall.APIError("BAD_REQUEST", {
      message: "Verification email isn't enabled"
    });
  }
  const token = await createEmailVerificationToken(
    ctx.context.secret,
    user.email,
    void 0,
    ctx.context.options.emailVerification?.expiresIn
  );
  const url = `${ctx.context.baseURL}/verify-email?token=${token}&callbackURL=${ctx.body.callbackURL || "/"}`;
  await ctx.context.options.emailVerification.sendVerificationEmail(
    {
      user,
      url,
      token
    },
    ctx.request
  );
}
const sendVerificationEmail = createAuthEndpoint(
  "/send-verification-email",
  {
    method: "POST",
    body: zod.z.object({
      email: zod.z.string({
        description: "The email to send the verification email to"
      }).email(),
      callbackURL: zod.z.string({
        description: "The URL to use for email verification callback"
      }).optional()
    }),
    metadata: {
      openapi: {
        description: "Send a verification email to the user",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: {
                    type: "string",
                    description: "The email to send the verification email to",
                    example: "user@example.com"
                  },
                  callbackURL: {
                    type: "string",
                    description: "The URL to use for email verification callback",
                    example: "https://example.com/callback",
                    nullable: true
                  }
                },
                required: ["email"]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: {
                      type: "boolean",
                      description: "Indicates if the email was sent successfully",
                      example: true
                    }
                  }
                }
              }
            }
          },
          "400": {
            description: "Bad Request",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      description: "Error message",
                      example: "Verification email isn't enabled"
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
    if (!ctx.context.options.emailVerification?.sendVerificationEmail) {
      ctx.context.logger.error("Verification email isn't enabled.");
      throw new betterCall.APIError("BAD_REQUEST", {
        message: "Verification email isn't enabled"
      });
    }
    const { email } = ctx.body;
    const user = await ctx.context.internalAdapter.findUserByEmail(email);
    if (!user) {
      throw new betterCall.APIError("BAD_REQUEST", {
        message: BASE_ERROR_CODES.USER_NOT_FOUND
      });
    }
    await sendVerificationEmailFn(ctx, user.user);
    return ctx.json({
      status: true
    });
  }
);
const verifyEmail = createAuthEndpoint(
  "/verify-email",
  {
    method: "GET",
    query: zod.z.object({
      token: zod.z.string({
        description: "The token to verify the email"
      }),
      callbackURL: zod.z.string({
        description: "The URL to redirect to after email verification"
      }).optional()
    }),
    use: [originCheck((ctx) => ctx.query.callbackURL)],
    metadata: {
      openapi: {
        description: "Verify the email of the user",
        parameters: [
          {
            name: "token",
            in: "query",
            description: "The token to verify the email",
            required: true,
            schema: {
              type: "string"
            }
          },
          {
            name: "callbackURL",
            in: "query",
            description: "The URL to redirect to after email verification",
            required: false,
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: {
                      type: "object",
                      properties: {
                        id: {
                          type: "string",
                          description: "User ID"
                        },
                        email: {
                          type: "string",
                          description: "User email"
                        },
                        name: {
                          type: "string",
                          description: "User name"
                        },
                        image: {
                          type: "string",
                          description: "User image URL"
                        },
                        emailVerified: {
                          type: "boolean",
                          description: "Indicates if the user email is verified"
                        },
                        createdAt: {
                          type: "string",
                          description: "User creation date"
                        },
                        updatedAt: {
                          type: "string",
                          description: "User update date"
                        }
                      },
                      required: [
                        "id",
                        "email",
                        "name",
                        "image",
                        "emailVerified",
                        "createdAt",
                        "updatedAt"
                      ]
                    },
                    status: {
                      type: "boolean",
                      description: "Indicates if the email was verified successfully"
                    }
                  },
                  required: ["user", "status"]
                }
              }
            }
          }
        }
      }
    }
  },
  async (ctx) => {
    function redirectOnError(error) {
      if (ctx.query.callbackURL) {
        if (ctx.query.callbackURL.includes("?")) {
          throw ctx.redirect(`${ctx.query.callbackURL}&error=${error}`);
        }
        throw ctx.redirect(`${ctx.query.callbackURL}?error=${error}`);
      }
      throw new betterCall.APIError("UNAUTHORIZED", {
        message: error
      });
    }
    const { token } = ctx.query;
    let jwt;
    try {
      jwt = await jose.jwtVerify(
        token,
        new TextEncoder().encode(ctx.context.secret),
        {
          algorithms: ["HS256"]
        }
      );
    } catch (e) {
      if (e instanceof errors.JWTExpired) {
        return redirectOnError("token_expired");
      }
      return redirectOnError("invalid_token");
    }
    const schema = zod.z.object({
      email: zod.z.string().email(),
      updateTo: zod.z.string().optional()
    });
    const parsed = schema.parse(jwt.payload);
    const user = await ctx.context.internalAdapter.findUserByEmail(
      parsed.email
    );
    if (!user) {
      return redirectOnError("user_not_found");
    }
    if (parsed.updateTo) {
      const session = await getSessionFromCtx(ctx);
      if (!session) {
        if (ctx.query.callbackURL) {
          throw ctx.redirect(`${ctx.query.callbackURL}?error=unauthorized`);
        }
        return redirectOnError("unauthorized");
      }
      if (session.user.email !== parsed.email) {
        if (ctx.query.callbackURL) {
          throw ctx.redirect(`${ctx.query.callbackURL}?error=unauthorized`);
        }
        return redirectOnError("unauthorized");
      }
      const updatedUser = await ctx.context.internalAdapter.updateUserByEmail(
        parsed.email,
        {
          email: parsed.updateTo,
          emailVerified: false
        },
        ctx
      );
      const newToken = await createEmailVerificationToken(
        ctx.context.secret,
        parsed.updateTo
      );
      await ctx.context.options.emailVerification?.sendVerificationEmail?.(
        {
          user: updatedUser,
          url: `${ctx.context.baseURL}/verify-email?token=${newToken}&callbackURL=${ctx.query.callbackURL || "/"}`,
          token: newToken
        },
        ctx.request
      );
      await cookies_index.setSessionCookie(ctx, {
        session: session.session,
        user: {
          ...session.user,
          email: parsed.updateTo,
          emailVerified: false
        }
      });
      if (ctx.query.callbackURL) {
        throw ctx.redirect(ctx.query.callbackURL);
      }
      return ctx.json({
        status: true,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          image: updatedUser.image,
          emailVerified: updatedUser.emailVerified,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt
        }
      });
    }
    await ctx.context.options.emailVerification?.onEmailVerification?.(
      user.user,
      ctx.request
    );
    await ctx.context.internalAdapter.updateUserByEmail(
      parsed.email,
      {
        emailVerified: true
      },
      ctx
    );
    if (ctx.context.options.emailVerification?.autoSignInAfterVerification) {
      const currentSession = await getSessionFromCtx(ctx);
      if (!currentSession || currentSession.user.email !== parsed.email) {
        const session = await ctx.context.internalAdapter.createSession(
          user.user.id,
          ctx
        );
        if (!session) {
          throw new betterCall.APIError("INTERNAL_SERVER_ERROR", {
            message: "Failed to create session"
          });
        }
        await cookies_index.setSessionCookie(ctx, {
          session,
          user: {
            ...user.user,
            emailVerified: true
          }
        });
      } else {
        await cookies_index.setSessionCookie(ctx, {
          session: currentSession.session,
          user: {
            ...currentSession.user,
            emailVerified: true
          }
        });
      }
    }
    if (ctx.query.callbackURL) {
      throw ctx.redirect(ctx.query.callbackURL);
    }
    return ctx.json({
      status: true,
      user: null
    });
  }
);

const HIDE_METADATA = {
  isAction: false
};

async function handleOAuthUserInfo(c, {
  userInfo,
  account,
  callbackURL,
  disableSignUp,
  overrideUserInfo
}) {
  const dbUser = await c.context.internalAdapter.findOAuthUser(
    userInfo.email.toLowerCase(),
    account.accountId,
    account.providerId
  ).catch((e) => {
    logger.logger.error(
      "Better auth was unable to query your database.\nError: ",
      e
    );
    throw c.redirect(
      `${c.context.baseURL}/error?error=internal_server_error`
    );
  });
  let user = dbUser?.user;
  let isRegister = !user;
  if (dbUser) {
    const hasBeenLinked = dbUser.accounts.find(
      (a) => a.providerId === account.providerId
    );
    if (!hasBeenLinked) {
      const trustedProviders = c.context.options.account?.accountLinking?.trustedProviders;
      const isTrustedProvider = trustedProviders?.includes(
        account.providerId
      );
      if (!isTrustedProvider && !userInfo.emailVerified || c.context.options.account?.accountLinking?.enabled === false) {
        if (env.isDevelopment) {
          logger.logger.warn(
            `User already exist but account isn't linked to ${account.providerId}. To read more about how account linking works in Better Auth see https://www.better-auth.com/docs/concepts/users-accounts#account-linking.`
          );
        }
        return {
          error: "account not linked",
          data: null
        };
      }
      try {
        await c.context.internalAdapter.linkAccount(
          {
            providerId: account.providerId,
            accountId: userInfo.id.toString(),
            userId: dbUser.user.id,
            accessToken: account.accessToken,
            idToken: account.idToken,
            refreshToken: account.refreshToken,
            accessTokenExpiresAt: account.accessTokenExpiresAt,
            refreshTokenExpiresAt: account.refreshTokenExpiresAt,
            scope: account.scope
          },
          c
        );
      } catch (e) {
        logger.logger.error("Unable to link account", e);
        return {
          error: "unable to link account",
          data: null
        };
      }
    } else {
      if (c.context.options.account?.updateAccountOnSignIn !== false) {
        const updateData = Object.fromEntries(
          Object.entries({
            accessToken: account.accessToken,
            idToken: account.idToken,
            refreshToken: account.refreshToken,
            accessTokenExpiresAt: account.accessTokenExpiresAt,
            refreshTokenExpiresAt: account.refreshTokenExpiresAt,
            scope: account.scope
          }).filter(([_, value]) => value !== void 0)
        );
        if (Object.keys(updateData).length > 0) {
          await c.context.internalAdapter.updateAccount(
            hasBeenLinked.id,
            updateData,
            c
          );
        }
      }
    }
    if (overrideUserInfo) {
      const { id: _, ...restUserInfo } = userInfo;
      await c.context.internalAdapter.updateUser(dbUser.user.id, {
        ...restUserInfo,
        email: userInfo.email.toLowerCase(),
        emailVerified: userInfo.email.toLowerCase() === dbUser.user.email ? dbUser.user.emailVerified || userInfo.emailVerified : userInfo.emailVerified
      });
    }
  } else {
    if (disableSignUp) {
      return {
        error: "signup disabled",
        data: null,
        isRegister: false
      };
    }
    try {
      const { id: _, ...restUserInfo } = userInfo;
      user = await c.context.internalAdapter.createOAuthUser(
        {
          ...restUserInfo,
          email: userInfo.email.toLowerCase()
        },
        {
          accessToken: account.accessToken,
          idToken: account.idToken,
          refreshToken: account.refreshToken,
          accessTokenExpiresAt: account.accessTokenExpiresAt,
          refreshTokenExpiresAt: account.refreshTokenExpiresAt,
          scope: account.scope,
          providerId: account.providerId,
          accountId: userInfo.id.toString()
        },
        c
      ).then((res) => res?.user);
      if (!userInfo.emailVerified && user && c.context.options.emailVerification?.sendOnSignUp) {
        const token = await createEmailVerificationToken(
          c.context.secret,
          user.email,
          void 0,
          c.context.options.emailVerification?.expiresIn
        );
        const url = `${c.context.baseURL}/verify-email?token=${token}&callbackURL=${callbackURL}`;
        await c.context.options.emailVerification?.sendVerificationEmail?.(
          {
            user,
            url,
            token
          },
          c.request
        );
      }
    } catch (e) {
      logger.logger.error(e);
      if (e instanceof betterCall.APIError) {
        return {
          error: e.message,
          data: null,
          isRegister: false
        };
      }
      return {
        error: "unable to create user",
        data: null,
        isRegister: false
      };
    }
  }
  if (!user) {
    return {
      error: "unable to create user",
      data: null,
      isRegister: false
    };
  }
  const session = await c.context.internalAdapter.createSession(user.id, c);
  if (!session) {
    return {
      error: "unable to create session",
      data: null,
      isRegister: false
    };
  }
  return {
    data: {
      session,
      user
    },
    error: null,
    isRegister
  };
}

const signInSocial = createAuthEndpoint(
  "/sign-in/social",
  {
    method: "POST",
    body: zod.z.object({
      /**
       * Callback URL to redirect to after the user
       * has signed in.
       */
      callbackURL: zod.z.string({
        description: "Callback URL to redirect to after the user has signed in"
      }).optional(),
      /**
       * callback url to redirect if the user is newly registered.
       *
       * useful if you have different routes for existing users and new users
       */
      newUserCallbackURL: zod.z.string().optional(),
      /**
       * Callback url to redirect to if an error happens
       *
       * If it's initiated from the client sdk this defaults to
       * the current url.
       */
      errorCallbackURL: zod.z.string({
        description: "Callback URL to redirect to if an error happens"
      }).optional(),
      /**
       * OAuth2 provider to use`
       */
      provider: socialProviders_index.SocialProviderListEnum,
      /**
       * Disable automatic redirection to the provider
       *
       * This is useful if you want to handle the redirection
       * yourself like in a popup or a different tab.
       */
      disableRedirect: zod.z.boolean({
        description: "Disable automatic redirection to the provider. Useful for handling the redirection yourself"
      }).optional(),
      /**
       * ID token from the provider
       *
       * This is used to sign in the user
       * if the user is already signed in with the
       * provider in the frontend.
       *
       * Only applicable if the provider supports
       * it. Currently only `apple` and `google` is
       * supported out of the box.
       */
      idToken: zod.z.optional(
        zod.z.object({
          /**
           * ID token from the provider
           */
          token: zod.z.string({
            description: "ID token from the provider"
          }),
          /**
           * The nonce used to generate the token
           */
          nonce: zod.z.string({
            description: "Nonce used to generate the token"
          }).optional(),
          /**
           * Access token from the provider
           */
          accessToken: zod.z.string({
            description: "Access token from the provider"
          }).optional(),
          /**
           * Refresh token from the provider
           */
          refreshToken: zod.z.string({
            description: "Refresh token from the provider"
          }).optional(),
          /**
           * Expiry date of the token
           */
          expiresAt: zod.z.number({
            description: "Expiry date of the token"
          }).optional()
        }),
        {
          description: "ID token from the provider to sign in the user with id token"
        }
      ),
      scopes: zod.z.array(zod.z.string(), {
        description: "Array of scopes to request from the provider. This will override the default scopes passed."
      }).optional(),
      /**
       * Explicitly request sign-up
       *
       * Should be used to allow sign up when
       * disableImplicitSignUp for this provider is
       * true
       */
      requestSignUp: zod.z.boolean({
        description: "Explicitly request sign-up. Useful when disableImplicitSignUp is true for this provider"
      }).optional(),
      /**
       * The login hint to use for the authorization code request
       */
      loginHint: zod.z.string({
        description: "The login hint to use for the authorization code request"
      }).optional()
    }),
    metadata: {
      openapi: {
        description: "Sign in with a social provider",
        operationId: "socialSignIn",
        responses: {
          "200": {
            description: "Success - Returns either session details or redirect URL",
            content: {
              "application/json": {
                schema: {
                  // todo: we need support for multiple schema
                  type: "object",
                  description: "Session response when idToken is provided",
                  properties: {
                    redirect: {
                      type: "boolean",
                      enum: [false]
                    },
                    token: {
                      type: "string",
                      description: "Session token",
                      url: {
                        type: "null",
                        nullable: true
                      },
                      user: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          email: { type: "string" },
                          name: {
                            type: "string",
                            nullable: true
                          },
                          image: {
                            type: "string",
                            nullable: true
                          },
                          emailVerified: {
                            type: "boolean"
                          },
                          createdAt: {
                            type: "string",
                            format: "date-time"
                          },
                          updatedAt: {
                            type: "string",
                            format: "date-time"
                          }
                        },
                        required: [
                          "id",
                          "email",
                          "emailVerified",
                          "createdAt",
                          "updatedAt"
                        ]
                      }
                    }
                  },
                  required: ["redirect", "token", "user"]
                }
              }
            }
          }
        }
      }
    }
  },
  async (c) => {
    const provider = c.context.socialProviders.find(
      (p) => p.id === c.body.provider
    );
    if (!provider) {
      c.context.logger.error(
        "Provider not found. Make sure to add the provider in your auth config",
        {
          provider: c.body.provider
        }
      );
      throw new betterCall.APIError("NOT_FOUND", {
        message: BASE_ERROR_CODES.PROVIDER_NOT_FOUND
      });
    }
    if (c.body.idToken) {
      if (!provider.verifyIdToken) {
        c.context.logger.error(
          "Provider does not support id token verification",
          {
            provider: c.body.provider
          }
        );
        throw new betterCall.APIError("NOT_FOUND", {
          message: BASE_ERROR_CODES.ID_TOKEN_NOT_SUPPORTED
        });
      }
      const { token, nonce } = c.body.idToken;
      const valid = await provider.verifyIdToken(token, nonce);
      if (!valid) {
        c.context.logger.error("Invalid id token", {
          provider: c.body.provider
        });
        throw new betterCall.APIError("UNAUTHORIZED", {
          message: BASE_ERROR_CODES.INVALID_TOKEN
        });
      }
      const userInfo = await provider.getUserInfo({
        idToken: token,
        accessToken: c.body.idToken.accessToken,
        refreshToken: c.body.idToken.refreshToken
      });
      if (!userInfo || !userInfo?.user) {
        c.context.logger.error("Failed to get user info", {
          provider: c.body.provider
        });
        throw new betterCall.APIError("UNAUTHORIZED", {
          message: BASE_ERROR_CODES.FAILED_TO_GET_USER_INFO
        });
      }
      if (!userInfo.user.email) {
        c.context.logger.error("User email not found", {
          provider: c.body.provider
        });
        throw new betterCall.APIError("UNAUTHORIZED", {
          message: BASE_ERROR_CODES.USER_EMAIL_NOT_FOUND
        });
      }
      const data = await handleOAuthUserInfo(c, {
        userInfo: {
          ...userInfo.user,
          email: userInfo.user.email,
          id: userInfo.user.id,
          name: userInfo.user.name || "",
          image: userInfo.user.image,
          emailVerified: userInfo.user.emailVerified || false
        },
        account: {
          providerId: provider.id,
          accountId: userInfo.user.id,
          accessToken: c.body.idToken.accessToken
        },
        callbackURL: c.body.callbackURL,
        disableSignUp: provider.disableImplicitSignUp && !c.body.requestSignUp || provider.disableSignUp
      });
      if (data.error) {
        throw new betterCall.APIError("UNAUTHORIZED", {
          message: data.error
        });
      }
      await cookies_index.setSessionCookie(c, data.data);
      return c.json({
        redirect: false,
        token: data.data.session.token,
        url: void 0,
        user: {
          id: data.data.user.id,
          email: data.data.user.email,
          name: data.data.user.name,
          image: data.data.user.image,
          emailVerified: data.data.user.emailVerified,
          createdAt: data.data.user.createdAt,
          updatedAt: data.data.user.updatedAt
        }
      });
    }
    const { codeVerifier, state: state$1 } = await state.generateState(c);
    const url = await provider.createAuthorizationURL({
      state: state$1,
      codeVerifier,
      redirectURI: `${c.context.baseURL}/callback/${provider.id}`,
      scopes: c.body.scopes,
      loginHint: c.body.loginHint
    });
    return c.json({
      url: url.toString(),
      redirect: !c.body.disableRedirect
    });
  }
);
const signInEmail = createAuthEndpoint(
  "/sign-in/email",
  {
    method: "POST",
    body: zod.z.object({
      /**
       * Email of the user
       */
      email: zod.z.string({
        description: "Email of the user"
      }),
      /**
       * Password of the user
       */
      password: zod.z.string({
        description: "Password of the user"
      }),
      /**
       * Callback URL to use as a redirect for email
       * verification and for possible redirects
       */
      callbackURL: zod.z.string({
        description: "Callback URL to use as a redirect for email verification"
      }).optional(),
      /**
       * If this is false, the session will not be remembered
       * @default true
       */
      rememberMe: zod.z.boolean({
        description: "If this is false, the session will not be remembered. Default is `true`."
      }).default(true).optional()
    }),
    metadata: {
      openapi: {
        description: "Sign in with email and password",
        responses: {
          "200": {
            description: "Success - Returns either session details or redirect URL",
            content: {
              "application/json": {
                schema: {
                  // todo: we need support for multiple schema
                  type: "object",
                  description: "Session response when idToken is provided",
                  properties: {
                    redirect: {
                      type: "boolean",
                      enum: [false]
                    },
                    token: {
                      type: "string",
                      description: "Session token"
                    },
                    url: {
                      type: "null",
                      nullable: true
                    },
                    user: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        email: { type: "string" },
                        name: {
                          type: "string",
                          nullable: true
                        },
                        image: {
                          type: "string",
                          nullable: true
                        },
                        emailVerified: {
                          type: "boolean"
                        },
                        createdAt: {
                          type: "string",
                          format: "date-time"
                        },
                        updatedAt: {
                          type: "string",
                          format: "date-time"
                        }
                      },
                      required: [
                        "id",
                        "email",
                        "emailVerified",
                        "createdAt",
                        "updatedAt"
                      ]
                    }
                  },
                  required: ["redirect", "token", "user"]
                }
              }
            }
          }
        }
      }
    }
  },
  async (ctx) => {
    if (!ctx.context.options?.emailAndPassword?.enabled) {
      ctx.context.logger.error(
        "Email and password is not enabled. Make sure to enable it in the options on you `auth.ts` file. Check `https://better-auth.com/docs/authentication/email-password` for more!"
      );
      throw new betterCall.APIError("BAD_REQUEST", {
        message: "Email and password is not enabled"
      });
    }
    const { email, password } = ctx.body;
    const isValidEmail = zod.z.string().email().safeParse(email);
    if (!isValidEmail.success) {
      throw new betterCall.APIError("BAD_REQUEST", {
        message: BASE_ERROR_CODES.INVALID_EMAIL
      });
    }
    const user = await ctx.context.internalAdapter.findUserByEmail(email, {
      includeAccounts: true
    });
    if (!user) {
      await ctx.context.password.hash(password);
      ctx.context.logger.error("User not found", { email });
      throw new betterCall.APIError("UNAUTHORIZED", {
        message: BASE_ERROR_CODES.INVALID_EMAIL_OR_PASSWORD
      });
    }
    const credentialAccount = user.accounts.find(
      (a) => a.providerId === "credential"
    );
    if (!credentialAccount) {
      ctx.context.logger.error("Credential account not found", { email });
      throw new betterCall.APIError("UNAUTHORIZED", {
        message: BASE_ERROR_CODES.INVALID_EMAIL_OR_PASSWORD
      });
    }
    const currentPassword = credentialAccount?.password;
    if (!currentPassword) {
      ctx.context.logger.error("Password not found", { email });
      throw new betterCall.APIError("UNAUTHORIZED", {
        message: BASE_ERROR_CODES.INVALID_EMAIL_OR_PASSWORD
      });
    }
    const validPassword = await ctx.context.password.verify({
      hash: currentPassword,
      password
    });
    if (!validPassword) {
      ctx.context.logger.error("Invalid password");
      throw new betterCall.APIError("UNAUTHORIZED", {
        message: BASE_ERROR_CODES.INVALID_EMAIL_OR_PASSWORD
      });
    }
    if (ctx.context.options?.emailAndPassword?.requireEmailVerification && !user.user.emailVerified) {
      if (!ctx.context.options?.emailVerification?.sendVerificationEmail) {
        throw new betterCall.APIError("FORBIDDEN", {
          message: BASE_ERROR_CODES.EMAIL_NOT_VERIFIED
        });
      }
      const token = await createEmailVerificationToken(
        ctx.context.secret,
        user.user.email,
        void 0,
        ctx.context.options.emailVerification?.expiresIn
      );
      const url = `${ctx.context.baseURL}/verify-email?token=${token}&callbackURL=${ctx.body.callbackURL || "/"}`;
      await ctx.context.options.emailVerification.sendVerificationEmail(
        {
          user: user.user,
          url,
          token
        },
        ctx.request
      );
      throw new betterCall.APIError("FORBIDDEN", {
        message: BASE_ERROR_CODES.EMAIL_NOT_VERIFIED
      });
    }
    const session = await ctx.context.internalAdapter.createSession(
      user.user.id,
      ctx,
      ctx.body.rememberMe === false
    );
    if (!session) {
      ctx.context.logger.error("Failed to create session");
      throw new betterCall.APIError("UNAUTHORIZED", {
        message: BASE_ERROR_CODES.FAILED_TO_CREATE_SESSION
      });
    }
    await cookies_index.setSessionCookie(
      ctx,
      {
        session,
        user: user.user
      },
      ctx.body.rememberMe === false
    );
    return ctx.json({
      redirect: !!ctx.body.callbackURL,
      token: session.token,
      url: ctx.body.callbackURL,
      user: {
        id: user.user.id,
        email: user.user.email,
        name: user.user.name,
        image: user.user.image,
        emailVerified: user.user.emailVerified,
        createdAt: user.user.createdAt,
        updatedAt: user.user.updatedAt
      }
    });
  }
);

const schema = zod.z.object({
  code: zod.z.string().optional(),
  error: zod.z.string().optional(),
  device_id: zod.z.string().optional(),
  error_description: zod.z.string().optional(),
  state: zod.z.string().optional(),
  user: zod.z.string().optional()
});
const callbackOAuth = createAuthEndpoint(
  "/callback/:id",
  {
    method: ["GET", "POST"],
    body: schema.optional(),
    query: schema.optional(),
    metadata: HIDE_METADATA
  },
  async (c) => {
    let queryOrBody;
    const defaultErrorURL = c.context.options.onAPIError?.errorURL || `${c.context.baseURL}/error`;
    try {
      if (c.method === "GET") {
        queryOrBody = schema.parse(c.query);
      } else if (c.method === "POST") {
        queryOrBody = schema.parse(c.body);
      } else {
        throw new Error("Unsupported method");
      }
    } catch (e) {
      c.context.logger.error("INVALID_CALLBACK_REQUEST", e);
      throw c.redirect(`${defaultErrorURL}?error=invalid_callback_request`);
    }
    const { code, error, state: state$1, error_description, device_id } = queryOrBody;
    if (error) {
      throw c.redirect(
        `${defaultErrorURL}?error=${error}&error_description=${error_description}`
      );
    }
    if (!state$1) {
      c.context.logger.error("State not found", error);
      throw c.redirect(`${defaultErrorURL}?error=state_not_found`);
    }
    const {
      codeVerifier,
      callbackURL,
      link,
      errorURL,
      newUserURL,
      requestSignUp
    } = await state.parseState(c);
    function redirectOnError(error2) {
      let url = errorURL || defaultErrorURL;
      if (url.includes("?")) {
        url = `${url}&error=${error2}`;
      } else {
        url = `${url}?error=${error2}`;
      }
      throw c.redirect(url);
    }
    if (!code) {
      c.context.logger.error("Code not found");
      throw redirectOnError("no_code");
    }
    const provider = c.context.socialProviders.find(
      (p) => p.id === c.params.id
    );
    if (!provider) {
      c.context.logger.error(
        "Oauth provider with id",
        c.params.id,
        "not found"
      );
      throw redirectOnError("oauth_provider_not_found");
    }
    let tokens;
    try {
      tokens = await provider.validateAuthorizationCode({
        code,
        codeVerifier,
        deviceId: device_id,
        redirectURI: `${c.context.baseURL}/callback/${provider.id}`
      });
    } catch (e) {
      c.context.logger.error("", e);
      throw redirectOnError("invalid_code");
    }
    const userInfo = await provider.getUserInfo({
      ...tokens,
      user: c.body?.user ? json.safeJSONParse(c.body.user) : void 0
    }).then((res) => res?.user);
    if (!userInfo) {
      c.context.logger.error("Unable to get user info");
      return redirectOnError("unable_to_get_user_info");
    }
    if (!userInfo.email) {
      c.context.logger.error(
        "Provider did not return email. This could be due to misconfiguration in the provider settings."
      );
      return redirectOnError("email_not_found");
    }
    if (!callbackURL) {
      c.context.logger.error("No callback URL found");
      throw redirectOnError("no_callback_url");
    }
    if (link) {
      const existingAccount = await c.context.internalAdapter.findAccount(
        userInfo.id
      );
      if (existingAccount) {
        if (existingAccount.userId.toString() !== link.userId.toString()) {
          return redirectOnError("account_already_linked_to_different_user");
        }
        const updateData = Object.fromEntries(
          Object.entries({
            accessToken: tokens.accessToken,
            idToken: tokens.idToken,
            refreshToken: tokens.refreshToken,
            accessTokenExpiresAt: tokens.accessTokenExpiresAt,
            refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
            scope: tokens.scopes?.join(",")
          }).filter(([_, value]) => value !== void 0)
        );
        await c.context.internalAdapter.updateAccount(
          existingAccount.id,
          updateData
        );
      } else {
        const newAccount = await c.context.internalAdapter.createAccount(
          {
            userId: link.userId,
            providerId: provider.id,
            accountId: userInfo.id,
            ...tokens,
            scope: tokens.scopes?.join(",")
          },
          c
        );
        if (!newAccount) {
          return redirectOnError("unable_to_link_account");
        }
      }
      let toRedirectTo2;
      try {
        const url = callbackURL;
        toRedirectTo2 = url.toString();
      } catch {
        toRedirectTo2 = callbackURL;
      }
      throw c.redirect(toRedirectTo2);
    }
    const result = await handleOAuthUserInfo(c, {
      userInfo: {
        ...userInfo,
        email: userInfo.email,
        name: userInfo.name || userInfo.email
      },
      account: {
        providerId: provider.id,
        accountId: userInfo.id,
        ...tokens,
        scope: tokens.scopes?.join(",")
      },
      callbackURL,
      disableSignUp: provider.disableImplicitSignUp && !requestSignUp || provider.options?.disableSignUp,
      overrideUserInfo: provider.options?.overrideUserInfoOnSignIn
    });
    if (result.error) {
      c.context.logger.error(result.error.split(" ").join("_"));
      return redirectOnError(result.error.split(" ").join("_"));
    }
    const { session, user } = result.data;
    await cookies_index.setSessionCookie(c, {
      session,
      user
    });
    let toRedirectTo;
    try {
      const url = result.isRegister ? newUserURL || callbackURL : callbackURL;
      toRedirectTo = url.toString();
    } catch {
      toRedirectTo = result.isRegister ? newUserURL || callbackURL : callbackURL;
    }
    throw c.redirect(toRedirectTo);
  }
);

const signOut = createAuthEndpoint(
  "/sign-out",
  {
    method: "POST",
    requireHeaders: true,
    metadata: {
      openapi: {
        description: "Sign out the current user",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
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
    const sessionCookieToken = await ctx.getSignedCookie(
      ctx.context.authCookies.sessionToken.name,
      ctx.context.secret
    );
    if (!sessionCookieToken) {
      cookies_index.deleteSessionCookie(ctx);
      throw new betterCall.APIError("BAD_REQUEST", {
        message: BASE_ERROR_CODES.FAILED_TO_GET_SESSION
      });
    }
    await ctx.context.internalAdapter.deleteSession(sessionCookieToken);
    cookies_index.deleteSessionCookie(ctx);
    return ctx.json({
      success: true
    });
  }
);

function redirectError(ctx, callbackURL, query) {
  const url = callbackURL ? new URL(callbackURL, ctx.baseURL) : new URL(`${ctx.baseURL}/error`);
  if (query)
    Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
  return url.href;
}
function redirectCallback(ctx, callbackURL, query) {
  const url = new URL(callbackURL, ctx.baseURL);
  if (query)
    Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
  return url.href;
}
const requestPasswordReset = createAuthEndpoint(
  "/request-password-reset",
  {
    method: "POST",
    body: zod.z.object({
      /**
       * The email address of the user to send a password reset email to.
       */
      email: zod.z.string({
        description: "The email address of the user to send a password reset email to"
      }).email(),
      /**
       * The URL to redirect the user to reset their password.
       * If the token isn't valid or expired, it'll be redirected with a query parameter `?
       * error=INVALID_TOKEN`. If the token is valid, it'll be redirected with a query parameter `?
       * token=VALID_TOKEN
       */
      redirectTo: zod.z.string({
        description: "The URL to redirect the user to reset their password. If the token isn't valid or expired, it'll be redirected with a query parameter `?error=INVALID_TOKEN`. If the token is valid, it'll be redirected with a query parameter `?token=VALID_TOKEN"
      }).optional()
    }),
    metadata: {
      openapi: {
        description: "Send a password reset email to the user",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: {
                      type: "boolean"
                    },
                    message: {
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
    if (!ctx.context.options.emailAndPassword?.sendResetPassword) {
      ctx.context.logger.error(
        "Reset password isn't enabled.Please pass an emailAndPassword.sendResetPassword function in your auth config!"
      );
      throw new betterCall.APIError("BAD_REQUEST", {
        message: "Reset password isn't enabled"
      });
    }
    const { email, redirectTo } = ctx.body;
    const user = await ctx.context.internalAdapter.findUserByEmail(email, {
      includeAccounts: true
    });
    if (!user) {
      ctx.context.logger.error("Reset Password: User not found", { email });
      return ctx.json({
        status: true,
        message: "If this email exists in our system, check your email for the reset link"
      });
    }
    const defaultExpiresIn = 60 * 60 * 1;
    const expiresAt = date.getDate(
      ctx.context.options.emailAndPassword.resetPasswordTokenExpiresIn || defaultExpiresIn,
      "sec"
    );
    const verificationToken = id.generateId(24);
    await ctx.context.internalAdapter.createVerificationValue(
      {
        value: user.user.id,
        identifier: `reset-password:${verificationToken}`,
        expiresAt
      },
      ctx
    );
    const callbackURL = redirectTo ? encodeURIComponent(redirectTo) : "";
    const url = `${ctx.context.baseURL}/reset-password/${verificationToken}?callbackURL=${callbackURL}`;
    await ctx.context.options.emailAndPassword.sendResetPassword(
      {
        user: user.user,
        url,
        token: verificationToken
      },
      ctx.request
    );
    return ctx.json({
      status: true
    });
  }
);
const forgetPassword = createAuthEndpoint(
  "/forget-password",
  {
    method: "POST",
    body: zod.z.object({
      /**
       * The email address of the user to send a password reset email to.
       */
      email: zod.z.string({
        description: "The email address of the user to send a password reset email to"
      }).email(),
      /**
       * The URL to redirect the user to reset their password.
       * If the token isn't valid or expired, it'll be redirected with a query parameter `?
       * error=INVALID_TOKEN`. If the token is valid, it'll be redirected with a query parameter `?
       * token=VALID_TOKEN
       */
      redirectTo: zod.z.string({
        description: "The URL to redirect the user to reset their password. If the token isn't valid or expired, it'll be redirected with a query parameter `?error=INVALID_TOKEN`. If the token is valid, it'll be redirected with a query parameter `?token=VALID_TOKEN"
      }).optional()
    }),
    metadata: {
      openapi: {
        description: "Send a password reset email to the user",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: {
                      type: "boolean"
                    },
                    message: {
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
    if (!ctx.context.options.emailAndPassword?.sendResetPassword) {
      ctx.context.logger.error(
        "Reset password isn't enabled.Please pass an emailAndPassword.sendResetPassword function in your auth config!"
      );
      throw new betterCall.APIError("BAD_REQUEST", {
        message: "Reset password isn't enabled"
      });
    }
    const { email, redirectTo } = ctx.body;
    const user = await ctx.context.internalAdapter.findUserByEmail(email, {
      includeAccounts: true
    });
    if (!user) {
      ctx.context.logger.error("Reset Password: User not found", { email });
      return ctx.json({
        status: true,
        message: "If this email exists in our system, check your email for the reset link"
      });
    }
    const defaultExpiresIn = 60 * 60 * 1;
    const expiresAt = date.getDate(
      ctx.context.options.emailAndPassword.resetPasswordTokenExpiresIn || defaultExpiresIn,
      "sec"
    );
    const verificationToken = id.generateId(24);
    await ctx.context.internalAdapter.createVerificationValue(
      {
        value: user.user.id,
        identifier: `reset-password:${verificationToken}`,
        expiresAt
      },
      ctx
    );
    const callbackURL = redirectTo ? encodeURIComponent(redirectTo) : "";
    const url = `${ctx.context.baseURL}/reset-password/${verificationToken}?callbackURL=${callbackURL}`;
    await ctx.context.options.emailAndPassword.sendResetPassword(
      {
        user: user.user,
        url,
        token: verificationToken
      },
      ctx.request
    );
    return ctx.json({
      status: true
    });
  }
);
const requestPasswordResetCallback = createAuthEndpoint(
  "/reset-password/:token",
  {
    method: "GET",
    query: zod.z.object({
      callbackURL: zod.z.string({
        description: "The URL to redirect the user to reset their password"
      })
    }),
    use: [originCheck((ctx) => ctx.query.callbackURL)],
    metadata: {
      openapi: {
        description: "Redirects the user to the callback URL with the token",
        responses: {
          "200": {
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
    const { token } = ctx.params;
    const { callbackURL } = ctx.query;
    if (!token || !callbackURL) {
      throw ctx.redirect(
        redirectError(ctx.context, callbackURL, { error: "INVALID_TOKEN" })
      );
    }
    const verification = await ctx.context.internalAdapter.findVerificationValue(
      `reset-password:${token}`
    );
    if (!verification || verification.expiresAt < /* @__PURE__ */ new Date()) {
      throw ctx.redirect(
        redirectError(ctx.context, callbackURL, { error: "INVALID_TOKEN" })
      );
    }
    throw ctx.redirect(redirectCallback(ctx.context, callbackURL, { token }));
  }
);
const forgetPasswordCallback = requestPasswordResetCallback;
const resetPassword = createAuthEndpoint(
  "/reset-password",
  {
    method: "POST",
    query: zod.z.object({
      token: zod.z.string().optional()
    }).optional(),
    body: zod.z.object({
      newPassword: zod.z.string({
        description: "The new password to set"
      }),
      token: zod.z.string({
        description: "The token to reset the password"
      }).optional()
    }),
    metadata: {
      openapi: {
        description: "Reset the password for a user",
        responses: {
          "200": {
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
    const token = ctx.body.token || ctx.query?.token;
    if (!token) {
      throw new betterCall.APIError("BAD_REQUEST", {
        message: BASE_ERROR_CODES.INVALID_TOKEN
      });
    }
    const { newPassword } = ctx.body;
    const minLength = ctx.context.password?.config.minPasswordLength;
    const maxLength = ctx.context.password?.config.maxPasswordLength;
    if (newPassword.length < minLength) {
      throw new betterCall.APIError("BAD_REQUEST", {
        message: BASE_ERROR_CODES.PASSWORD_TOO_SHORT
      });
    }
    if (newPassword.length > maxLength) {
      throw new betterCall.APIError("BAD_REQUEST", {
        message: BASE_ERROR_CODES.PASSWORD_TOO_LONG
      });
    }
    const id = `reset-password:${token}`;
    const verification = await ctx.context.internalAdapter.findVerificationValue(id);
    if (!verification || verification.expiresAt < /* @__PURE__ */ new Date()) {
      throw new betterCall.APIError("BAD_REQUEST", {
        message: BASE_ERROR_CODES.INVALID_TOKEN
      });
    }
    const userId = verification.value;
    const hashedPassword = await ctx.context.password.hash(newPassword);
    const accounts = await ctx.context.internalAdapter.findAccounts(userId);
    const account = accounts.find((ac) => ac.providerId === "credential");
    if (!account) {
      await ctx.context.internalAdapter.createAccount(
        {
          userId,
          providerId: "credential",
          password: hashedPassword,
          accountId: userId
        },
        ctx
      );
      await ctx.context.internalAdapter.deleteVerificationValue(
        verification.id
      );
      return ctx.json({
        status: true
      });
    }
    await ctx.context.internalAdapter.updatePassword(
      userId,
      hashedPassword,
      ctx
    );
    await ctx.context.internalAdapter.deleteVerificationValue(verification.id);
    if (ctx.context.options.emailAndPassword?.revokeSessionsOnPasswordReset) {
      await ctx.context.internalAdapter.deleteSessions(userId);
    }
    return ctx.json({
      status: true
    });
  }
);

const updateUser = () => createAuthEndpoint(
  "/update-user",
  {
    method: "POST",
    body: zod.z.record(zod.z.string(), zod.z.any()),
    use: [sessionMiddleware],
    metadata: {
      $Infer: {
        body: {}
      },
      openapi: {
        description: "Update the current user",
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
                  image: {
                    type: "string",
                    description: "The image of the user"
                  }
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: {
                      type: "boolean",
                      description: "Indicates if the update was successful"
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
    const body = ctx.body;
    if (body.email) {
      throw new betterCall.APIError("BAD_REQUEST", {
        message: BASE_ERROR_CODES.EMAIL_CAN_NOT_BE_UPDATED
      });
    }
    const { name, image, ...rest } = body;
    const session = ctx.context.session;
    if (image === void 0 && name === void 0 && Object.keys(rest).length === 0) {
      return ctx.json({
        status: true
      });
    }
    const additionalFields = schema$1.parseUserInput(
      ctx.context.options,
      rest,
      "update"
    );
    const user = await ctx.context.internalAdapter.updateUser(
      session.user.id,
      {
        name,
        image,
        ...additionalFields
      },
      ctx
    );
    await cookies_index.setSessionCookie(ctx, {
      session: session.session,
      user
    });
    return ctx.json({
      status: true
    });
  }
);
const changePassword = createAuthEndpoint(
  "/change-password",
  {
    method: "POST",
    body: zod.z.object({
      /**
       * The new password to set
       */
      newPassword: zod.z.string({
        description: "The new password to set"
      }),
      /**
       * The current password of the user
       */
      currentPassword: zod.z.string({
        description: "The current password"
      }),
      /**
       * revoke all sessions that are not the
       * current one logged in by the user
       */
      revokeOtherSessions: zod.z.boolean({
        description: "Revoke all other sessions"
      }).optional()
    }),
    use: [sessionMiddleware],
    metadata: {
      openapi: {
        description: "Change the password of the user",
        responses: {
          "200": {
            description: "Password successfully changed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    token: {
                      type: "string",
                      nullable: true,
                      // Only present if revokeOtherSessions is true
                      description: "New session token if other sessions were revoked"
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
                }
              }
            }
          }
        }
      }
    }
  },
  async (ctx) => {
    const { newPassword, currentPassword, revokeOtherSessions } = ctx.body;
    const session = ctx.context.session;
    const minPasswordLength = ctx.context.password.config.minPasswordLength;
    if (newPassword.length < minPasswordLength) {
      ctx.context.logger.error("Password is too short");
      throw new betterCall.APIError("BAD_REQUEST", {
        message: BASE_ERROR_CODES.PASSWORD_TOO_SHORT
      });
    }
    const maxPasswordLength = ctx.context.password.config.maxPasswordLength;
    if (newPassword.length > maxPasswordLength) {
      ctx.context.logger.error("Password is too long");
      throw new betterCall.APIError("BAD_REQUEST", {
        message: BASE_ERROR_CODES.PASSWORD_TOO_LONG
      });
    }
    const accounts = await ctx.context.internalAdapter.findAccounts(
      session.user.id
    );
    const account = accounts.find(
      (account2) => account2.providerId === "credential" && account2.password
    );
    if (!account || !account.password) {
      throw new betterCall.APIError("BAD_REQUEST", {
        message: BASE_ERROR_CODES.CREDENTIAL_ACCOUNT_NOT_FOUND
      });
    }
    const passwordHash = await ctx.context.password.hash(newPassword);
    const verify = await ctx.context.password.verify({
      hash: account.password,
      password: currentPassword
    });
    if (!verify) {
      throw new betterCall.APIError("BAD_REQUEST", {
        message: BASE_ERROR_CODES.INVALID_PASSWORD
      });
    }
    await ctx.context.internalAdapter.updateAccount(account.id, {
      password: passwordHash
    });
    let token = null;
    if (revokeOtherSessions) {
      await ctx.context.internalAdapter.deleteSessions(session.user.id);
      const newSession = await ctx.context.internalAdapter.createSession(
        session.user.id,
        ctx
      );
      if (!newSession) {
        throw new betterCall.APIError("INTERNAL_SERVER_ERROR", {
          message: BASE_ERROR_CODES.FAILED_TO_GET_SESSION
        });
      }
      await cookies_index.setSessionCookie(ctx, {
        session: newSession,
        user: session.user
      });
      token = newSession.token;
    }
    return ctx.json({
      token,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        emailVerified: session.user.emailVerified,
        createdAt: session.user.createdAt,
        updatedAt: session.user.updatedAt
      }
    });
  }
);
const setPassword = createAuthEndpoint(
  "/set-password",
  {
    method: "POST",
    body: zod.z.object({
      /**
       * The new password to set
       */
      newPassword: zod.z.string()
    }),
    metadata: {
      SERVER_ONLY: true
    },
    use: [sessionMiddleware]
  },
  async (ctx) => {
    const { newPassword } = ctx.body;
    const session = ctx.context.session;
    const minPasswordLength = ctx.context.password.config.minPasswordLength;
    if (newPassword.length < minPasswordLength) {
      ctx.context.logger.error("Password is too short");
      throw new betterCall.APIError("BAD_REQUEST", {
        message: BASE_ERROR_CODES.PASSWORD_TOO_SHORT
      });
    }
    const maxPasswordLength = ctx.context.password.config.maxPasswordLength;
    if (newPassword.length > maxPasswordLength) {
      ctx.context.logger.error("Password is too long");
      throw new betterCall.APIError("BAD_REQUEST", {
        message: BASE_ERROR_CODES.PASSWORD_TOO_LONG
      });
    }
    const accounts = await ctx.context.internalAdapter.findAccounts(
      session.user.id
    );
    const account = accounts.find(
      (account2) => account2.providerId === "credential" && account2.password
    );
    const passwordHash = await ctx.context.password.hash(newPassword);
    if (!account) {
      await ctx.context.internalAdapter.linkAccount(
        {
          userId: session.user.id,
          providerId: "credential",
          accountId: session.user.id,
          password: passwordHash
        },
        ctx
      );
      return ctx.json({
        status: true
      });
    }
    throw new betterCall.APIError("BAD_REQUEST", {
      message: "user already has a password"
    });
  }
);
const deleteUser = createAuthEndpoint(
  "/delete-user",
  {
    method: "POST",
    use: [sessionMiddleware],
    body: zod.z.object({
      /**
       * The callback URL to redirect to after the user is deleted
       * this is only used on delete user callback
       */
      callbackURL: zod.z.string().optional(),
      /**
       * The password of the user. If the password isn't provided, session freshness
       * will be checked.
       */
      password: zod.z.string().optional(),
      /**
       * The token to delete the user. If the token is provided, the user will be deleted
       */
      token: zod.z.string().optional()
    }),
    metadata: {
      openapi: {
        description: "Delete the user",
        responses: {
          "200": {
            description: "User deletion processed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      description: "Indicates if the operation was successful"
                    },
                    message: {
                      type: "string",
                      enum: ["User deleted", "Verification email sent"],
                      description: "Status message of the deletion process"
                    }
                  },
                  required: ["success", "message"]
                }
              }
            }
          }
        }
      }
    }
  },
  async (ctx) => {
    if (!ctx.context.options.user?.deleteUser?.enabled) {
      ctx.context.logger.error(
        "Delete user is disabled. Enable it in the options",
        {
          session: ctx.context.session
        }
      );
      throw new betterCall.APIError("NOT_FOUND");
    }
    const session = ctx.context.session;
    let canDelete = false;
    const accounts = await ctx.context.internalAdapter.findAccounts(
      session.user.id
    );
    const account = accounts.find(
      (account2) => account2.providerId === "credential" && account2.password
    );
    if (ctx.body.password) {
      if (!account || !account.password) {
        throw new betterCall.APIError("BAD_REQUEST", {
          message: BASE_ERROR_CODES.CREDENTIAL_ACCOUNT_NOT_FOUND
        });
      }
      const verify = await ctx.context.password.verify({
        hash: account.password,
        password: ctx.body.password
      });
      if (!verify) {
        throw new betterCall.APIError("BAD_REQUEST", {
          message: BASE_ERROR_CODES.INVALID_PASSWORD
        });
      }
      canDelete = true;
    }
    if (ctx.body.token) {
      await deleteUserCallback({
        ...ctx,
        query: {
          token: ctx.body.token
        }
      });
      return ctx.json({
        success: true,
        message: "User deleted"
      });
    }
    if (ctx.context.options.user.deleteUser?.sendDeleteAccountVerification) {
      if (account && account.password && !canDelete) {
        throw new betterCall.APIError("BAD_REQUEST", {
          message: BASE_ERROR_CODES.USER_ALREADY_HAS_PASSWORD
        });
      }
      const token = random.generateRandomString(32, "0-9", "a-z");
      await ctx.context.internalAdapter.createVerificationValue(
        {
          value: session.user.id,
          identifier: `delete-account-${token}`,
          expiresAt: new Date(
            Date.now() + (ctx.context.options.user.deleteUser?.deleteTokenExpiresIn || 60 * 60 * 24) * 1e3
          )
        },
        ctx
      );
      const url = `${ctx.context.baseURL}/delete-user/callback?token=${token}&callbackURL=${ctx.body.callbackURL || "/"}`;
      await ctx.context.options.user.deleteUser.sendDeleteAccountVerification(
        {
          user: session.user,
          url,
          token
        },
        ctx.request
      );
      return ctx.json({
        success: true,
        message: "Verification email sent"
      });
    }
    if (ctx.context.options.session?.freshAge) {
      const currentAge = session.session.createdAt.getTime();
      const freshAge = ctx.context.options.session.freshAge;
      const now = Date.now();
      if (now - currentAge > freshAge) {
        throw new betterCall.APIError("BAD_REQUEST", {
          message: BASE_ERROR_CODES.SESSION_EXPIRED
        });
      }
      canDelete = true;
    }
    if (!canDelete) {
      throw new betterCall.APIError("BAD_REQUEST", {
        message: "User cannot be deleted. please provide a password or token"
      });
    }
    const beforeDelete = ctx.context.options.user.deleteUser?.beforeDelete;
    if (beforeDelete) {
      await beforeDelete(session.user, ctx.request);
    }
    await ctx.context.internalAdapter.deleteUser(session.user.id);
    await ctx.context.internalAdapter.deleteSessions(session.user.id);
    await ctx.context.internalAdapter.deleteAccounts(session.user.id);
    cookies_index.deleteSessionCookie(ctx);
    const afterDelete = ctx.context.options.user.deleteUser?.afterDelete;
    if (afterDelete) {
      await afterDelete(session.user, ctx.request);
    }
    return ctx.json({
      success: true,
      message: "User deleted"
    });
  }
);
const deleteUserCallback = createAuthEndpoint(
  "/delete-user/callback",
  {
    method: "GET",
    query: zod.z.object({
      token: zod.z.string(),
      callbackURL: zod.z.string().optional()
    }),
    use: [originCheck((ctx) => ctx.query.callbackURL)],
    metadata: {
      openapi: {
        description: "Callback to complete user deletion with verification token",
        responses: {
          "200": {
            description: "User successfully deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      description: "Indicates if the deletion was successful"
                    },
                    message: {
                      type: "string",
                      enum: ["User deleted"],
                      description: "Confirmation message"
                    }
                  },
                  required: ["success", "message"]
                }
              }
            }
          }
        }
      }
    }
  },
  async (ctx) => {
    if (!ctx.context.options.user?.deleteUser?.enabled) {
      ctx.context.logger.error(
        "Delete user is disabled. Enable it in the options"
      );
      throw new betterCall.APIError("NOT_FOUND");
    }
    const session = await getSessionFromCtx(ctx);
    if (!session) {
      throw new betterCall.APIError("NOT_FOUND", {
        message: BASE_ERROR_CODES.FAILED_TO_GET_USER_INFO
      });
    }
    const token = await ctx.context.internalAdapter.findVerificationValue(
      `delete-account-${ctx.query.token}`
    );
    if (!token || token.expiresAt < /* @__PURE__ */ new Date()) {
      throw new betterCall.APIError("NOT_FOUND", {
        message: BASE_ERROR_CODES.INVALID_TOKEN
      });
    }
    if (token.value !== session.user.id) {
      throw new betterCall.APIError("NOT_FOUND", {
        message: BASE_ERROR_CODES.INVALID_TOKEN
      });
    }
    const beforeDelete = ctx.context.options.user.deleteUser?.beforeDelete;
    if (beforeDelete) {
      await beforeDelete(session.user, ctx.request);
    }
    await ctx.context.internalAdapter.deleteUser(session.user.id);
    await ctx.context.internalAdapter.deleteSessions(session.user.id);
    await ctx.context.internalAdapter.deleteAccounts(session.user.id);
    await ctx.context.internalAdapter.deleteVerificationValue(token.id);
    cookies_index.deleteSessionCookie(ctx);
    const afterDelete = ctx.context.options.user.deleteUser?.afterDelete;
    if (afterDelete) {
      await afterDelete(session.user, ctx.request);
    }
    if (ctx.query.callbackURL) {
      throw ctx.redirect(ctx.query.callbackURL || "/");
    }
    return ctx.json({
      success: true,
      message: "User deleted"
    });
  }
);
const changeEmail = createAuthEndpoint(
  "/change-email",
  {
    method: "POST",
    body: zod.z.object({
      newEmail: zod.z.string({
        description: "The new email to set"
      }).email(),
      callbackURL: zod.z.string({
        description: "The URL to redirect to after email verification"
      }).optional()
    }),
    use: [sessionMiddleware],
    metadata: {
      openapi: {
        responses: {
          "200": {
            description: "Email change request processed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: {
                      type: "boolean",
                      description: "Indicates if the request was successful"
                    },
                    message: {
                      type: "string",
                      enum: ["Email updated", "Verification email sent"],
                      description: "Status message of the email change process",
                      nullable: true
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
    if (!ctx.context.options.user?.changeEmail?.enabled) {
      ctx.context.logger.error("Change email is disabled.");
      throw new betterCall.APIError("BAD_REQUEST", {
        message: "Change email is disabled"
      });
    }
    const newEmail = ctx.body.newEmail.toLowerCase();
    if (newEmail === ctx.context.session.user.email) {
      ctx.context.logger.error("Email is the same");
      throw new betterCall.APIError("BAD_REQUEST", {
        message: "Email is the same"
      });
    }
    const existingUser = await ctx.context.internalAdapter.findUserByEmail(newEmail);
    if (existingUser) {
      ctx.context.logger.error("Email already exists");
      throw new betterCall.APIError("BAD_REQUEST", {
        message: "Couldn't update your email"
      });
    }
    if (ctx.context.session.user.emailVerified !== true) {
      const existing = await ctx.context.internalAdapter.findUserByEmail(newEmail);
      if (existing) {
        throw new betterCall.APIError("UNPROCESSABLE_ENTITY", {
          message: BASE_ERROR_CODES.USER_ALREADY_EXISTS
        });
      }
      await ctx.context.internalAdapter.updateUserByEmail(
        ctx.context.session.user.email,
        {
          email: newEmail
        },
        ctx
      );
      await cookies_index.setSessionCookie(ctx, {
        session: ctx.context.session.session,
        user: {
          ...ctx.context.session.user,
          email: newEmail
        }
      });
      if (ctx.context.options.emailVerification?.sendVerificationEmail) {
        const token2 = await createEmailVerificationToken(
          ctx.context.secret,
          newEmail,
          void 0,
          ctx.context.options.emailVerification?.expiresIn
        );
        const url2 = `${ctx.context.baseURL}/verify-email?token=${token2}&callbackURL=${ctx.body.callbackURL || "/"}`;
        await ctx.context.options.emailVerification.sendVerificationEmail(
          {
            user: {
              ...ctx.context.session.user,
              email: newEmail
            },
            url: url2,
            token: token2
          },
          ctx.request
        );
      }
      return ctx.json({
        status: true
      });
    }
    if (!ctx.context.options.user.changeEmail.sendChangeEmailVerification) {
      ctx.context.logger.error("Verification email isn't enabled.");
      throw new betterCall.APIError("BAD_REQUEST", {
        message: "Verification email isn't enabled"
      });
    }
    const token = await createEmailVerificationToken(
      ctx.context.secret,
      ctx.context.session.user.email,
      newEmail,
      ctx.context.options.emailVerification?.expiresIn
    );
    const url = `${ctx.context.baseURL}/verify-email?token=${token}&callbackURL=${ctx.body.callbackURL || "/"}`;
    await ctx.context.options.user.changeEmail.sendChangeEmailVerification(
      {
        user: ctx.context.session.user,
        newEmail,
        url,
        token
      },
      ctx.request
    );
    return ctx.json({
      status: true
    });
  }
);

function sanitize(input) {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
const html = (errorCode = "Unknown") => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authentication Error</title>
    <style>
        :root {
            --bg-color: #f8f9fa;
            --text-color: #212529;
            --accent-color: #000000;
            --error-color: #dc3545;
            --border-color: #e9ecef;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-color);
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            line-height: 1.5;
        }
        .error-container {
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            padding: 2.5rem;
            text-align: center;
            max-width: 90%;
            width: 400px;
        }
        h1 {
            color: var(--error-color);
            font-size: 1.75rem;
            margin-bottom: 1rem;
            font-weight: 600;
        }
        p {
            margin-bottom: 1.5rem;
            color: #495057;
        }
        .btn {
            background-color: var(--accent-color);
            color: #ffffff;
            text-decoration: none;
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            transition: all 0.3s ease;
            display: inline-block;
            font-weight: 500;
            border: 2px solid var(--accent-color);
        }
        .btn:hover {
            background-color: #131721;
        }
        .error-code {
            font-size: 0.875rem;
            color: #6c757d;
            margin-top: 1.5rem;
            padding-top: 1.5rem;
            border-top: 1px solid var(--border-color);
        }
        .icon {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="icon">\u26A0\uFE0F</div>
        <h1>Better Auth Error</h1>
        <p>We encountered an issue while processing your request. Please try again or contact the application owner if the problem persists.</p>
        <a href="/" id="returnLink" class="btn">Return to Application</a>
        <div class="error-code">Error Code: <span id="errorCode">${sanitize(
  errorCode
)}</span></div>
    </div>
</body>
</html>`;
const error = createAuthEndpoint(
  "/error",
  {
    method: "GET",
    metadata: {
      ...HIDE_METADATA,
      openapi: {
        description: "Displays an error page",
        responses: {
          "200": {
            description: "Success",
            content: {
              "text/html": {
                schema: {
                  type: "string",
                  description: "The HTML content of the error page"
                }
              }
            }
          }
        }
      }
    }
  },
  async (c) => {
    const query = new URL(c.request?.url || "").searchParams.get("error") || "Unknown";
    return new Response(html(query), {
      headers: {
        "Content-Type": "text/html"
      }
    });
  }
);

const ok = createAuthEndpoint(
  "/ok",
  {
    method: "GET",
    metadata: {
      ...HIDE_METADATA,
      openapi: {
        description: "Check if the API is working",
        responses: {
          "200": {
            description: "API is working",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: {
                      type: "boolean",
                      description: "Indicates if the API is working"
                    }
                  },
                  required: ["ok"]
                }
              }
            }
          }
        }
      }
    }
  },
  async (ctx) => {
    return ctx.json({
      ok: true
    });
  }
);

const listUserAccounts = createAuthEndpoint(
  "/list-accounts",
  {
    method: "GET",
    use: [sessionMiddleware],
    metadata: {
      openapi: {
        description: "List all accounts linked to the user",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: {
                        type: "string"
                      },
                      provider: {
                        type: "string"
                      },
                      createdAt: {
                        type: "string",
                        format: "date-time"
                      },
                      updatedAt: {
                        type: "string",
                        format: "date-time"
                      }
                    },
                    accountId: {
                      type: "string"
                    },
                    scopes: {
                      type: "array",
                      items: {
                        type: "string"
                      }
                    }
                  },
                  required: [
                    "id",
                    "provider",
                    "createdAt",
                    "updatedAt",
                    "accountId",
                    "scopes"
                  ]
                }
              }
            }
          }
        }
      }
    }
  },
  async (c) => {
    const session = c.context.session;
    const accounts = await c.context.internalAdapter.findAccounts(
      session.user.id
    );
    return c.json(
      accounts.map((a) => ({
        id: a.id,
        provider: a.providerId,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        accountId: a.accountId,
        scopes: a.scope?.split(",") || []
      }))
    );
  }
);
const linkSocialAccount = createAuthEndpoint(
  "/link-social",
  {
    method: "POST",
    requireHeaders: true,
    body: zod.z.object({
      /**
       * Callback URL to redirect to after the user has signed in.
       */
      callbackURL: zod.z.string({
        description: "The URL to redirect to after the user has signed in"
      }).optional(),
      /**
       * OAuth2 provider to use
       */
      provider: socialProviders_index.SocialProviderListEnum,
      /**
       * Additional scopes to request when linking the account.
       * This is useful for requesting additional permissions when
       * linking a social account compared to the initial authentication.
       */
      scopes: zod.z.array(zod.z.string(), {
        description: "Additional scopes to request from the provider"
      }).optional(),
      /**
       * The URL to redirect to if there is an error during the link process.
       */
      errorCallbackURL: zod.z.string({
        description: "The URL to redirect to if there is an error during the link process"
      }).optional()
    }),
    use: [sessionMiddleware],
    metadata: {
      openapi: {
        description: "Link a social account to the user",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    url: {
                      type: "string",
                      description: "The authorization URL to redirect the user to"
                    },
                    redirect: {
                      type: "boolean",
                      description: "Indicates if the user should be redirected to the authorization URL"
                    }
                  },
                  required: ["url", "redirect"]
                }
              }
            }
          }
        }
      }
    }
  },
  async (c) => {
    const session = c.context.session;
    const provider = c.context.socialProviders.find(
      (p) => p.id === c.body.provider
    );
    if (!provider) {
      c.context.logger.error(
        "Provider not found. Make sure to add the provider in your auth config",
        {
          provider: c.body.provider
        }
      );
      throw new betterCall.APIError("NOT_FOUND", {
        message: BASE_ERROR_CODES.PROVIDER_NOT_FOUND
      });
    }
    const state$1 = await state.generateState(c, {
      userId: session.user.id,
      email: session.user.email
    });
    const url = await provider.createAuthorizationURL({
      state: state$1.state,
      codeVerifier: state$1.codeVerifier,
      redirectURI: `${c.context.baseURL}/callback/${provider.id}`,
      scopes: c.body.scopes
    });
    return c.json({
      url: url.toString(),
      redirect: true
    });
  }
);
const unlinkAccount = createAuthEndpoint(
  "/unlink-account",
  {
    method: "POST",
    body: zod.z.object({
      providerId: zod.z.string(),
      accountId: zod.z.string().optional()
    }),
    use: [freshSessionMiddleware],
    metadata: {
      openapi: {
        description: "Unlink an account",
        responses: {
          "200": {
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
    const { providerId, accountId } = ctx.body;
    const accounts = await ctx.context.internalAdapter.findAccounts(
      ctx.context.session.user.id
    );
    if (accounts.length === 1 && !ctx.context.options.account?.accountLinking?.allowUnlinkingAll) {
      throw new betterCall.APIError("BAD_REQUEST", {
        message: BASE_ERROR_CODES.FAILED_TO_UNLINK_LAST_ACCOUNT
      });
    }
    const accountExist = accounts.find(
      (account) => accountId ? account.accountId === accountId && account.providerId === providerId : account.providerId === providerId
    );
    if (!accountExist) {
      throw new betterCall.APIError("BAD_REQUEST", {
        message: BASE_ERROR_CODES.ACCOUNT_NOT_FOUND
      });
    }
    await ctx.context.internalAdapter.deleteAccount(accountExist.id);
    return ctx.json({
      status: true
    });
  }
);
const getAccessToken = createAuthEndpoint(
  "/get-access-token",
  {
    method: "POST",
    body: zod.z.object({
      providerId: zod.z.string({
        description: "The provider ID for the OAuth provider"
      }),
      accountId: zod.z.string({
        description: "The account ID associated with the refresh token"
      }).optional(),
      userId: zod.z.string({
        description: "The user ID associated with the account"
      }).optional()
    }),
    metadata: {
      openapi: {
        description: "Get a valid access token, doing a refresh if needed",
        responses: {
          200: {
            description: "A Valid access token",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    tokenType: {
                      type: "string"
                    },
                    idToken: {
                      type: "string"
                    },
                    accessToken: {
                      type: "string"
                    },
                    refreshToken: {
                      type: "string"
                    },
                    accessTokenExpiresAt: {
                      type: "string",
                      format: "date-time"
                    },
                    refreshTokenExpiresAt: {
                      type: "string",
                      format: "date-time"
                    }
                  }
                }
              }
            }
          },
          400: {
            description: "Invalid refresh token or provider configuration"
          }
        }
      }
    }
  },
  async (ctx) => {
    const { providerId, accountId, userId } = ctx.body;
    const req = ctx.request;
    const session = await getSessionFromCtx(ctx);
    if (req && !session) {
      throw ctx.error("UNAUTHORIZED");
    }
    let resolvedUserId = session?.user?.id || userId;
    if (!resolvedUserId) {
      throw new betterCall.APIError("BAD_REQUEST", {
        message: `Either userId or session is required`
      });
    }
    if (!ctx.context.socialProviders.find((p) => p.id === providerId)) {
      throw new betterCall.APIError("BAD_REQUEST", {
        message: `Provider ${providerId} is not supported.`
      });
    }
    const accounts = await ctx.context.internalAdapter.findAccounts(resolvedUserId);
    const account = accounts.find(
      (acc) => accountId ? acc.id === accountId && acc.providerId === providerId : acc.providerId === providerId
    );
    if (!account) {
      throw new betterCall.APIError("BAD_REQUEST", {
        message: "Account not found"
      });
    }
    const provider = ctx.context.socialProviders.find(
      (p) => p.id === providerId
    );
    if (!provider) {
      throw new betterCall.APIError("BAD_REQUEST", {
        message: `Provider ${providerId} not found.`
      });
    }
    try {
      let newTokens = null;
      if (account.refreshToken && (!account.accessTokenExpiresAt || account.accessTokenExpiresAt.getTime() - Date.now() < 5e3) && provider.refreshAccessToken) {
        newTokens = await provider.refreshAccessToken(
          account.refreshToken
        );
        await ctx.context.internalAdapter.updateAccount(account.id, {
          accessToken: newTokens.accessToken,
          accessTokenExpiresAt: newTokens.accessTokenExpiresAt,
          refreshToken: newTokens.refreshToken,
          refreshTokenExpiresAt: newTokens.refreshTokenExpiresAt
        });
      }
      const tokens = {
        accessToken: newTokens?.accessToken ?? account.accessToken ?? void 0,
        accessTokenExpiresAt: newTokens?.accessTokenExpiresAt ?? account.accessTokenExpiresAt ?? void 0,
        scopes: account.scope?.split(",") ?? [],
        idToken: newTokens?.idToken ?? account.idToken ?? void 0
      };
      return ctx.json(tokens);
    } catch (error) {
      throw new betterCall.APIError("BAD_REQUEST", {
        message: "Failed to get a valid access token",
        cause: error
      });
    }
  }
);
const refreshToken = createAuthEndpoint(
  "/refresh-token",
  {
    method: "POST",
    body: zod.z.object({
      providerId: zod.z.string({
        description: "The provider ID for the OAuth provider"
      }),
      accountId: zod.z.string({
        description: "The account ID associated with the refresh token"
      }).optional(),
      userId: zod.z.string({
        description: "The user ID associated with the account"
      }).optional()
    }),
    metadata: {
      openapi: {
        description: "Refresh the access token using a refresh token",
        responses: {
          200: {
            description: "Access token refreshed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    tokenType: {
                      type: "string"
                    },
                    idToken: {
                      type: "string"
                    },
                    accessToken: {
                      type: "string"
                    },
                    refreshToken: {
                      type: "string"
                    },
                    accessTokenExpiresAt: {
                      type: "string",
                      format: "date-time"
                    },
                    refreshTokenExpiresAt: {
                      type: "string",
                      format: "date-time"
                    }
                  }
                }
              }
            }
          },
          400: {
            description: "Invalid refresh token or provider configuration"
          }
        }
      }
    }
  },
  async (ctx) => {
    const { providerId, accountId, userId } = ctx.body;
    const req = ctx.request;
    const session = await getSessionFromCtx(ctx);
    if (req && !session) {
      throw ctx.error("UNAUTHORIZED");
    }
    let resolvedUserId = session?.user?.id || userId;
    if (!resolvedUserId) {
      throw new betterCall.APIError("BAD_REQUEST", {
        message: `Either userId or session is required`
      });
    }
    if (!ctx.context.socialProviders.find((p) => p.id === providerId)) {
      throw new betterCall.APIError("BAD_REQUEST", {
        message: `Provider ${providerId} is not supported.`
      });
    }
    const accounts = await ctx.context.internalAdapter.findAccounts(resolvedUserId);
    const account = accounts.find(
      (acc) => accountId ? acc.id === accountId && acc.providerId === providerId : acc.providerId === providerId
    );
    if (!account) {
      throw new betterCall.APIError("BAD_REQUEST", {
        message: "Account not found"
      });
    }
    const provider = ctx.context.socialProviders.find(
      (p) => p.id === providerId
    );
    if (!provider) {
      throw new betterCall.APIError("BAD_REQUEST", {
        message: `Provider ${providerId} not found.`
      });
    }
    if (!provider.refreshAccessToken) {
      throw new betterCall.APIError("BAD_REQUEST", {
        message: `Provider ${providerId} does not support token refreshing.`
      });
    }
    try {
      const tokens = await provider.refreshAccessToken(
        account.refreshToken
      );
      await ctx.context.internalAdapter.updateAccount(account.id, {
        accessToken: tokens.accessToken,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
        refreshToken: tokens.refreshToken,
        refreshTokenExpiresAt: tokens.refreshTokenExpiresAt
      });
      return ctx.json(tokens);
    } catch (error) {
      throw new betterCall.APIError("BAD_REQUEST", {
        message: "Failed to refresh access token",
        cause: error
      });
    }
  }
);
const accountInfo = createAuthEndpoint(
  "/account-info",
  {
    method: "POST",
    use: [sessionMiddleware],
    metadata: {
      openapi: {
        description: "Get the account info provided by the provider",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: {
                      type: "object",
                      properties: {
                        id: {
                          type: "string"
                        },
                        name: {
                          type: "string"
                        },
                        email: {
                          type: "string"
                        },
                        image: {
                          type: "string"
                        },
                        emailVerified: {
                          type: "boolean"
                        }
                      },
                      required: ["id", "emailVerified"]
                    },
                    data: {
                      type: "object",
                      properties: {},
                      additionalProperties: true
                    }
                  },
                  required: ["user", "data"],
                  additionalProperties: false
                }
              }
            }
          }
        }
      }
    },
    body: zod.z.object({
      accountId: zod.z.string({
        description: "The provider given account id for which to get the account info"
      })
    })
  },
  async (ctx) => {
    const account = await ctx.context.internalAdapter.findAccount(
      ctx.body.accountId
    );
    if (!account || account.userId !== ctx.context.session.user.id) {
      throw new betterCall.APIError("BAD_REQUEST", {
        message: "Account not found"
      });
    }
    const provider = ctx.context.socialProviders.find(
      (p) => p.id === account.providerId
    );
    if (!provider) {
      throw new betterCall.APIError("INTERNAL_SERVER_ERROR", {
        message: `Provider account provider is ${account.providerId} but it is not configured`
      });
    }
    const tokens = await getAccessToken({
      ...ctx,
      body: {
        accountId: account.id,
        providerId: account.providerId
      },
      returnHeaders: false
    });
    const info = await provider.getUserInfo(tokens);
    return ctx.json(info);
  }
);

exports.BASE_ERROR_CODES = BASE_ERROR_CODES;
exports.HIDE_METADATA = HIDE_METADATA;
exports.accountInfo = accountInfo;
exports.callbackOAuth = callbackOAuth;
exports.changeEmail = changeEmail;
exports.changePassword = changePassword;
exports.createAuthEndpoint = createAuthEndpoint;
exports.createAuthMiddleware = createAuthMiddleware;
exports.createEmailVerificationToken = createEmailVerificationToken;
exports.deleteUser = deleteUser;
exports.deleteUserCallback = deleteUserCallback;
exports.error = error;
exports.forgetPassword = forgetPassword;
exports.forgetPasswordCallback = forgetPasswordCallback;
exports.freshSessionMiddleware = freshSessionMiddleware;
exports.getAccessToken = getAccessToken;
exports.getSession = getSession;
exports.getSessionFromCtx = getSessionFromCtx;
exports.handleOAuthUserInfo = handleOAuthUserInfo;
exports.linkSocialAccount = linkSocialAccount;
exports.listSessions = listSessions;
exports.listUserAccounts = listUserAccounts;
exports.ok = ok;
exports.optionsMiddleware = optionsMiddleware;
exports.originCheck = originCheck;
exports.originCheckMiddleware = originCheckMiddleware;
exports.refreshToken = refreshToken;
exports.requestOnlySessionMiddleware = requestOnlySessionMiddleware;
exports.requestPasswordReset = requestPasswordReset;
exports.requestPasswordResetCallback = requestPasswordResetCallback;
exports.resetPassword = resetPassword;
exports.revokeOtherSessions = revokeOtherSessions;
exports.revokeSession = revokeSession;
exports.revokeSessions = revokeSessions;
exports.sendVerificationEmail = sendVerificationEmail;
exports.sendVerificationEmailFn = sendVerificationEmailFn;
exports.sessionMiddleware = sessionMiddleware;
exports.setPassword = setPassword;
exports.signInEmail = signInEmail;
exports.signInSocial = signInSocial;
exports.signOut = signOut;
exports.unlinkAccount = unlinkAccount;
exports.updateUser = updateUser;
exports.verifyEmail = verifyEmail;
exports.wildcardMatch = wildcardMatch;
