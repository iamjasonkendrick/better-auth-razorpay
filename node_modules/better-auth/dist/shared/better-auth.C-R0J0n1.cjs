'use strict';

const env = require('./better-auth.DiSjtgs9.cjs');
const index = require('./better-auth.ANpbi45u.cjs');

function checkHasPath(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.pathname !== "/";
  } catch (error) {
    throw new index.BetterAuthError(
      `Invalid base URL: ${url}. Please provide a valid base URL.`
    );
  }
}
function withPath(url, path = "/api/auth") {
  const hasPath = checkHasPath(url);
  if (hasPath) {
    return url;
  }
  path = path.startsWith("/") ? path : `/${path}`;
  return `${url.replace(/\/+$/, "")}${path}`;
}
function getBaseURL(url, path, request) {
  if (url) {
    return withPath(url, path);
  }
  const fromEnv = env.env.BETTER_AUTH_URL || env.env.NEXT_PUBLIC_BETTER_AUTH_URL || env.env.PUBLIC_BETTER_AUTH_URL || env.env.NUXT_PUBLIC_BETTER_AUTH_URL || env.env.NUXT_PUBLIC_AUTH_URL || (env.env.BASE_URL !== "/" ? env.env.BASE_URL : void 0);
  if (fromEnv) {
    return withPath(fromEnv, path);
  }
  const fromRequest = request?.headers.get("x-forwarded-host");
  const fromRequestProto = request?.headers.get("x-forwarded-proto");
  if (fromRequest && fromRequestProto) {
    return withPath(`${fromRequestProto}://${fromRequest}`, path);
  }
  if (request) {
    const url2 = getOrigin(request.url);
    if (!url2) {
      throw new index.BetterAuthError(
        "Could not get origin from request. Please provide a valid base URL."
      );
    }
    return withPath(url2, path);
  }
  if (typeof window !== "undefined" && window.location) {
    return withPath(window.location.origin, path);
  }
  return void 0;
}
function getOrigin(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.origin;
  } catch (error) {
    return null;
  }
}
function getProtocol(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol;
  } catch (error) {
    return null;
  }
}
function getHost(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.host;
  } catch (error) {
    return url;
  }
}

exports.getBaseURL = getBaseURL;
exports.getHost = getHost;
exports.getOrigin = getOrigin;
exports.getProtocol = getProtocol;
