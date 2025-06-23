import { base64Url } from '@better-auth/utils/base64';
import { betterFetch } from '@better-fetch/fetch';
import { jwtVerify } from 'jose';
import { g as getDate } from './better-auth.CW6D9eSx.mjs';
import { createHash } from '@better-auth/utils/hash';

async function generateCodeChallenge(codeVerifier) {
  const codeChallengeBytes = await createHash("SHA-256").digest(codeVerifier);
  return base64Url.encode(new Uint8Array(codeChallengeBytes), {
    padding: false
  });
}
function getOAuth2Tokens(data) {
  return {
    tokenType: data.token_type,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    accessTokenExpiresAt: data.expires_in ? getDate(data.expires_in, "sec") : void 0,
    scopes: data?.scope ? typeof data.scope === "string" ? data.scope.split(" ") : data.scope : [],
    idToken: data.id_token
  };
}
const encodeOAuthParameter = (value) => encodeURIComponent(value).replace(/%20/g, "+");

async function createAuthorizationURL({
  id,
  options,
  authorizationEndpoint,
  state,
  codeVerifier,
  scopes,
  claims,
  redirectURI,
  duration,
  prompt,
  accessType,
  responseType,
  display,
  loginHint,
  hd,
  responseMode,
  additionalParams,
  scopeJoiner
}) {
  const url = new URL(authorizationEndpoint);
  url.searchParams.set("response_type", responseType || "code");
  url.searchParams.set("client_id", options.clientId);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", scopes.join(scopeJoiner || " "));
  url.searchParams.set("redirect_uri", options.redirectURI || redirectURI);
  duration && url.searchParams.set("duration", duration);
  display && url.searchParams.set("display", display);
  loginHint && url.searchParams.set("login_hint", loginHint);
  prompt && url.searchParams.set("prompt", prompt);
  hd && url.searchParams.set("hd", hd);
  accessType && url.searchParams.set("access_type", accessType);
  responseMode && url.searchParams.set("response_mode", responseMode);
  if (codeVerifier) {
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("code_challenge", codeChallenge);
  }
  if (claims) {
    const claimsObj = claims.reduce(
      (acc, claim) => {
        acc[claim] = null;
        return acc;
      },
      {}
    );
    url.searchParams.set(
      "claims",
      JSON.stringify({
        id_token: { email: null, email_verified: null, ...claimsObj }
      })
    );
  }
  if (additionalParams) {
    Object.entries(additionalParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return url;
}

async function validateAuthorizationCode({
  code,
  codeVerifier,
  redirectURI,
  options,
  tokenEndpoint,
  authentication,
  deviceId,
  headers
}) {
  const body = new URLSearchParams();
  const requestHeaders = {
    "content-type": "application/x-www-form-urlencoded",
    accept: "application/json",
    "user-agent": "better-auth",
    ...headers
  };
  body.set("grant_type", "authorization_code");
  body.set("code", code);
  codeVerifier && body.set("code_verifier", codeVerifier);
  options.clientKey && body.set("client_key", options.clientKey);
  deviceId && body.set("device_id", deviceId);
  body.set("redirect_uri", options.redirectURI || redirectURI);
  if (authentication === "basic") {
    const encodedCredentials = base64Url.encode(
      `${options.clientId}:${options.clientSecret}`
    );
    requestHeaders["authorization"] = `Basic ${encodedCredentials}`;
  } else {
    body.set("client_id", options.clientId);
    body.set("client_secret", options.clientSecret);
  }
  const { data, error } = await betterFetch(tokenEndpoint, {
    method: "POST",
    body,
    headers: requestHeaders
  });
  if (error) {
    throw error;
  }
  const tokens = getOAuth2Tokens(data);
  return tokens;
}
async function validateToken(token, jwksEndpoint) {
  const { data, error } = await betterFetch(jwksEndpoint, {
    method: "GET",
    headers: {
      accept: "application/json",
      "user-agent": "better-auth"
    }
  });
  if (error) {
    throw error;
  }
  const keys = data["keys"];
  const header = JSON.parse(atob(token.split(".")[0]));
  const key = keys.find((key2) => key2.kid === header.kid);
  if (!key) {
    throw new Error("Key not found");
  }
  const verified = await jwtVerify(token, key);
  return verified;
}

async function refreshAccessToken({
  refreshToken,
  options,
  tokenEndpoint,
  authentication,
  extraParams,
  grantType = "refresh_token"
}) {
  const body = new URLSearchParams();
  const headers = {
    "content-type": "application/x-www-form-urlencoded",
    accept: "application/json"
  };
  body.set("grant_type", grantType);
  body.set("refresh_token", refreshToken);
  if (authentication === "basic") {
    const encodedCredentials = base64Url.encode(
      `${options.clientId}:${options.clientSecret}`
    );
    headers["authorization"] = `Basic ${encodedCredentials}`;
  } else {
    body.set("client_id", options.clientId);
    body.set("client_secret", options.clientSecret);
  }
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      body.set(key, value);
    }
  }
  const { data, error } = await betterFetch(tokenEndpoint, {
    method: "POST",
    body,
    headers
  });
  if (error) {
    throw error;
  }
  const tokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenType: data.token_type,
    scopes: data.scope?.split(" "),
    idToken: data.id_token
  };
  if (data.expires_in) {
    const now = /* @__PURE__ */ new Date();
    tokens.accessTokenExpiresAt = new Date(
      now.getTime() + data.expires_in * 1e3
    );
  }
  return tokens;
}

export { validateToken as a, getOAuth2Tokens as b, createAuthorizationURL as c, encodeOAuthParameter as e, generateCodeChallenge as g, refreshAccessToken as r, validateAuthorizationCode as v };
