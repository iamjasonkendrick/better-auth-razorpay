import { betterFetch } from '@better-fetch/fetch';
import { APIError } from 'better-call';
import { decodeJwt } from 'jose';
import { z } from 'zod';
import { a as createAuthEndpoint, s as sessionMiddleware, B as BASE_ERROR_CODES, h as handleOAuthUserInfo } from '../../shared/better-auth.oUCDPPbQ.mjs';
import { setSessionCookie } from '../../cookies/index.mjs';
import '../../shared/better-auth.Cc72UxUH.mjs';
import '../../shared/better-auth.8zoxzg-F.mjs';
import '../../shared/better-auth.Cqykj82J.mjs';
import 'defu';
import { c as createAuthorizationURL, v as validateAuthorizationCode, r as refreshAccessToken } from '../../shared/better-auth.DufyW0qf.mjs';
import '@better-auth/utils/hash';
import '@better-auth/utils/base64';
import { g as generateState, p as parseState } from '../../shared/better-auth.dn8_oqOu.mjs';
import '@better-auth/utils/random';
import '../../social-providers/index.mjs';
import '@noble/ciphers/chacha';
import '@noble/ciphers/utils';
import '@noble/ciphers/webcrypto';
import '@noble/hashes/scrypt';
import '@better-auth/utils';
import '@better-auth/utils/hex';
import '@noble/hashes/utils';
import '../../shared/better-auth.B4Qoxdgc.mjs';
import '../../shared/better-auth.DdzSJf-n.mjs';
import '../../shared/better-auth.tB5eU6EY.mjs';
import '../../shared/better-auth.CW6D9eSx.mjs';
import '../../shared/better-auth.BUPPRXfK.mjs';
import '@better-auth/utils/hmac';
import '@better-auth/utils/binary';
import '../../shared/better-auth.DDEbWX-S.mjs';
import '../../shared/better-auth.VTXNLFMT.mjs';
import 'jose/errors';

async function getUserInfo(tokens, finalUserInfoUrl) {
  if (tokens.idToken) {
    const decoded = decodeJwt(tokens.idToken);
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
  const userInfo = await betterFetch(finalUserInfoUrl, {
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
            return createAuthorizationURL({
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
              const discovery = await betterFetch(c.discoveryUrl, {
                method: "GET",
                headers: c.discoveryHeaders
              });
              if (discovery.data) {
                finalTokenUrl = discovery.data.token_endpoint;
                finalUserInfoUrl = discovery.data.userinfo_endpoint;
              }
            }
            if (!finalTokenUrl) {
              throw new APIError("BAD_REQUEST", {
                message: "Invalid OAuth configuration. Token URL not found."
              });
            }
            return validateAuthorizationCode({
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
              const discovery = await betterFetch(c.discoveryUrl, {
                method: "GET",
                headers: c.discoveryHeaders
              });
              if (discovery.data) {
                finalTokenUrl = discovery.data.token_endpoint;
              }
            }
            if (!finalTokenUrl) {
              throw new APIError("BAD_REQUEST", {
                message: "Invalid OAuth configuration. Token URL not found."
              });
            }
            return refreshAccessToken({
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
      signInWithOAuth2: createAuthEndpoint(
        "/sign-in/oauth2",
        {
          method: "POST",
          body: z.object({
            providerId: z.string({
              description: "The provider ID for the OAuth provider"
            }),
            callbackURL: z.string({
              description: "The URL to redirect to after sign in"
            }).optional(),
            errorCallbackURL: z.string({
              description: "The URL to redirect to if an error occurs"
            }).optional(),
            newUserCallbackURL: z.string({
              description: "The URL to redirect to after login if the user is new"
            }).optional(),
            disableRedirect: z.boolean({
              description: "Disable redirect"
            }).optional(),
            scopes: z.array(z.string(), {
              message: "Scopes to be passed to the provider authorization request."
            }).optional(),
            requestSignUp: z.boolean({
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
            throw new APIError("BAD_REQUEST", {
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
            const discovery = await betterFetch(discoveryUrl, {
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
            throw new APIError("BAD_REQUEST", {
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
          const { state, codeVerifier } = await generateState(ctx);
          const authUrl = await createAuthorizationURL({
            id: providerId,
            options: {
              clientId,
              redirectURI
            },
            authorizationEndpoint: finalAuthUrl,
            state,
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
      oAuth2Callback: createAuthEndpoint(
        "/oauth2/callback/:providerId",
        {
          method: "GET",
          query: z.object({
            code: z.string({
              description: "The OAuth2 code"
            }).optional(),
            error: z.string({
              description: "The error message, if any"
            }).optional(),
            error_description: z.string({
              description: "The error description, if any"
            }).optional(),
            state: z.string({
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
            throw new APIError("BAD_REQUEST", {
              message: `No config found for provider ${ctx.params.providerId}`
            });
          }
          let tokens = void 0;
          const parsedState = await parseState(ctx);
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
            const discovery = await betterFetch(provider.discoveryUrl, {
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
              throw new APIError("BAD_REQUEST", {
                message: "Invalid OAuth configuration."
              });
            }
            tokens = await validateAuthorizationCode({
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
            throw new APIError("BAD_REQUEST", {
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
          const result = await handleOAuthUserInfo(ctx, {
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
          await setSessionCookie(ctx, {
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
      oAuth2LinkAccount: createAuthEndpoint(
        "/oauth2/link",
        {
          method: "POST",
          body: z.object({
            providerId: z.string(),
            /**
             * Callback URL to redirect to after the user has signed in.
             */
            callbackURL: z.string(),
            /**
             * Additional scopes to request when linking the account.
             * This is useful for requesting additional permissions when
             * linking a social account compared to the initial authentication.
             */
            scopes: z.array(z.string(), {
              description: "Additional scopes to request when linking the account"
            }).optional(),
            /**
             * The URL to redirect to if there is an error during the link process.
             */
            errorCallbackURL: z.string({
              description: "The URL to redirect to if there is an error during the link process"
            }).optional()
          }),
          use: [sessionMiddleware],
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
            throw new APIError("NOT_FOUND", {
              message: BASE_ERROR_CODES.PROVIDER_NOT_FOUND
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
              throw new APIError("BAD_REQUEST", {
                message: ERROR_CODES.INVALID_OAUTH_CONFIGURATION
              });
            }
            const discovery = await betterFetch(discoveryUrl, {
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
            throw new APIError("BAD_REQUEST", {
              message: ERROR_CODES.INVALID_OAUTH_CONFIGURATION
            });
          }
          const state = await generateState(c, {
            userId: session.user.id,
            email: session.user.email
          });
          const url = await createAuthorizationURL({
            id: providerId,
            options: {
              clientId,
              redirectURI: redirectURI || `${c.context.baseURL}/oauth2/callback/${providerId}`
            },
            authorizationEndpoint: finalAuthUrl,
            state: state.state,
            codeVerifier: pkce ? state.codeVerifier : void 0,
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

export { genericOAuth };
