import { B as BetterAuthError } from '../shared/better-auth.DdzSJf-n.mjs';
import { g as getDate } from '../shared/better-auth.CW6D9eSx.mjs';
import { a as isProduction, e as env } from '../shared/better-auth.8zoxzg-F.mjs';
import { base64Url } from '@better-auth/utils/base64';
import { createHMAC } from '@better-auth/utils/hmac';
import { s as safeJSONParse } from '../shared/better-auth.tB5eU6EY.mjs';
import { a as getBaseURL } from '../shared/better-auth.VTXNLFMT.mjs';
import { binary } from '@better-auth/utils/binary';

const createTime = (value, format) => {
  const toMilliseconds = () => {
    switch (format) {
      case "ms":
        return value;
      case "s":
        return value * 1e3;
      case "m":
        return value * 1e3 * 60;
      case "h":
        return value * 1e3 * 60 * 60;
      case "d":
        return value * 1e3 * 60 * 60 * 24;
      case "w":
        return value * 1e3 * 60 * 60 * 24 * 7;
      case "y":
        return value * 1e3 * 60 * 60 * 24 * 365;
    }
  };
  const time = {
    t: `${value}${format}`,
    value,
    tFormat: format,
    toMilliseconds,
    toSeconds: () => time.toMilliseconds() / 1e3,
    toMinutes: () => time.toSeconds() / 60,
    toHours: () => time.toMinutes() / 60,
    toDays: () => time.toHours() / 24,
    toWeeks: () => time.toDays() / 7,
    toYears: () => time.toDays() / 365,
    getDate: () => new Date(Date.now() + time.toMilliseconds()),
    add: (other) => {
      const otherMs = typeof other === "string" ? parseTime(other).toMilliseconds() : other.toMilliseconds();
      return createTime(time.toMilliseconds() + otherMs, "ms");
    },
    subtract: (other) => {
      const otherMs = typeof other === "string" ? parseTime(other).toMilliseconds() : other.toMilliseconds();
      return createTime(time.toMilliseconds() - otherMs, "ms");
    },
    multiply: (factor) => createTime(time.toMilliseconds() * factor, "ms"),
    divide: (divisor) => createTime(time.toMilliseconds() / divisor, "ms"),
    equals: (other) => {
      const otherMs = typeof other === "string" ? parseTime(other).toMilliseconds() : other.toMilliseconds();
      return time.toMilliseconds() === otherMs;
    },
    lessThan: (other) => {
      const otherMs = typeof other === "string" ? parseTime(other).toMilliseconds() : other.toMilliseconds();
      return time.toMilliseconds() < otherMs;
    },
    greaterThan: (other) => {
      const otherMs = typeof other === "string" ? parseTime(other).toMilliseconds() : other.toMilliseconds();
      return time.toMilliseconds() > otherMs;
    },
    format: (pattern) => {
      const date = time.getDate();
      return pattern.replace(/YYYY|MM|DD|HH|mm|ss/g, (match) => {
        switch (match) {
          case "YYYY":
            return date.getFullYear().toString();
          case "MM":
            return (date.getMonth() + 1).toString().padStart(2, "0");
          case "DD":
            return date.getDate().toString().padStart(2, "0");
          case "HH":
            return date.getHours().toString().padStart(2, "0");
          case "mm":
            return date.getMinutes().toString().padStart(2, "0");
          case "ss":
            return date.getSeconds().toString().padStart(2, "0");
          default:
            return match;
        }
      });
    },
    fromNow: () => {
      const ms = time.toMilliseconds();
      if (ms < 0) return time.ago();
      if (ms < 1e3) return "in a few seconds";
      if (ms < 6e4) return `in ${Math.round(ms / 1e3)} seconds`;
      if (ms < 36e5) return `in ${Math.round(ms / 6e4)} minutes`;
      if (ms < 864e5) return `in ${Math.round(ms / 36e5)} hours`;
      if (ms < 6048e5) return `in ${Math.round(ms / 864e5)} days`;
      if (ms < 26298e5) return `in ${Math.round(ms / 6048e5)} weeks`;
      if (ms < 315576e5) return `in ${Math.round(ms / 26298e5)} months`;
      return `in ${Math.round(ms / 315576e5)} years`;
    },
    ago: () => {
      const ms = -time.toMilliseconds();
      if (ms < 0) return time.fromNow();
      if (ms < 1e3) return "a few seconds ago";
      if (ms < 6e4) return `${Math.round(ms / 1e3)} seconds ago`;
      if (ms < 36e5) return `${Math.round(ms / 6e4)} minutes ago`;
      if (ms < 864e5) return `${Math.round(ms / 36e5)} hours ago`;
      if (ms < 6048e5) return `${Math.round(ms / 864e5)} days ago`;
      if (ms < 26298e5) return `${Math.round(ms / 6048e5)} weeks ago`;
      if (ms < 315576e5) return `${Math.round(ms / 26298e5)} months ago`;
      return `${Math.round(ms / 315576e5)} years ago`;
    }
  };
  return time;
};
const parseTime = (time) => {
  const match = time.match(/^(\d+)(ms|s|m|h|d|w|y)$/);
  if (!match) throw new Error("Invalid time format");
  return createTime(parseInt(match[1]), match[2]);
};

