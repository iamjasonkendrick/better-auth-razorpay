import { SignJWT } from 'jose';
import { z } from 'zod';
import { APIError } from 'better-call';
import { g as getSessionFromCtx, a as createAuthEndpoint, c as createAuthMiddleware, s as sessionMiddleware } from './better-auth.oUCDPPbQ.mjs';
import './better-auth.8zoxzg-F.mjs';
import { base64 } from '@better-auth/utils/base64';
import '@better-auth/utils/hmac';
import '@better-auth/utils/binary';
import { parseSetCookieHeader } from '../cookies/index.mjs';
import './better-auth.Cc72UxUH.mjs';
import './better-auth.Cqykj82J.mjs';
import 'defu';
import { createHash } from '@better-auth/utils/hash';
import '@noble/ciphers/chacha';
import '@noble/ciphers/utils';
import '@noble/ciphers/webcrypto';
import '@noble/hashes/scrypt';
import { subtle } from '@better-auth/utils';
import '@better-auth/utils/hex';
import '@noble/hashes/utils';
import { g as generateRandomString } from './better-auth.B4Qoxdgc.mjs';

const schema = {
  oauthApplication: {
    modelName: "oauthApplication",
    fields: {
      name: {
        type: "string"
      },
      icon: {
        type: "string",
        required: false
      },
      metadata: {
        type: "string",
        required: false
      },
      clientId: {
        type: "string",
        unique: true
      },
      clientSecret: {
        type: "string"
      },
      redirectURLs: {
        type: "string"
      },
      type: {
        type: "string"
      },
      disabled: {
        type: "boolean",
        required: false,
        defaultValue: false
      },
      userId: {
        type: "string",
        required: false
      },
      createdAt: {
        type: "date"
      },
      updatedAt: {
        type: "date"
      }
    }
  },
  oauthAccessToken: {
    modelName: "oauthAccessToken",
    fields: {
      accessToken: {
        type: "string",
        unique: true
      },
      refreshToken: {
        type: "string",
        unique: true
      },
      accessTokenExpiresAt: {
        type: "date"
      },
      refreshTokenExpiresAt: {
        type: "date"
      },
      clientId: {
        type: "string"
      },
      userId: {
        type: "string",
        required: false
      },
      scopes: {
        type: "string"
      },
      createdAt: {
        type: "date"
      },
      updatedAt: {
        type: "date"
      }
    }
  },
  oauthConsent: {
    modelName: "oauthConsent",
    fields: {
      clientId: {
        type: "string"
      },
      userId: {
        type: "string"
      },
      scopes: {
        type: "string"
      },
      createdAt: {
        type: "date"
      },
      updatedAt: {
        type: "date"
      },
      consentGiven: {
        type: "boolean"
      }
    }
  }
};

