import { atom } from 'nanostores';
import '@better-fetch/fetch';
import '../../shared/better-auth.8zoxzg-F.mjs';
import { u as useAuthQuery } from '../../shared/better-auth.Buni1mmI.mjs';
import { ownerAc, memberAc, adminAc } from '../../plugins/organization/access/index.mjs';
import { h as hasPermission } from '../../shared/better-auth.OuYYTHC7.mjs';
import { startRegistration, WebAuthnError, startAuthentication } from '@simplewebauthn/browser';
export { t as twoFactorClient } from '../../shared/better-auth.Ddw8bVyV.mjs';
import { userAc, adminAc as adminAc$1 } from '../../plugins/admin/access/index.mjs';
import { h as hasPermission$1 } from '../../shared/better-auth.bkwPl2G4.mjs';
import '../../plugins/access/index.mjs';
import '../../shared/better-auth.DdzSJf-n.mjs';

const organizationClient = (options) => {
  const $listOrg = atom(false);
  const $activeOrgSignal = atom(false);
  const $activeMemberSignal = atom(false);
  const roles = {
    admin: adminAc,
    member: memberAc,
    owner: ownerAc,
    ...options?.roles
  };
  return {
    id: "organization",
    $InferServerPlugin: {},
    getActions: ($fetch) => ({
      $Infer: {
        ActiveOrganization: {},
        Organization: {},
        Invitation: {},
        Member: {},
        Team: {}
      },
      organization: {
        checkRolePermission: (data) => {
          const isAuthorized = hasPermission({
            role: data.role,
            options: {
              ac: options?.ac,
              roles
            },
            permissions: data.permissions ?? data.permission
          });
          return isAuthorized;
        }
      }
    }),
    getAtoms: ($fetch) => {
      const listOrganizations = useAuthQuery(
        $listOrg,
        "/organization/list",
        $fetch,
        {
          method: "GET"
        }
      );
      const activeOrganization = useAuthQuery(
        [$activeOrgSignal],
        "/organization/get-full-organization",
        $fetch,
        () => ({
          method: "GET"
        })
      );
      const activeMember = useAuthQuery(
        [$activeMemberSignal],
        "/organization/get-active-member",
        $fetch,
        {
          method: "GET"
        }
      );
      return {
        $listOrg,
        $activeOrgSignal,
        $activeMemberSignal,
        activeOrganization,
        listOrganizations,
        activeMember
      };
    },
    pathMethods: {
      "/organization/get-full-organization": "GET"
    },
    atomListeners: [
      {
        matcher(path) {
          return path === "/organization/create" || path === "/organization/delete" || path === "/organization/update";
        },
        signal: "$listOrg"
      },
      {
        matcher(path) {
          return path.startsWith("/organization");
        },
        signal: "$activeOrgSignal"
      },
      {
        matcher(path) {
          return path.startsWith("/organization/set-active");
        },
        signal: "$sessionSignal"
      },
      {
        matcher(path) {
          return path.includes("/organization/update-member-role");
        },
        signal: "$activeMemberSignal"
      }
    ]
  };
};

const usernameClient = () => {
  return {
    id: "username",
    $InferServerPlugin: {}
  };
};