function parseSetCookieHeader(setCookie) {
  const cookies = /* @__PURE__ */ new Map();
  const cookieArray = setCookie.split(", ");
  cookieArray.forEach((cookieString) => {
    const parts = cookieString.split(";").map((part) => part.trim());
    const [nameValue, ...attributes] = parts;
    const [name, ...valueParts] = nameValue.split("=");
    const value = valueParts.join("=");
    if (!name || value === void 0) {
      return;
    }
    const attrObj = { value };
    attributes.forEach((attribute) => {
      const [attrName, ...attrValueParts] = attribute.split("=");
      const attrValue = attrValueParts.join("=");
      const normalizedAttrName = attrName.trim().toLowerCase();
      switch (normalizedAttrName) {
        case "max-age":
          attrObj["max-age"] = attrValue ? parseInt(attrValue.trim(), 10) : void 0;
          break;
        case "expires":
          attrObj.expires = attrValue ? new Date(attrValue.trim()) : void 0;
          break;
        case "domain":
          attrObj.domain = attrValue ? attrValue.trim() : void 0;
          break;
        case "path":
          attrObj.path = attrValue ? attrValue.trim() : void 0;
          break;
        case "secure":
          attrObj.secure = true;
          break;
        case "httponly":
          attrObj.httponly = true;
          break;
        case "samesite":
          attrObj.samesite = attrValue ? attrValue.trim().toLowerCase() : void 0;
          break;
        default:
          attrObj[normalizedAttrName] = attrValue ? attrValue.trim() : true;
          break;
      }
    });
    cookies.set(name, attrObj);
  });
  return cookies;
}
function setCookieToHeader(headers) {
  return (context) => {
    const setCookieHeader = context.response.headers.get("set-cookie");
    if (!setCookieHeader) {
      return;
    }
    const cookieMap = /* @__PURE__ */ new Map();
    const existingCookiesHeader = headers.get("cookie") || "";
    existingCookiesHeader.split(";").forEach((cookie) => {
      const [name, ...rest] = cookie.trim().split("=");
      if (name && rest.length > 0) {
        cookieMap.set(name, rest.join("="));
      }
    });
    const setCookieHeaders = setCookieHeader.split(",");
    setCookieHeaders.forEach((header) => {
      const cookies = parseSetCookieHeader(header);
      cookies.forEach((value, name) => {
        cookieMap.set(name, value.value);
      });
    });
    const updatedCookies = Array.from(cookieMap.entries()).map(([name, value]) => `${name}=${value}`).join("; ");
    headers.set("cookie", updatedCookies);
  };
}