function redirectErrorURL(url, error, description) {
  return `${url.includes("?") ? "&" : "?"}error=${error}&error_description=${description}`;
}
async function authorize(ctx, options) {
  const handleRedirect = (url) => {
    const fromFetch = ctx.request?.headers.get("sec-fetch-mode") === "cors";
    if (fromFetch) {
      return ctx.json({
        redirect: true,
        url
      });
    } else {
      throw ctx.redirect(url);
    }
  };
  const opts = {
    codeExpiresIn: 600,
    defaultScope: "openid",
    ...options,
    scopes: [
      "openid",
      "profile",
      "email",
      "offline_access",
      ...options?.scopes || []
    ]
  };
  if (!ctx.request) {
    throw new APIError("UNAUTHORIZED", {
      error_description: "request not found",
      error: "invalid_request"
    });
  }
  const session = await getSessionFromCtx(ctx);
  if (!session) {
    await ctx.setSignedCookie(
      "oidc_login_prompt",
      JSON.stringify(ctx.query),
      ctx.context.secret,
      {
        maxAge: 600,
        path: "/",
        sameSite: "lax"
      }
    );
    const queryFromURL = ctx.request.url?.split("?")[1];
    return handleRedirect(`${options.loginPage}?${queryFromURL}`);
  }
  const query = ctx.query;
  if (!query.client_id) {
    return handleRedirect(`${ctx.context.baseURL}/error?error=invalid_client`);
  }
  if (!query.response_type) {
    return handleRedirect(
      redirectErrorURL(
        `${ctx.context.baseURL}/error`,
        "invalid_request",
        "response_type is required"
      )
    );
  }
  const client = await ctx.context.adapter.findOne({
    model: "oauthApplication",
    where: [
      {
        field: "clientId",
        value: ctx.query.client_id
      }
    ]
  }).then((res) => {
    if (!res) {
      return null;
    }
    return {
      ...res,
      redirectURLs: res.redirectURLs.split(","),
      metadata: res.metadata ? JSON.parse(res.metadata) : {}
    };
  });
  if (!client) {
    return handleRedirect(`${ctx.context.baseURL}/error?error=invalid_client`);
  }
  const redirectURI = client.redirectURLs.find(
    (url) => url === ctx.query.redirect_uri
  );
  if (!redirectURI || !query.redirect_uri) {
    throw new APIError("BAD_REQUEST", {
      message: "Invalid redirect URI"
    });
  }
  if (client.disabled) {
    return handleRedirect(`${ctx.context.baseURL}/error?error=client_disabled`);
  }
  if (query.response_type !== "code") {
    return handleRedirect(
      `${ctx.context.baseURL}/error?error=unsupported_response_type`
    );
  }
  const requestScope = query.scope?.split(" ").filter((s) => s) || opts.defaultScope.split(" ");
  const invalidScopes = requestScope.filter((scope) => {
    const isInvalid = !opts.scopes.includes(scope) || scope === "offline_access" && query.prompt !== "consent";
    return isInvalid;
  });
  if (invalidScopes.length) {
    return handleRedirect(
      redirectErrorURL(
        query.redirect_uri,
        "invalid_scope",
        `The following scopes are invalid: ${invalidScopes.join(", ")}`
      )
    );
  }
  if ((!query.code_challenge || !query.code_challenge_method) && options.requirePKCE) {
    return handleRedirect(
      redirectErrorURL(
        query.redirect_uri,
        "invalid_request",
        "pkce is required"
      )
    );
  }
  if (!query.code_challenge_method) {
    query.code_challenge_method = "plain";
  }
  if (![
    "s256",
    options.allowPlainCodeChallengeMethod ? "plain" : "s256"
  ].includes(query.code_challenge_method?.toLowerCase() || "")) {
    return handleRedirect(
      redirectErrorURL(
        query.redirect_uri,
        "invalid_request",
        "invalid code_challenge method"
      )
    );
  }
  const code = generateRandomString(32, "a-z", "A-Z", "0-9");
  const codeExpiresInMs = opts.codeExpiresIn * 1e3;
  const expiresAt = new Date(Date.now() + codeExpiresInMs);
  try {
    await ctx.context.internalAdapter.createVerificationValue(
      {
        value: JSON.stringify({
          clientId: client.clientId,
          redirectURI: query.redirect_uri,
          scope: requestScope,
          userId: session.user.id,
          authTime: session.session.createdAt.getTime(),
          /**
           * If the prompt is set to `consent`, then we need
           * to require the user to consent to the scopes.
           *
           * This means the code now needs to be treated as a
           * consent request.
           *
           * once the user consents, the code will be updated
           * with the actual code. This is to prevent the
           * client from using the code before the user
           * consents.
           */
          requireConsent: query.prompt === "consent",
          state: query.prompt === "consent" ? query.state : null,
          codeChallenge: query.code_challenge,
          codeChallengeMethod: query.code_challenge_method,
          nonce: query.nonce
        }),
        identifier: code,
        expiresAt
      },
      ctx
    );
  } catch (e) {
    return handleRedirect(
      redirectErrorURL(
        query.redirect_uri,
        "server_error",
        "An error occurred while processing the request"
      )
    );
  }
  const redirectURIWithCode = new URL(redirectURI);
  redirectURIWithCode.searchParams.set("code", code);
  redirectURIWithCode.searchParams.set("state", ctx.query.state);
  if (query.prompt !== "consent") {
    return handleRedirect(redirectURIWithCode.toString());
  }
  const hasAlreadyConsented = await ctx.context.adapter.findOne({
    model: "oauthConsent",
    where: [
      {
        field: "clientId",
        value: client.clientId
      },
      {
        field: "userId",
        value: session.user.id
      }
    ]
  }).then((res) => !!res?.consentGiven);
  if (hasAlreadyConsented) {
    return handleRedirect(redirectURIWithCode.toString());
  }
  if (options?.consentPage) {
    await ctx.setSignedCookie("oidc_consent_prompt", code, ctx.context.secret, {
      maxAge: 600,
      path: "/",
      sameSite: "lax"
    });
    const consentURI = `${options.consentPage}?client_id=${client.clientId}&scope=${requestScope.join(" ")}`;
    return handleRedirect(consentURI);
  }
  const htmlFn = options?.getConsentHTML;
  if (!htmlFn) {
    throw new APIError("INTERNAL_SERVER_ERROR", {
      message: "No consent page provided"
    });
  }
  return new Response(
    htmlFn({
      scopes: requestScope,
      clientMetadata: client.metadata,
      clientIcon: client?.icon,
      clientId: client.clientId,
      clientName: client.name,
      code
    }),
    {
      headers: {
        "content-type": "text/html"
      }
    }
  );
}

