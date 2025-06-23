import { e as env } from './better-auth.8zoxzg-F.mjs';
import { B as BetterAuthError } from './better-auth.DdzSJf-n.mjs';

function checkHasPath(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.pathname !== "/";
  } catch (error) {
    throw new BetterAuthError(
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
  const fromEnv = env.BETTER_AUTH_URL || env.NEXT_PUBLIC_BETTER_AUTH_URL || env.PUBLIC_BETTER_AUTH_URL || env.NUXT_PUBLIC_BETTER_AUTH_URL || env.NUXT_PUBLIC_AUTH_URL || (env.BASE_URL !== "/" ? env.BASE_URL : void 0);
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
      throw new BetterAuthError(
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

export { getBaseURL as a, getHost as b, getProtocol as c, getOrigin as g };