const getPasskeyActions = ($fetch, {
  $listPasskeys
}) => {
  const signInPasskey = async (opts, options) => {
    const response = await $fetch(
      "/passkey/generate-authenticate-options",
      {
        method: "POST",
        body: {
          email: opts?.email
        }
      }
    );
    if (!response.data) {
      return response;
    }
    try {
      const res = await startAuthentication({
        optionsJSON: response.data,
        useBrowserAutofill: opts?.autoFill
      });
      const verified = await $fetch("/passkey/verify-authentication", {
        body: {
          response: res
        },
        ...opts?.fetchOptions,
        ...options,
        method: "POST"
      });
      if (!verified.data) {
        return verified;
      }
    } catch (e) {
      return {
        data: null,
        error: {
          message: "auth cancelled",
          status: 400,
          statusText: "BAD_REQUEST"
        }
      };
    }
  };
  const registerPasskey = async (opts, fetchOpts) => {
    const options = await $fetch(
      "/passkey/generate-register-options",
      {
        method: "GET",
        query: {
          ...opts?.authenticatorAttachment && {
            authenticatorAttachment: opts.authenticatorAttachment
          }
        }
      }
    );
    if (!options.data) {
      return options;
    }
    try {
      const res = await startRegistration({
        optionsJSON: options.data,
        useAutoRegister: opts?.useAutoRegister
      });
      const verified = await $fetch("/passkey/verify-registration", {
        ...opts?.fetchOptions,
        ...fetchOpts,
        body: {
          response: res,
          name: opts?.name
        },
        method: "POST"
      });
      if (!verified.data) {
        return verified;
      }
      $listPasskeys.set(Math.random());
    } catch (e) {
      if (e instanceof WebAuthnError) {
        if (e.code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED") {
          return {
            data: null,
            error: {
              message: "previously registered",
              status: 400,
              statusText: "BAD_REQUEST"
            }
          };
        }
        if (e.code === "ERROR_CEREMONY_ABORTED") {
          return {
            data: null,
            error: {
              message: "registration cancelled",
              status: 400,
              statusText: "BAD_REQUEST"
            }
          };
        }
        return {
          data: null,
          error: {
            message: e.message,
            status: 400,
            statusText: "BAD_REQUEST"
          }
        };
      }
      return {
        data: null,
        error: {
          message: e instanceof Error ? e.message : "unknown error",
          status: 500,
          statusText: "INTERNAL_SERVER_ERROR"
        }
      };
    }
  };
  return {
    signIn: {
      /**
       * Sign in with a registered passkey
       */
      passkey: signInPasskey
    },
    passkey: {
      /**
       * Add a passkey to the user account
       */
      addPasskey: registerPasskey
    },
    /**
     * Inferred Internal Types
     */
    $Infer: {}
  };
};
const passkeyClient = () => {
  const $listPasskeys = atom();
  return {
    id: "passkey",
    $InferServerPlugin: {},
    getActions: ($fetch) => getPasskeyActions($fetch, {
      $listPasskeys
    }),
    getAtoms($fetch) {
      const listPasskeys = useAuthQuery(
        $listPasskeys,
        "/passkey/list-user-passkeys",
        $fetch,
        {
          method: "GET"
        }
      );
      return {
        listPasskeys,
        $listPasskeys
      };
    },
    pathMethods: {
      "/passkey/register": "POST",
      "/passkey/authenticate": "POST"
    },
    atomListeners: [
      {
        matcher(path) {
          return path === "/passkey/verify-registration" || path === "/passkey/delete-passkey" || path === "/passkey/update-passkey";
        },
        signal: "_listPasskeys"
      }
    ]
  };
};

const magicLinkClient = () => {
  return {
    id: "magic-link",
    $InferServerPlugin: {}
  };
};

const phoneNumberClient = () => {
  return {
    id: "phoneNumber",
    $InferServerPlugin: {},
    atomListeners: [
      {
        matcher(path) {
          return path === "/phone-number/update" || path === "/phone-number/verify";
        },
        signal: "$sessionSignal"
      }
    ]
  };
};

const anonymousClient = () => {
  return {
    id: "anonymous",
    $InferServerPlugin: {},
    pathMethods: {
      "/sign-in/anonymous": "POST"
    }
  };
};

const inferAdditionalFields = (schema) => {
  return {
    id: "additional-fields-client",
    $InferServerPlugin: {}
  };
};

const adminClient = (options) => {
  const roles = {
    admin: adminAc$1,
    user: userAc,
    ...options?.roles
  };
  return {
    id: "admin-client",
    $InferServerPlugin: {},
    getActions: ($fetch) => ({
      admin: {
        checkRolePermission: (data) => {
          const isAuthorized = hasPermission$1({
            role: data.role,
            options: {
              ac: options?.ac,
              roles
            },
            permissions: data.permissions ?? data.permission
          });
          return isAuthorized;
        }
      }
    }),
    pathMethods: {
      "/admin/list-users": "GET",
      "/admin/stop-impersonating": "POST"
    }
  };
};

const genericOAuthClient = () => {
  return {
    id: "generic-oauth-client",
    $InferServerPlugin: {}
  };
};

const jwtClient = () => {
  return {
    id: "better-auth-client",
    $InferServerPlugin: {}
  };
};

const multiSessionClient = () => {
  return {
    id: "multi-session",
    $InferServerPlugin: {},
    atomListeners: [
      {
        matcher(path) {
          return path === "/multi-session/set-active";
        },
        signal: "$sessionSignal"
      }
    ]
  };
};