const getMetadata = (ctx, options) => {
  const issuer = ctx.context.options.baseURL;
  const baseURL = ctx.context.baseURL;
  return {
    issuer,
    authorization_endpoint: `${baseURL}/oauth2/authorize`,
    token_endpoint: `${baseURL}/oauth2/token`,
    userinfo_endpoint: `${baseURL}/oauth2/userinfo`,
    jwks_uri: `${baseURL}/jwks`,
    registration_endpoint: `${baseURL}/oauth2/register`,
    scopes_supported: ["openid", "profile", "email", "offline_access"],
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code"],
    acr_values_supported: [
      "urn:mace:incommon:iap:silver",
      "urn:mace:incommon:iap:bronze"
    ],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256", "none"],
    token_endpoint_auth_methods_supported: [
      "client_secret_basic",
      "client_secret_post"
    ],
    code_challenge_methods_supported: ["S256"],
    claims_supported: [
      "sub",
      "iss",
      "aud",
      "exp",
      "nbf",
      "iat",
      "jti",
      "email",
      "email_verified",
      "name"
    ],
    ...options?.metadata
  };
};
const oidcProvider = (options) => {
  const modelName = {
    oauthClient: "oauthApplication",
    oauthAccessToken: "oauthAccessToken",
    oauthConsent: "oauthConsent"
  };
  const opts = {
    codeExpiresIn: 600,
    defaultScope: "openid",
    accessTokenExpiresIn: 3600,
    refreshTokenExpiresIn: 604800,
    allowPlainCodeChallengeMethod: true,
    ...options,
    scopes: [
      "openid",
      "profile",
      "email",
      "offline_access",
      ...options?.scopes || []
    ]
  };
  return {
    id: "oidc",
    hooks: {
      after: [
        {
          matcher() {
            return true;
          },
          handler: createAuthMiddleware(async (ctx) => {
            const cookie = await ctx.getSignedCookie(
              "oidc_login_prompt",
              ctx.context.secret
            );
            const cookieName = ctx.context.authCookies.sessionToken.name;
            const parsedSetCookieHeader = parseSetCookieHeader(
              ctx.context.responseHeaders?.get("set-cookie") || ""
            );
            const hasSessionToken = parsedSetCookieHeader.has(cookieName);
            if (!cookie || !hasSessionToken) {
              return;
            }
            ctx.setCookie("oidc_login_prompt", "", {
              maxAge: 0
            });
            const sessionCookie = parsedSetCookieHeader.get(cookieName)?.value;
            const sessionToken = sessionCookie?.split(".")[0];
            if (!sessionToken) {
              return;
            }
            const session = await ctx.context.internalAdapter.findSession(sessionToken);
            if (!session) {
              return;
            }
            ctx.query = JSON.parse(cookie);
            ctx.query.prompt = "consent";
            ctx.context.session = session;
            const response = await authorize(ctx, opts);
            return response;
          })
        }
      ]
    },
    endpoints: {
      getOpenIdConfig: createAuthEndpoint(
        "/.well-known/openid-configuration",
        {
          method: "GET",
          metadata: {
            isAction: false
          }
        },
        async (ctx) => {
          const metadata = getMetadata(ctx, options);
          return ctx.json(metadata);
        }
      ),
      oAuth2authorize: createAuthEndpoint(
        "/oauth2/authorize",
        {
          method: "GET",
          query: z.record(z.string(), z.any()),
          metadata: {
            openapi: {
              description: "Authorize an OAuth2 request",
              responses: {
                "200": {
                  description: "Authorization response generated successfully",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        additionalProperties: true,
                        description: "Authorization response, contents depend on the authorize function implementation"
                      }
                    }
                  }
                }
              }
            }
          }
        },
        async (ctx) => {
          return authorize(ctx, opts);
        }
      ),
      oAuthConsent: createAuthEndpoint(
        "/oauth2/consent",
        {
          method: "POST",
          body: z.object({
            accept: z.boolean()
          }),
          use: [sessionMiddleware],
          metadata: {
            openapi: {
              description: "Handle OAuth2 consent",
              responses: {
                "200": {
                  description: "Consent processed successfully",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          redirectURI: {
                            type: "string",
                            format: "uri",
                            description: "The URI to redirect to, either with an authorization code or an error"
                          }
                        },
                        required: ["redirectURI"]
                      }
                    }
                  }
                }
              }
            }
          }
        },
        async (ctx) => {
          const storedCode = await ctx.getSignedCookie(
            "oidc_consent_prompt",
            ctx.context.secret
          );
          if (!storedCode) {
            throw new APIError("UNAUTHORIZED", {
              error_description: "No consent prompt found",
              error: "invalid_request"
            });
          }
          const verification = await ctx.context.internalAdapter.findVerificationValue(storedCode);
          if (!verification) {
            throw new APIError("UNAUTHORIZED", {
              error_description: "Invalid code",
              error: "invalid_request"
            });
          }
          if (verification.expiresAt < /* @__PURE__ */ new Date()) {
            throw new APIError("UNAUTHORIZED", {
              error_description: "Code expired",
              error: "invalid_request"
            });
          }
          const value = JSON.parse(verification.value);
          if (!value.requireConsent) {
            throw new APIError("UNAUTHORIZED", {
              error_description: "Consent not required",
              error: "invalid_request"
            });
          }
          if (!ctx.body.accept) {
            await ctx.context.internalAdapter.deleteVerificationValue(
              verification.id
            );
            return ctx.json({
              redirectURI: `${value.redirectURI}?error=access_denied&error_description=User denied access`
            });
          }
          const code = generateRandomString(32, "a-z", "A-Z", "0-9");
          const codeExpiresInMs = opts.codeExpiresIn * 1e3;
          const expiresAt = new Date(Date.now() + codeExpiresInMs);
          await ctx.context.internalAdapter.updateVerificationValue(
            verification.id,
            {
              value: JSON.stringify({
                ...value,
                requireConsent: false
              }),
              identifier: code,
              expiresAt
            }
          );
          await ctx.context.adapter.create({
            model: modelName.oauthConsent,
            data: {
              clientId: value.clientId,
              userId: value.userId,
              scopes: value.scope.join(" "),
              consentGiven: true,
              createdAt: /* @__PURE__ */ new Date(),
              updatedAt: /* @__PURE__ */ new Date()
            }
          });
          const redirectURI = new URL(value.redirectURI);
          redirectURI.searchParams.set("code", code);
          if (value.state) redirectURI.searchParams.set("state", value.state);
          return ctx.json({
            redirectURI: redirectURI.toString()
          });
        }
      ),
      oAuth2token: createAuthEndpoint(
        "/oauth2/token",
        {
          method: "POST",
          body: z.record(z.any()),
          metadata: {
            isAction: false
          }
        },
        async (ctx) => {
          let { body } = ctx;
          if (!body) {
            throw new APIError("BAD_REQUEST", {
              error_description: "request body not found",
              error: "invalid_request"
            });
          }
          if (body instanceof FormData) {
            body = Object.fromEntries(body.entries());
          }
          if (!(body instanceof Object)) {
            throw new APIError("BAD_REQUEST", {
              error_description: "request body is not an object",
              error: "invalid_request"
            });
          }
          let { client_id, client_secret } = body;
          const authorization = ctx.request?.headers.get("authorization") || null;
          if (authorization && !client_id && !client_secret && authorization.startsWith("Basic ")) {
            try {
              const encoded = authorization.replace("Basic ", "");
              const decoded = new TextDecoder().decode(base64.decode(encoded));
              if (!decoded.includes(":")) {
                throw new APIError("UNAUTHORIZED", {
                  error_description: "invalid authorization header format",
                  error: "invalid_client"
                });
              }
              const [id, secret] = decoded.split(":");
              if (!id || !secret) {
                throw new APIError("UNAUTHORIZED", {
                  error_description: "invalid authorization header format",
                  error: "invalid_client"
                });
              }
              client_id = id;
              client_secret = secret;
            } catch (error) {
              throw new APIError("UNAUTHORIZED", {
                error_description: "invalid authorization header format",
                error: "invalid_client"
              });
            }
          }
          const {
            grant_type,
            code,
            redirect_uri,
            refresh_token,
            code_verifier
          } = body;
          if (grant_type === "refresh_token") {
            if (!refresh_token) {
              throw new APIError("BAD_REQUEST", {
                error_description: "refresh_token is required",
                error: "invalid_request"
              });
            }
            const token = await ctx.context.adapter.findOne({
              model: modelName.oauthAccessToken,
              where: [
                {
                  field: "refreshToken",
                  value: refresh_token.toString()
                }
              ]
            });
            if (!token) {
              throw new APIError("UNAUTHORIZED", {
                error_description: "invalid refresh token",
                error: "invalid_grant"
              });
            }
            if (token.clientId !== client_id?.toString()) {
              throw new APIError("UNAUTHORIZED", {
                error_description: "invalid client_id",
                error: "invalid_client"
              });
            }
            if (token.refreshTokenExpiresAt < /* @__PURE__ */ new Date()) {
              throw new APIError("UNAUTHORIZED", {
                error_description: "refresh token expired",
                error: "invalid_grant"
              });
            }
            const accessToken2 = generateRandomString(32, "a-z", "A-Z");
            const newRefreshToken = generateRandomString(32, "a-z", "A-Z");
            const accessTokenExpiresAt2 = new Date(
              Date.now() + opts.accessTokenExpiresIn * 1e3
            );
            const refreshTokenExpiresAt2 = new Date(
              Date.now() + opts.refreshTokenExpiresIn * 1e3
            );
            await ctx.context.adapter.create({
              model: modelName.oauthAccessToken,
              data: {
                accessToken: accessToken2,
                refreshToken: newRefreshToken,
                accessTokenExpiresAt: accessTokenExpiresAt2,
                refreshTokenExpiresAt: refreshTokenExpiresAt2,
                clientId: client_id.toString(),
                userId: token.userId,
                scopes: token.scopes,
                createdAt: /* @__PURE__ */ new Date(),
                updatedAt: /* @__PURE__ */ new Date()
              }
            });
            return ctx.json({
              access_token: accessToken2,
              token_type: "bearer",
              expires_in: opts.accessTokenExpiresIn,
              refresh_token: newRefreshToken,
              scope: token.scopes
            });
          }
          if (!code) {
            throw new APIError("BAD_REQUEST", {
              error_description: "code is required",
              error: "invalid_request"
            });
          }
          if (options.requirePKCE && !code_verifier) {
            throw new APIError("BAD_REQUEST", {
              error_description: "code verifier is missing",
              error: "invalid_request"
            });
          }
          const verificationValue = await ctx.context.internalAdapter.findVerificationValue(
            code.toString()
          );
          if (!verificationValue) {
            throw new APIError("UNAUTHORIZED", {
              error_description: "invalid code",
              error: "invalid_grant"
            });
          }
          if (verificationValue.expiresAt < /* @__PURE__ */ new Date()) {
            throw new APIError("UNAUTHORIZED", {
              error_description: "code expired",
              error: "invalid_grant"
            });
          }
          await ctx.context.internalAdapter.deleteVerificationValue(
            verificationValue.id
          );
          if (!client_id || !client_secret) {
            throw new APIError("UNAUTHORIZED", {
              error_description: "client_id and client_secret are required",
              error: "invalid_client"
            });
          }
          if (!grant_type) {
            throw new APIError("BAD_REQUEST", {
              error_description: "grant_type is required",
              error: "invalid_request"
            });
          }
          if (grant_type !== "authorization_code") {
            throw new APIError("BAD_REQUEST", {
              error_description: "grant_type must be 'authorization_code'",
              error: "unsupported_grant_type"
            });
          }
          if (!redirect_uri) {
            throw new APIError("BAD_REQUEST", {
              error_description: "redirect_uri is required",
              error: "invalid_request"
            });
          }
          const client = await ctx.context.adapter.findOne({
            model: modelName.oauthClient,
            where: [{ field: "clientId", value: client_id.toString() }]
          }).then((res) => {
            if (!res) {
              return null;
            }
            return {
              ...res,
              redirectURLs: res.redirectURLs.split(","),
              metadata: res.metadata ? JSON.parse(res.metadata) : {}
            };
          });
          if (!client) {
            throw new APIError("UNAUTHORIZED", {
              error_description: "invalid client_id",
              error: "invalid_client"
            });
          }
          if (client.disabled) {
            throw new APIError("UNAUTHORIZED", {
              error_description: "client is disabled",
              error: "invalid_client"
            });
          }
          const isValidSecret = client.clientSecret === client_secret.toString();
          if (!isValidSecret) {
            throw new APIError("UNAUTHORIZED", {
              error_description: "invalid client_secret",
              error: "invalid_client"
            });
          }
          const value = JSON.parse(
            verificationValue.value
          );
          if (value.clientId !== client_id.toString()) {
            throw new APIError("UNAUTHORIZED", {
              error_description: "invalid client_id",
              error: "invalid_client"
            });
          }
          if (value.redirectURI !== redirect_uri.toString()) {
            throw new APIError("UNAUTHORIZED", {
              error_description: "invalid redirect_uri",
              error: "invalid_client"
            });
          }
          if (value.codeChallenge && !code_verifier) {
            throw new APIError("BAD_REQUEST", {
              error_description: "code verifier is missing",
              error: "invalid_request"
            });
          }
          const challenge = value.codeChallengeMethod === "plain" ? code_verifier : await createHash("SHA-256", "base64urlnopad").digest(
            code_verifier
          );
          if (challenge !== value.codeChallenge) {
            throw new APIError("UNAUTHORIZED", {
              error_description: "code verification failed",
              error: "invalid_request"
            });
          }
          const requestedScopes = value.scope;
          await ctx.context.internalAdapter.deleteVerificationValue(
            verificationValue.id
          );
          const accessToken = generateRandomString(32, "a-z", "A-Z");
          const refreshToken = generateRandomString(32, "A-Z", "a-z");
          const accessTokenExpiresAt = new Date(
            Date.now() + opts.accessTokenExpiresIn * 1e3
          );
          const refreshTokenExpiresAt = new Date(
            Date.now() + opts.refreshTokenExpiresIn * 1e3
          );
          await ctx.context.adapter.create({
            model: modelName.oauthAccessToken,
            data: {
              accessToken,
              refreshToken,
              accessTokenExpiresAt,
              refreshTokenExpiresAt,
              clientId: client_id.toString(),
              userId: value.userId,
              scopes: requestedScopes.join(" "),
              createdAt: /* @__PURE__ */ new Date(),
              updatedAt: /* @__PURE__ */ new Date()
            }
          });
          const user = await ctx.context.internalAdapter.findUserById(
            value.userId
          );
          if (!user) {
            throw new APIError("UNAUTHORIZED", {
              error_description: "user not found",
              error: "invalid_grant"
            });
          }
          let secretKey = {
            alg: "HS256",
            key: await subtle.generateKey(
              {
                name: "HMAC",
                hash: "SHA-256"
              },
              true,
              ["sign", "verify"]
            )
          };
          const profile = {
            given_name: user.name.split(" ")[0],
            family_name: user.name.split(" ")[1],
            name: user.name,
            profile: user.image,
            updated_at: user.updatedAt.toISOString()
          };
          const email = {
            email: user.email,
            email_verified: user.emailVerified
          };
          const userClaims = {
            ...requestedScopes.includes("profile") ? profile : {},
            ...requestedScopes.includes("email") ? email : {}
          };
          const additionalUserClaims = options.getAdditionalUserInfoClaim ? await options.getAdditionalUserInfoClaim(user, requestedScopes) : {};
          const idToken = await new SignJWT({
            sub: user.id,
            aud: client_id.toString(),
            iat: Date.now(),
            auth_time: ctx.context.session?.session.createdAt.getTime(),
            nonce: value.nonce,
            acr: "urn:mace:incommon:iap:silver",
            // default to silver - ⚠︎ this should be configurable and should be validated against the client's metadata
            ...userClaims,
            ...additionalUserClaims
          }).setProtectedHeader({ alg: secretKey.alg }).setIssuedAt().setExpirationTime(
            Math.floor(Date.now() / 1e3) + opts.accessTokenExpiresIn
          ).sign(secretKey.key);
          return ctx.json(
            {
              access_token: accessToken,
              token_type: "Bearer",
              expires_in: opts.accessTokenExpiresIn,
              refresh_token: requestedScopes.includes("offline_access") ? refreshToken : void 0,
              scope: requestedScopes.join(" "),
              id_token: requestedScopes.includes("openid") ? idToken : void 0
            },
            {
              headers: {
                "Cache-Control": "no-store",
                Pragma: "no-cache"
              }
            }
          );
        }
      ),
      oAuth2userInfo: createAuthEndpoint(
        "/oauth2/userinfo",
        {
          method: "GET",
          metadata: {
            isAction: false,
            openapi: {
              description: "Get OAuth2 user information",
              responses: {
                "200": {
                  description: "User information retrieved successfully",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          sub: {
                            type: "string",
                            description: "Subject identifier (user ID)"
                          },
                          email: {
                            type: "string",
                            format: "email",
                            nullable: true,
                            description: "User's email address, included if 'email' scope is granted"
                          },
                          name: {
                            type: "string",
                            nullable: true,
                            description: "User's full name, included if 'profile' scope is granted"
                          },
                          picture: {
                            type: "string",
                            format: "uri",
                            nullable: true,
                            description: "User's profile picture URL, included if 'profile' scope is granted"
                          },
                          given_name: {
                            type: "string",
                            nullable: true,
                            description: "User's given name, included if 'profile' scope is granted"
                          },
                          family_name: {
                            type: "string",
                            nullable: true,
                            description: "User's family name, included if 'profile' scope is granted"
                          },
                          email_verified: {
                            type: "boolean",
                            nullable: true,
                            description: "Whether the email is verified, included if 'email' scope is granted"
                          }
                        },
                        required: ["sub"]
                      }
                    }
                  }
                }
              }
            }
          }
        },
        async (ctx) => {
          if (!ctx.request) {
            throw new APIError("UNAUTHORIZED", {
              error_description: "request not found",
              error: "invalid_request"
            });
          }
          const authorization = ctx.request.headers.get("authorization");
          if (!authorization) {
            throw new APIError("UNAUTHORIZED", {
              error_description: "authorization header not found",
              error: "invalid_request"
            });
          }
          const token = authorization.replace("Bearer ", "");
          const accessToken = await ctx.context.adapter.findOne({
            model: modelName.oauthAccessToken,
            where: [
              {
                field: "accessToken",
                value: token
              }
            ]
          });
          if (!accessToken) {
            throw new APIError("UNAUTHORIZED", {
              error_description: "invalid access token",
              error: "invalid_token"
            });
          }
          if (accessToken.accessTokenExpiresAt < /* @__PURE__ */ new Date()) {
            throw new APIError("UNAUTHORIZED", {
              error_description: "The Access Token expired",
              error: "invalid_token"
            });
          }
          const user = await ctx.context.internalAdapter.findUserById(
            accessToken.userId
          );
          if (!user) {
            throw new APIError("UNAUTHORIZED", {
              error_description: "user not found",
              error: "invalid_token"
            });
          }
          const requestedScopes = accessToken.scopes.split(" ");
          const baseUserClaims = {
            sub: user.id,
            email: requestedScopes.includes("email") ? user.email : void 0,
            name: requestedScopes.includes("profile") ? user.name : void 0,
            picture: requestedScopes.includes("profile") ? user.image : void 0,
            given_name: requestedScopes.includes("profile") ? user.name.split(" ")[0] : void 0,
            family_name: requestedScopes.includes("profile") ? user.name.split(" ")[1] : void 0,
            email_verified: requestedScopes.includes("email") ? user.emailVerified : void 0
          };
          const userClaims = options.getAdditionalUserInfoClaim ? await options.getAdditionalUserInfoClaim(user, requestedScopes) : baseUserClaims;
          return ctx.json({
            ...baseUserClaims,
            ...userClaims
          });
        }
      ),
      registerOAuthApplication: createAuthEndpoint(
        "/oauth2/register",
        {
          method: "POST",
          body: z.object({
            redirect_uris: z.array(z.string()),
            token_endpoint_auth_method: z.enum(["none", "client_secret_basic", "client_secret_post"]).default("client_secret_basic").optional(),
            grant_types: z.array(
              z.enum([
                "authorization_code",
                "implicit",
                "password",
                "client_credentials",
                "refresh_token",
                "urn:ietf:params:oauth:grant-type:jwt-bearer",
                "urn:ietf:params:oauth:grant-type:saml2-bearer"
              ])
            ).default(["authorization_code"]).optional(),
            response_types: z.array(z.enum(["code", "token"])).default(["code"]).optional(),
            client_name: z.string().optional(),
            client_uri: z.string().optional(),
            logo_uri: z.string().optional(),
            scope: z.string().optional(),
            contacts: z.array(z.string()).optional(),
            tos_uri: z.string().optional(),
            policy_uri: z.string().optional(),
            jwks_uri: z.string().optional(),
            jwks: z.record(z.any()).optional(),
            metadata: z.record(z.any()).optional(),
            software_id: z.string().optional(),
            software_version: z.string().optional(),
            software_statement: z.string().optional()
          }),
          metadata: {
            openapi: {
              description: "Register an OAuth2 application",
              responses: {
                "200": {
                  description: "OAuth2 application registered successfully",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          name: {
                            type: "string",
                            description: "Name of the OAuth2 application"
                          },
                          icon: {
                            type: "string",
                            nullable: true,
                            description: "Icon URL for the application"
                          },
                          metadata: {
                            type: "object",
                            additionalProperties: true,
                            nullable: true,
                            description: "Additional metadata for the application"
                          },
                          clientId: {
                            type: "string",
                            description: "Unique identifier for the client"
                          },
                          clientSecret: {
                            type: "string",
                            description: "Secret key for the client"
                          },
                          redirectURLs: {
                            type: "array",
                            items: { type: "string", format: "uri" },
                            description: "List of allowed redirect URLs"
                          },
                          type: {
                            type: "string",
                            description: "Type of the client",
                            enum: ["web"]
                          },
                          authenticationScheme: {
                            type: "string",
                            description: "Authentication scheme used by the client",
                            enum: ["client_secret"]
                          },
                          disabled: {
                            type: "boolean",
                            description: "Whether the client is disabled",
                            enum: [false]
                          },
                          userId: {
                            type: "string",
                            nullable: true,
                            description: "ID of the user who registered the client, null if registered anonymously"
                          },
                          createdAt: {
                            type: "string",
                            format: "date-time",
                            description: "Creation timestamp"
                          },
                          updatedAt: {
                            type: "string",
                            format: "date-time",
                            description: "Last update timestamp"
                          }
                        },
                        required: [
                          "name",
                          "clientId",
                          "clientSecret",
                          "redirectURLs",
                          "type",
                          "authenticationScheme",
                          "disabled",
                          "createdAt",
                          "updatedAt"
                        ]
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
          const session = await getSessionFromCtx(ctx);
          if (!session && !options.allowDynamicClientRegistration) {
            throw new APIError("UNAUTHORIZED", {
              error: "invalid_token",
              error_description: "Authentication required for client registration"
            });
          }
          if ((!body.grant_types || body.grant_types.includes("authorization_code") || body.grant_types.includes("implicit")) && (!body.redirect_uris || body.redirect_uris.length === 0)) {
            throw new APIError("BAD_REQUEST", {
              error: "invalid_redirect_uri",
              error_description: "Redirect URIs are required for authorization_code and implicit grant types"
            });
          }
          if (body.grant_types && body.response_types) {
            if (body.grant_types.includes("authorization_code") && !body.response_types.includes("code")) {
              throw new APIError("BAD_REQUEST", {
                error: "invalid_client_metadata",
                error_description: "When 'authorization_code' grant type is used, 'code' response type must be included"
              });
            }
            if (body.grant_types.includes("implicit") && !body.response_types.includes("token")) {
              throw new APIError("BAD_REQUEST", {
                error: "invalid_client_metadata",
                error_description: "When 'implicit' grant type is used, 'token' response type must be included"
              });
            }
          }
          const clientId = options.generateClientId?.() || generateRandomString(32, "a-z", "A-Z");
          const clientSecret = options.generateClientSecret?.() || generateRandomString(32, "a-z", "A-Z");
          await ctx.context.adapter.create({
            model: modelName.oauthClient,
            data: {
              name: body.client_name,
              icon: body.logo_uri,
              metadata: body.metadata ? JSON.stringify(body.metadata) : null,
              clientId,
              clientSecret,
              redirectURLs: body.redirect_uris.join(","),
              type: "web",
              authenticationScheme: body.token_endpoint_auth_method || "client_secret_basic",
              disabled: false,
              userId: session?.session.userId,
              createdAt: /* @__PURE__ */ new Date(),
              updatedAt: /* @__PURE__ */ new Date()
            }
          });
          return ctx.json(
            {
              client_id: clientId,
              client_secret: clientSecret,
              client_id_issued_at: Math.floor(Date.now() / 1e3),
              client_secret_expires_at: 0,
              // 0 means it doesn't expire
              redirect_uris: body.redirect_uris,
              token_endpoint_auth_method: body.token_endpoint_auth_method || "client_secret_basic",
              grant_types: body.grant_types || ["authorization_code"],
              response_types: body.response_types || ["code"],
              client_name: body.client_name,
              client_uri: body.client_uri,
              logo_uri: body.logo_uri,
              scope: body.scope,
              contacts: body.contacts,
              tos_uri: body.tos_uri,
              policy_uri: body.policy_uri,
              jwks_uri: body.jwks_uri,
              jwks: body.jwks,
              software_id: body.software_id,
              software_version: body.software_version,
              software_statement: body.software_statement,
              metadata: body.metadata
            },
            {
              status: 201,
              headers: {
                "Cache-Control": "no-store",
                Pragma: "no-cache"
              }
            }
          );
        }
      ),
      getOAuthClient: createAuthEndpoint(
        "/oauth2/client/:id",
        {
          method: "GET",
          use: [sessionMiddleware],
          metadata: {
            openapi: {
              description: "Get OAuth2 client details",
              responses: {
                "200": {
                  description: "OAuth2 client retrieved successfully",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          clientId: {
                            type: "string",
                            description: "Unique identifier for the client"
                          },
                          name: {
                            type: "string",
                            description: "Name of the OAuth2 application"
                          },
                          icon: {
                            type: "string",
                            nullable: true,
                            description: "Icon URL for the application"
                          }
                        },
                        required: ["clientId", "name"]
                      }
                    }
                  }
                }
              }
            }
          }
        },
        async (ctx) => {
          const client = await ctx.context.adapter.findOne(
            {
              model: modelName.oauthClient,
              where: [{ field: "clientId", value: ctx.params.id }]
            }
          );
          if (!client) {
            throw new APIError("NOT_FOUND", {
              error_description: "client not found",
              error: "not_found"
            });
          }
          return ctx.json({
            clientId: client.clientId,
            name: client.name,
            icon: client.icon
          });
        }
      )
    },
    schema
  };
};

export { getMetadata as g, oidcProvider as o, schema as s };
