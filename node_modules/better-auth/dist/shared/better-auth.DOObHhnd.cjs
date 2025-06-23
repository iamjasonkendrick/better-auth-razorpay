'use strict';

const fetch$1 = require('@better-fetch/fetch');
const url = require('./better-auth.C-R0J0n1.cjs');
const nanostores = require('nanostores');
const query = require('./better-auth.Ck3n8bMC.cjs');
const parser = require('./better-auth.DhsGZ30Q.cjs');

const redirectPlugin = {
  id: "redirect",
  name: "Redirect",
  hooks: {
    onSuccess(context) {
      if (context.data?.url && context.data?.redirect) {
        if (typeof window !== "undefined" && window.location) {
          if (window.location) {
            try {
              window.location.href = context.data.url;
            } catch {
            }
          }
        }
      }
    }
  }
};

function getSessionAtom($fetch) {
  const $signal = nanostores.atom(false);
  const session = query.useAuthQuery($signal, "/get-session", $fetch, {
    method: "GET"
  });
  return {
    session,
    $sessionSignal: $signal
  };
}

const getClientConfig = (options) => {
  const isCredentialsSupported = "credentials" in Request.prototype;
  const baseURL = url.getBaseURL(options?.baseURL, options?.basePath);
  const pluginsFetchPlugins = options?.plugins?.flatMap((plugin) => plugin.fetchPlugins).filter((pl) => pl !== void 0) || [];
  const $fetch = fetch$1.createFetch({
    baseURL,
    ...isCredentialsSupported ? { credentials: "include" } : {},
    method: "GET",
    jsonParser(text) {
      if (!text) {
        return null;
      }
      return parser.parseJSON(text, {
        strict: false
      });
    },
    customFetchImpl: async (input, init) => {
      try {
        return await fetch(input, init);
      } catch (error) {
        return Response.error();
      }
    },
    ...options?.fetchOptions,
    plugins: options?.disableDefaultFetchPlugins ? [...options?.fetchOptions?.plugins || [], ...pluginsFetchPlugins] : [
      redirectPlugin,
      ...options?.fetchOptions?.plugins || [],
      ...pluginsFetchPlugins
    ]
  });
  const { $sessionSignal, session } = getSessionAtom($fetch);
  const plugins = options?.plugins || [];
  let pluginsActions = {};
  let pluginsAtoms = {
    $sessionSignal,
    session
  };
  let pluginPathMethods = {
    "/sign-out": "POST",
    "/revoke-sessions": "POST",
    "/revoke-other-sessions": "POST",
    "/delete-user": "POST"
  };
  const atomListeners = [
    {
      signal: "$sessionSignal",
      matcher(path) {
        return path === "/sign-out" || path === "/update-user" || path.startsWith("/sign-in") || path.startsWith("/sign-up") || path === "/delete-user" || path === "/verify-email";
      }
    }
  ];
  for (const plugin of plugins) {
    if (plugin.getAtoms) {
      Object.assign(pluginsAtoms, plugin.getAtoms?.($fetch));
    }
    if (plugin.pathMethods) {
      Object.assign(pluginPathMethods, plugin.pathMethods);
    }
    if (plugin.atomListeners) {
      atomListeners.push(...plugin.atomListeners);
    }
  }
  const $store = {
    notify: (signal) => {
      pluginsAtoms[signal].set(
        !pluginsAtoms[signal].get()
      );
    },
    listen: (signal, listener) => {
      pluginsAtoms[signal].subscribe(listener);
    },
    atoms: pluginsAtoms
  };
  for (const plugin of plugins) {
    if (plugin.getActions) {
      Object.assign(
        pluginsActions,
        plugin.getActions?.($fetch, $store, options)
      );
    }
  }
  return {
    pluginsActions,
    pluginsAtoms,
    pluginPathMethods,
    atomListeners,
    $fetch,
    $store
  };
};

function getMethod(path, knownPathMethods, args) {
  const method = knownPathMethods[path];
  const { fetchOptions, query, ...body } = args || {};
  if (method) {
    return method;
  }
  if (fetchOptions?.method) {
    return fetchOptions.method;
  }
  if (body && Object.keys(body).length > 0) {
    return "POST";
  }
  return "GET";
}
function createDynamicPathProxy(routes, client, knownPathMethods, atoms, atomListeners) {
  function createProxy(path = []) {
    return new Proxy(function() {
    }, {
      get(target, prop) {
        const fullPath = [...path, prop];
        let current = routes;
        for (const segment of fullPath) {
          if (current && typeof current === "object" && segment in current) {
            current = current[segment];
          } else {
            current = void 0;
            break;
          }
        }
        if (typeof current === "function") {
          return current;
        }
        return createProxy(fullPath);
      },
      apply: async (_, __, args) => {
        const routePath = "/" + path.map(
          (segment) => segment.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
        ).join("/");
        const arg = args[0] || {};
        const fetchOptions = args[1] || {};
        const { query, fetchOptions: argFetchOptions, ...body } = arg;
        const options = {
          ...fetchOptions,
          ...argFetchOptions
        };
        const method = getMethod(routePath, knownPathMethods, arg);
        return await client(routePath, {
          ...options,
          body: method === "GET" ? void 0 : {
            ...body,
            ...options?.body || {}
          },
          query: query || options?.query,
          method,
          async onSuccess(context) {
            await options?.onSuccess?.(context);
            const matches = atomListeners?.find((s) => s.matcher(routePath));
            if (!matches) return;
            const signal = atoms[matches.signal];
            if (!signal) return;
            const val = signal.get();
            setTimeout(() => {
              signal.set(!val);
            }, 10);
          }
        });
      }
    });
  }
  return createProxy();
}

exports.createDynamicPathProxy = createDynamicPathProxy;
exports.getClientConfig = getClientConfig;
