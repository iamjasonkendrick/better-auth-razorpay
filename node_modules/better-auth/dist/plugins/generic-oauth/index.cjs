'use strict';

const fetch = require('@better-fetch/fetch');
const betterCall = require('better-call');
const jose = require('jose');
const zod = require('zod');
const account = require('../../shared/better-auth.CM7smaHY.cjs');
const cookies_index = require('../../cookies/index.cjs');
require('../../shared/better-auth.DcWKCjjf.cjs');
require('../../shared/better-auth.DiSjtgs9.cjs');
require('../../shared/better-auth.GpOOav9x.cjs');
require('defu');
const refreshAccessToken = require('../../shared/better-auth.6XyKj7DG.cjs');
require('@better-auth/utils/hash');
require('@better-auth/utils/base64');
const state = require('../../shared/better-auth.CWJ7qc0w.cjs');
require('@better-auth/utils/random');
require('../../social-providers/index.cjs');
require('@noble/ciphers/chacha');
require('@noble/ciphers/utils');
require('@noble/ciphers/webcrypto');
require('@noble/hashes/scrypt');
require('@better-auth/utils');
require('@better-auth/utils/hex');
require('@noble/hashes/utils');
require('../../shared/better-auth.CYeOI8C-.cjs');
require('../../shared/better-auth.ANpbi45u.cjs');
require('../../shared/better-auth.D3mtHEZg.cjs');
require('../../shared/better-auth.C1hdVENX.cjs');
require('../../shared/better-auth.Bg6iw3ig.cjs');
require('@better-auth/utils/hmac');
require('@better-auth/utils/binary');
require('../../shared/better-auth.BMYo0QR-.cjs');
require('../../shared/better-auth.C-R0J0n1.cjs');
require('jose/errors');