function createCookieGetter(options) {
  const secure = options.advanced?.useSecureCookies !== void 0 ? options.advanced?.useSecureCookies : options.baseURL !== void 0 ? options.baseURL.startsWith("https://") ? true : false : isProduction;
  const secureCookiePrefix = secure ? "__Secure-" : "";
  const crossSubdomainEnabled = !!options.advanced?.crossSubDomainCookies?.enabled;
  const domain = crossSubdomainEnabled ? options.advanced?.crossSubDomainCookies?.domain || (options.baseURL ? new URL(options.baseURL).hostname : void 0) : void 0;
  if (crossSubdomainEnabled && !domain) {
    throw new BetterAuthError(
      "baseURL is required when crossSubdomainCookies are enabled"
    );
  }
  function createCookie(cookieName, overrideAttributes = {}) {
    const prefix = options.advanced?.cookiePrefix || "better-auth";
    const name = options.advanced?.cookies?.[cookieName]?.name || `${prefix}.${cookieName}`;
    const attributes = options.advanced?.cookies?.[cookieName]?.attributes;
    return {
      name: `${secureCookiePrefix}${name}`,
      attributes: {
        secure: !!secureCookiePrefix,
        sameSite: "lax",
        path: "/",
        httpOnly: true,
        ...crossSubdomainEnabled ? { domain } : {},
        ...options.advanced?.defaultCookieAttributes,
        ...overrideAttributes,
        ...attributes
      }
    };
  }
  return createCookie;
}
function getCookies(options) {
  const createCookie = createCookieGetter(options);
  const sessionMaxAge = options.session?.expiresIn || createTime(7, "d").toSeconds();
  const sessionToken = createCookie("session_token", {
    maxAge: sessionMaxAge
  });
  const sessionData = createCookie("session_data", {
    maxAge: options.session?.cookieCache?.maxAge || 60 * 5
  });
  const dontRememberToken = createCookie("dont_remember");
  return {
    sessionToken: {
      name: sessionToken.name,
      options: sessionToken.attributes
    },
    /**
     * This cookie is used to store the session data in the cookie
     * This is useful for when you want to cache the session in the cookie
     */
    sessionData: {
      name: sessionData.name,
      options: sessionData.attributes
    },
    dontRememberToken: {
      name: dontRememberToken.name,
      options: dontRememberToken.attributes
    }
  };
}
async function setCookieCache(ctx, session) {
  const shouldStoreSessionDataInCookie = ctx.context.options.session?.cookieCache?.enabled;
  if (shouldStoreSessionDataInCookie) {
    const filteredSession = Object.entries(session.session).reduce(
      (acc, [key, value]) => {
        const fieldConfig = ctx.context.options.session?.additionalFields?.[key];
        if (!fieldConfig || fieldConfig.returned !== false) {
          acc[key] = value;
        }
        return acc;
      },
      {}
    );
    const sessionData = { session: filteredSession, user: session.user };
    const data = base64Url.encode(
      JSON.stringify({
        session: sessionData,
        expiresAt: getDate(
          ctx.context.authCookies.sessionData.options.maxAge || 60,
          "sec"
        ).getTime(),
        signature: await createHMAC("SHA-256", "base64urlnopad").sign(
          ctx.context.secret,
          JSON.stringify({
            ...sessionData,
            expiresAt: getDate(
              ctx.context.authCookies.sessionData.options.maxAge || 60,
              "sec"
            ).getTime()
          })
        )
      }),
      {
        padding: false
      }
    );
    if (data.length > 4093) {
      throw new BetterAuthError(
        "Session data is too large to store in the cookie. Please disable session cookie caching or reduce the size of the session data"
      );
    }
    ctx.setCookie(
      ctx.context.authCookies.sessionData.name,
      data,
      ctx.context.authCookies.sessionData.options
    );
  }
}
async function setSessionCookie(ctx, session, dontRememberMe, overrides) {
  const dontRememberMeCookie = await ctx.getSignedCookie(
    ctx.context.authCookies.dontRememberToken.name,
    ctx.context.secret
  );
  dontRememberMe = dontRememberMe !== void 0 ? dontRememberMe : !!dontRememberMeCookie;
  const options = ctx.context.authCookies.sessionToken.options;
  const maxAge = dontRememberMe ? void 0 : ctx.context.sessionConfig.expiresIn;
  await ctx.setSignedCookie(
    ctx.context.authCookies.sessionToken.name,
    session.session.token,
    ctx.context.secret,
    {
      ...options,
      maxAge,
      ...overrides
    }
  );
  if (dontRememberMe) {
    await ctx.setSignedCookie(
      ctx.context.authCookies.dontRememberToken.name,
      "true",
      ctx.context.secret,
      ctx.context.authCookies.dontRememberToken.options
    );
  }
  await setCookieCache(ctx, session);
  ctx.context.setNewSession(session);
  if (ctx.context.options.secondaryStorage) {
    await ctx.context.secondaryStorage?.set(
      session.session.token,
      JSON.stringify({
        user: session.user,
        session: session.session
      }),
      Math.floor(
        (new Date(session.session.expiresAt).getTime() - Date.now()) / 1e3
      )
    );
  }
}
function deleteSessionCookie(ctx, skipDontRememberMe) {
  ctx.setCookie(ctx.context.authCookies.sessionToken.name, "", {
    ...ctx.context.authCookies.sessionToken.options,
    maxAge: 0
  });
  ctx.setCookie(ctx.context.authCookies.sessionData.name, "", {
    ...ctx.context.authCookies.sessionData.options,
    maxAge: 0
  });
  if (!skipDontRememberMe) {
    ctx.setCookie(ctx.context.authCookies.dontRememberToken.name, "", {
      ...ctx.context.authCookies.dontRememberToken.options,
      maxAge: 0
    });
  }
}
function parseCookies(cookieHeader) {
  const cookies = cookieHeader.split("; ");
  const cookieMap = /* @__PURE__ */ new Map();
  cookies.forEach((cookie) => {
    const [name, value] = cookie.split("=");
    cookieMap.set(name, value);
  });
  return cookieMap;
}
const getSessionCookie = (request, config) => {
  if (config?.cookiePrefix) {
    if (config.cookieName) {
      config.cookiePrefix = `${config.cookiePrefix}-`;
    } else {
      config.cookiePrefix = `${config.cookiePrefix}.`;
    }
  }
  const headers = "headers" in request ? request.headers : request;
  const req = request instanceof Request ? request : void 0;
  getBaseURL(req?.url, config?.path, req);
  const cookies = headers.get("cookie");
  if (!cookies) {
    return null;
  }
  const { cookieName = "session_token", cookiePrefix = "better-auth." } = config || {};
  const name = `${cookiePrefix}${cookieName}`;
  const secureCookieName = `__Secure-${name}`;
  const parsedCookie = parseCookies(cookies);
  const sessionToken = parsedCookie.get(name) || parsedCookie.get(secureCookieName);
  if (sessionToken) {
    return sessionToken;
  }
  return null;
};
const getCookieCache = async (request, config) => {
  const headers = request instanceof Headers ? request : request.headers;
  const cookies = headers.get("cookie");
  if (!cookies) {
    return null;
  }
  const { cookieName = "session_data", cookiePrefix = "better-auth" } = config || {};
  const name = config?.isSecure !== void 0 ? config.isSecure ? `__Secure-${cookiePrefix}.${cookieName}` : `${cookiePrefix}.${cookieName}` : isProduction ? `__Secure-${cookiePrefix}.${cookieName}` : `${cookiePrefix}.${cookieName}`;
  const parsedCookie = parseCookies(cookies);
  const sessionData = parsedCookie.get(name);
  if (sessionData) {
    const sessionDataPayload = safeJSONParse(binary.decode(base64Url.decode(sessionData)));
    if (!sessionDataPayload) {
      return null;
    }
    const secret = config?.secret || env.BETTER_AUTH_SECRET;
    if (!secret) {
      throw new BetterAuthError(
        "getCookieCache requires a secret to be provided. Either pass it as an option or set the BETTER_AUTH_SECRET environment variable"
      );
    }
    const isValid = await createHMAC("SHA-256", "base64urlnopad").verify(
      secret,
      JSON.stringify({
        ...sessionDataPayload.session,
        expiresAt: sessionDataPayload.expiresAt
      }),
      sessionDataPayload.signature
    );
    if (!isValid) {
      return null;
    }
    return sessionDataPayload.session;
  }
  return null;
};

export { createCookieGetter, deleteSessionCookie, getCookieCache, getCookies, getSessionCookie, parseCookies, parseSetCookieHeader, setCookieCache, setCookieToHeader, setSessionCookie };