const emailOTPClient = () => {
  return {
    id: "email-otp",
    $InferServerPlugin: {}
  };
};

let isRequestInProgress = false;
const oneTapClient = (options) => {
  return {
    id: "one-tap",
    getActions: ($fetch, _) => ({
      oneTap: async (opts, fetchOptions) => {
        if (isRequestInProgress) {
          console.warn(
            "A Google One Tap request is already in progress. Please wait."
          );
          return;
        }
        isRequestInProgress = true;
        try {
          if (typeof window === "undefined" || !window.document) {
            console.warn(
              "Google One Tap is only available in browser environments"
            );
            return;
          }
          const { autoSelect, cancelOnTapOutside, context } = opts ?? {};
          const contextValue = context ?? options.context ?? "signin";
          await loadGoogleScript();
          await new Promise((resolve, reject) => {
            let isResolved = false;
            const baseDelay = options.promptOptions?.baseDelay ?? 1e3;
            const maxAttempts = options.promptOptions?.maxAttempts ?? 5;
            window.google?.accounts.id.initialize({
              client_id: options.clientId,
              callback: async (response) => {
                isResolved = true;
                try {
                  await $fetch("/one-tap/callback", {
                    method: "POST",
                    body: { idToken: response.credential },
                    ...opts?.fetchOptions,
                    ...fetchOptions
                  });
                  if (!opts?.fetchOptions && !fetchOptions || opts?.callbackURL) {
                    window.location.href = opts?.callbackURL ?? "/";
                  }
                  resolve();
                } catch (error) {
                  console.error("Error during One Tap callback:", error);
                  reject(error);
                }
              },
              auto_select: autoSelect,
              cancel_on_tap_outside: cancelOnTapOutside,
              context: contextValue,
              ...options.additionalOptions
            });
            const handlePrompt = (attempt) => {
              if (isResolved) return;
              window.google?.accounts.id.prompt((notification) => {
                if (isResolved) return;
                if (notification.isDismissedMoment && notification.isDismissedMoment()) {
                  if (attempt < maxAttempts) {
                    const delay = Math.pow(2, attempt) * baseDelay;
                    setTimeout(() => handlePrompt(attempt + 1), delay);
                  } else {
                    opts?.onPromptNotification?.(notification);
                  }
                } else if (notification.isSkippedMoment && notification.isSkippedMoment()) {
                  if (attempt < maxAttempts) {
                    const delay = Math.pow(2, attempt) * baseDelay;
                    setTimeout(() => handlePrompt(attempt + 1), delay);
                  } else {
                    opts?.onPromptNotification?.(notification);
                  }
                }
              });
            };
            handlePrompt(0);
          });
        } catch (error) {
          console.error("Error during Google One Tap flow:", error);
          throw error;
        } finally {
          isRequestInProgress = false;
        }
      }
    }),
    getAtoms($fetch) {
      return {};
    }
  };
};
const loadGoogleScript = () => {
  return new Promise((resolve) => {
    if (window.googleScriptInitialized) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.googleScriptInitialized = true;
      resolve();
    };
    document.head.appendChild(script);
  });
};

const customSessionClient = () => {
  return InferServerPlugin();
};

const InferServerPlugin = () => {
  return {
    id: "infer-server-plugin",
    $InferServerPlugin: {}
  };
};

const ssoClient = () => {
  return {
    id: "sso-client",
    $InferServerPlugin: {}
  };
};

const oidcClient = () => {
  return {
    id: "oidc-client",
    $InferServerPlugin: {}
  };
};

const apiKeyClient = () => {
  return {
    id: "api-key",
    $InferServerPlugin: {},
    pathMethods: {
      "/api-key/create": "POST",
      "/api-key/delete": "POST",
      "/api-key/delete-all-expired-api-keys": "POST"
    }
  };
};

const oneTimeTokenClient = () => {
  return {
    id: "one-time-token",
    $InferServerPlugin: {}
  };
};

export { InferServerPlugin, adminClient, anonymousClient, apiKeyClient, customSessionClient, emailOTPClient, genericOAuthClient, getPasskeyActions, inferAdditionalFields, jwtClient, magicLinkClient, multiSessionClient, oidcClient, oneTapClient, oneTimeTokenClient, organizationClient, passkeyClient, phoneNumberClient, ssoClient, usernameClient };