async function getUserInfo(tokens, finalUserInfoUrl) {
  if (tokens.idToken) {
    const decoded = jose.decodeJwt(tokens.idToken);
    if (decoded) {
      if (decoded.sub && decoded.email) {
        return {
          id: decoded.sub,
          emailVerified: decoded.email_verified,
          image: decoded.picture,
          ...decoded
        };
      }
    }
  }
  if (!finalUserInfoUrl) {
    return null;
  }
  const userInfo = await fetch.betterFetch(finalUserInfoUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${tokens.accessToken}`
    }
  });
  return {
    id: userInfo.data?.sub,
    emailVerified: userInfo.data?.email_verified,
    email: userInfo.data?.email,
    image: userInfo.data?.picture,
    name: userInfo.data?.name,
    ...userInfo.data
  };
}
const genericOAuth = (options) => {
  const ERROR_CODES = {
    INVALID_OAUTH_CONFIGURATION: "Invalid OAuth configuration"
  };
  return {
    id: "generic-oauth",
    init: (ctx) => {
      const genericProviders = options.config.map((c) => {
        let finalUserInfoUrl = c.userInfoUrl;
        return {
          id: c.providerId,
          name: c.providerId,
          createAuthorizationURL(data) {
            return refreshAccessToken.createAuthorizationURL({
              id: c.providerId,
              options: {
                clientId: c.clientId,
                clientSecret: c.clientSecret,
                redirectURI: c.redirectURI
              },
              authorizationEndpoint: c.authorizationUrl,
              state: data.state,
              codeVerifier: c.pkce ? data.codeVerifier : void 0,
              scopes: c.scopes || [],
              redirectURI: `${ctx.baseURL}/oauth2/callback/${c.providerId}`
            });
          },
          async validateAuthorizationCode(data) {
            let finalTokenUrl = c.tokenUrl;
            if (c.discoveryUrl) {
              const discovery = await fetch.betterFetch(c.discoveryUrl, {
                method: "GET",
                headers: c.discoveryHeaders
              });
              if (discovery.data) {
                finalTokenUrl = discovery.data.token_endpoint;
                finalUserInfoUrl = discovery.data.userinfo_endpoint;
              }
            }
            if (!finalTokenUrl) {
              throw new betterCall.APIError("BAD_REQUEST", {
                message: "Invalid OAuth configuration. Token URL not found."
              });
            }
            return refreshAccessToken.validateAuthorizationCode({
              headers: c.authorizationHeaders,
              code: data.code,
              codeVerifier: data.codeVerifier,
              redirectURI: data.redirectURI,
              options: {
                clientId: c.clientId,
                clientSecret: c.clientSecret,
                redirectURI: c.redirectURI
              },
              tokenEndpoint: finalTokenUrl
            });
          },
          async refreshAccessToken(refreshToken) {
            let finalTokenUrl = c.tokenUrl;
            if (c.discoveryUrl) {
              const discovery = await fetch.betterFetch(c.discoveryUrl, {
                method: "GET",
                headers: c.discoveryHeaders
              });
              if (discovery.data) {
                finalTokenUrl = discovery.data.token_endpoint;
              }
            }
            if (!finalTokenUrl) {
              throw new betterCall.APIError("BAD_REQUEST", {
                message: "Invalid OAuth configuration. Token URL not found."
              });
            }
            return refreshAccessToken.refreshAccessToken({
              refreshToken,
              options: {
                clientId: c.clientId,
                clientSecret: c.clientSecret
              },
              authentication: c.authentication,
              tokenEndpoint: finalTokenUrl
            });
          },
          async getUserInfo(tokens) {
            const userInfo = c.getUserInfo ? await c.getUserInfo(tokens) : await getUserInfo(tokens, finalUserInfoUrl);
            if (!userInfo) {
              return null;
            }
            return {
              user: {
                id: userInfo?.id,
                email: userInfo?.email,
                emailVerified: userInfo?.emailVerified,
                image: userInfo?.image,
                name: userInfo?.name,
                ...c.mapProfileToUser?.(userInfo)
              },
              data: userInfo
            };
          }
        };
      });
      return {
        context: {
          socialProviders: genericProviders.concat(ctx.socialProviders)
        }
      };
    },
    endpoints: {
      signInWithOAuth2: account.createAuthEndpoint(
        "/sign-in/oauth2",
        {
          method: "POST",
          body: zod.z.object({
            providerId: zod.z.string({
              description: "The provider ID for the OAuth provider"
            }),
            callbackURL: zod.z.string({
              description: "The URL to redirect to after sign in"
            }).optional(),
            errorCallbackURL: zod.z.string({
              description: "The URL to redirect to if an error occurs"
            }).optional(),
            newUserCallbackURL: zod.z.string({
              description: "The URL to redirect to after login if the user is new"
            }).optional(),
            disableRedirect: zod.z.boolean({
              description: "Disable redirect"
            }).optional(),
            scopes: zod.z.array(zod.z.string(), {
              message: "Scopes to be passed to the provider authorization request."
            }).optional(),
            requestSignUp: zod.z.boolean({
              description: "Explicitly request sign-up. Useful when disableImplicitSignUp is true for this provider"
            }).optional()
          }),
          metadata: {
            openapi: {
              description: "Sign in with OAuth2",
              responses: {
                200: {
                  description: "Sign in with OAuth2",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          url: {
                            type: "string"
                          },
                          redirect: {
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
          const { providerId } = ctx.body;
          const config = options.config.find(
            (c) => c.providerId === providerId
          );
          if (!config) {
            throw new betterCall.APIError("BAD_REQUEST", {
              message: `No config found for provider ${providerId}`
            });
          }
          const {
            discoveryUrl,
            authorizationUrl,
            tokenUrl,
            clientId,
            clientSecret,
            scopes,
            redirectURI,
            responseType,
            pkce,
            prompt,
            accessType,
            authorizationUrlParams,
            responseMode,
            authentication
          } = config;
          let finalAuthUrl = authorizationUrl;
          let finalTokenUrl = tokenUrl;
          if (discoveryUrl) {
            const discovery = await fetch.betterFetch(discoveryUrl, {
              method: "GET",
              headers: config.discoveryHeaders,
              onError(context) {
                ctx.context.logger.error(context.error.message, context.error, {
                  discoveryUrl
                });
              }
            });
            if (discovery.data) {
              finalAuthUrl = discovery.data.authorization_endpoint;
              finalTokenUrl = discovery.data.token_endpoint;
            }
          }
          if (!finalAuthUrl || !finalTokenUrl) {
            throw new betterCall.APIError("BAD_REQUEST", {
              message: ERROR_CODES.INVALID_OAUTH_CONFIGURATION
            });
          }
          if (authorizationUrlParams) {
            const withAdditionalParams = new URL(finalAuthUrl);
            for (const [paramName, paramValue] of Object.entries(
              authorizationUrlParams
            )) {
              withAdditionalParams.searchParams.set(paramName, paramValue);
            }
            finalAuthUrl = withAdditionalParams.toString();
          }
          const { state: state$1, codeVerifier } = await state.generateState(ctx);
          const authUrl = await refreshAccessToken.createAuthorizationURL({
            id: providerId,
            options: {
              clientId,
              redirectURI
            },
            authorizationEndpoint: finalAuthUrl,
            state: state$1,
            codeVerifier: pkce ? codeVerifier : void 0,
            scopes: ctx.body.scopes ? [...ctx.body.scopes, ...scopes || []] : scopes || [],
            redirectURI: `${ctx.context.baseURL}/oauth2/callback/${providerId}`,
            prompt,
            accessType,
            responseType,
            responseMode,
            additionalParams: authorizationUrlParams
          });
          return ctx.json({
            url: authUrl.toString(),
            redirect: !ctx.body.disableRedirect
          });
        }
      ),
      oAuth2Callback: account.createAuthEndpoint(
        "/oauth2/callback/:providerId",
        {
          method: "GET",
          query: zod.z.object({
            code: zod.z.string({
              description: "The OAuth2 code"
            }).optional(),
            error: zod.z.string({
              description: "The error message, if any"
            }).optional(),
            error_description: zod.z.string({
              description: "The error description, if any"
            }).optional(),
            state: zod.z.string({
              description: "The state parameter from the OAuth2 request"
            }).optional()
          }),
          metadata: {
            openapi: {
              description: "OAuth2 callback",
              responses: {
                200: {
                  description: "OAuth2 callback",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          url: {
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
          const defaultErrorURL = ctx.context.options.onAPIError?.errorURL || `${ctx.context.baseURL}/error`;
          if (ctx.query.error || !ctx.query.code) {
            throw ctx.redirect(
              `${defaultErrorURL}?error=${ctx.query.error || "oAuth_code_missing"}&error_description=${ctx.query.error_description}`
            );
          }
          const provider = options.config.find(
            (p) => p.providerId === ctx.params.providerId
          );
          if (!provider) {
            throw new betterCall.APIError("BAD_REQUEST", {
              message: `No config found for provider ${ctx.params.providerId}`
            });
          }
          let tokens = void 0;
          const parsedState = await state.parseState(ctx);
          const {
            callbackURL,
            codeVerifier,
            errorURL,
            requestSignUp,
            newUserURL,
            link
          } = parsedState;
          const code = ctx.query.code;
          function redirectOnError(error) {
            const defaultErrorURL2 = ctx.context.options.onAPIError?.errorURL || `${ctx.context.baseURL}/error`;
            throw ctx.redirect(`${errorURL || defaultErrorURL2}?error=${error}`);
          }
          let finalTokenUrl = provider.tokenUrl;
          let finalUserInfoUrl = provider.userInfoUrl;
          if (provider.discoveryUrl) {
            const discovery = await fetch.betterFetch(provider.discoveryUrl, {
              method: "GET",
              headers: provider.discoveryHeaders
            });
            if (discovery.data) {
              finalTokenUrl = discovery.data.token_endpoint;
              finalUserInfoUrl = discovery.data.userinfo_endpoint;
            }
          }
          try {
            if (!finalTokenUrl) {
              throw new betterCall.APIError("BAD_REQUEST", {
                message: "Invalid OAuth configuration."
              });
            }
            tokens = await refreshAccessToken.validateAuthorizationCode({
              headers: provider.authorizationHeaders,
              code,
              codeVerifier: provider.pkce ? codeVerifier : void 0,
              redirectURI: `${ctx.context.baseURL}/oauth2/callback/${provider.providerId}`,
              options: {
                clientId: provider.clientId,
                clientSecret: provider.clientSecret,
                redirectURI: provider.redirectURI
              },
              tokenEndpoint: finalTokenUrl,
              authentication: provider.authentication
            });
          } catch (e) {
            ctx.context.logger.error(
              e && typeof e === "object" && "name" in e ? e.name : "",
              e
            );
            throw redirectOnError("oauth_code_verification_failed");
          }
          if (!tokens) {
            throw new betterCall.APIError("BAD_REQUEST", {
              message: "Invalid OAuth configuration."
            });
          }
          const userInfo = provider.getUserInfo ? await provider.getUserInfo(tokens) : await getUserInfo(tokens, finalUserInfoUrl);
          if (!userInfo) {
            throw redirectOnError("user_info_is_missing");
          }
          const mapUser = provider.mapProfileToUser ? await provider.mapProfileToUser(userInfo) : userInfo;
          if (!mapUser?.email) {
            ctx.context.logger.error("Unable to get user info", userInfo);
            throw redirectOnError("email_is_missing");
          }
          if (link) {
            if (ctx.context.options.account?.accountLinking?.allowDifferentEmails !== true && link.email !== mapUser.email.toLowerCase()) {
              return redirectOnError("email_doesn't_match");
            }
            const existingAccount = await ctx.context.internalAdapter.findAccountByProviderId(
              userInfo.id,
              provider.providerId
            );
            if (existingAccount) {
              if (existingAccount.userId !== link.userId) {
                return redirectOnError(
                  "account_already_linked_to_different_user"
                );
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
              await ctx.context.internalAdapter.updateAccount(
                existingAccount.id,
                updateData
              );
            } else {
              const newAccount = await ctx.context.internalAdapter.createAccount({
                userId: link.userId,
                providerId: provider.providerId,
                accountId: userInfo.id,
                accessToken: tokens.accessToken,
                accessTokenExpiresAt: tokens.accessTokenExpiresAt,
                refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
                scope: tokens.scopes?.join(","),
                refreshToken: tokens.refreshToken,
                idToken: tokens.idToken
              });
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
            throw ctx.redirect(toRedirectTo2);
          }
          const result = await account.handleOAuthUserInfo(ctx, {
            userInfo: {
              ...userInfo,
              ...mapUser
            },
            account: {
              providerId: provider.providerId,
              accountId: userInfo.id,
              ...tokens,
              scope: tokens.scopes?.join(",")
            },
            callbackURL,
            disableSignUp: provider.disableImplicitSignUp && !requestSignUp || provider.disableSignUp,
            overrideUserInfo: provider.overrideUserInfo
          });
          if (result.error) {
            return redirectOnError(result.error.split(" ").join("_"));
          }
          const { session, user } = result.data;
          await cookies_index.setSessionCookie(ctx, {
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
          throw ctx.redirect(toRedirectTo);
        }
      ),
      oAuth2LinkAccount: account.createAuthEndpoint(
        "/oauth2/link",
        {
          method: "POST",
          body: zod.z.object({
            providerId: zod.z.string(),
            /**
             * Callback URL to redirect to after the user has signed in.
             */
            callbackURL: zod.z.string(),
            /**
             * Additional scopes to request when linking the account.
             * This is useful for requesting additional permissions when
             * linking a social account compared to the initial authentication.
             */
            scopes: zod.z.array(zod.z.string(), {
              description: "Additional scopes to request when linking the account"
            }).optional(),
            /**
             * The URL to redirect to if there is an error during the link process.
             */
            errorCallbackURL: zod.z.string({
              description: "The URL to redirect to if there is an error during the link process"
            }).optional()
          }),
          use: [account.sessionMiddleware],
          metadata: {
            openapi: {
              description: "Link an OAuth2 account to the current user session",
              responses: {
                "200": {
                  description: "Authorization URL generated successfully for linking an OAuth2 account",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          url: {
                            type: "string",
                            format: "uri",
                            description: "The authorization URL to redirect the user to for linking the OAuth2 account"
                          },
                          redirect: {
                            type: "boolean",
                            description: "Indicates that the client should redirect to the provided URL",
                            enum: [true]
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
          const provider = options.config.find(
            (p) => p.providerId === c.body.providerId
          );
          if (!provider) {
            throw new betterCall.APIError("NOT_FOUND", {
              message: account.BASE_ERROR_CODES.PROVIDER_NOT_FOUND
            });
          }
          const {
            providerId,
            clientId,
            clientSecret,
            redirectURI,
            authorizationUrl,
            discoveryUrl,
            pkce,
            scopes,
            prompt,
            accessType,
            authorizationUrlParams
          } = provider;
          let finalAuthUrl = authorizationUrl;
          if (!finalAuthUrl) {
            if (!discoveryUrl) {
              throw new betterCall.APIError("BAD_REQUEST", {
                message: ERROR_CODES.INVALID_OAUTH_CONFIGURATION
              });
            }
            const discovery = await fetch.betterFetch(discoveryUrl, {
              method: "GET",
              headers: provider.discoveryHeaders,
              onError(context) {
                c.context.logger.error(context.error.message, context.error, {
                  discoveryUrl
                });
              }
            });
            if (discovery.data) {
              finalAuthUrl = discovery.data.authorization_endpoint;
            }
          }
          if (!finalAuthUrl) {
            throw new betterCall.APIError("BAD_REQUEST", {
              message: ERROR_CODES.INVALID_OAUTH_CONFIGURATION
            });
          }
          const state$1 = await state.generateState(c, {
            userId: session.user.id,
            email: session.user.email
          });
          const url = await refreshAccessToken.createAuthorizationURL({
            id: providerId,
            options: {
              clientId,
              redirectURI: redirectURI || `${c.context.baseURL}/oauth2/callback/${providerId}`
            },
            authorizationEndpoint: finalAuthUrl,
            state: state$1.state,
            codeVerifier: pkce ? state$1.codeVerifier : void 0,
            scopes: c.body.scopes || scopes || [],
            redirectURI: redirectURI || `${c.context.baseURL}/oauth2/callback/${providerId}`,
            prompt,
            accessType,
            additionalParams: authorizationUrlParams
          });
          return c.json({
            url: url.toString(),
            redirect: true
          });
        }
      )
    },
    $ERROR_CODES: ERROR_CODES
  };
};

exports.genericOAuth = genericOAuth;
