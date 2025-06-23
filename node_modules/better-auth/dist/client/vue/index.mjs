import { shallowRef, getCurrentScope, onScopeDispose, readonly, getCurrentInstance } from 'vue';
import { g as getClientConfig, c as createDynamicPathProxy } from '../../shared/better-auth.Dw8i6Dcb.mjs';
import { c as capitalizeFirstLetter } from '../../shared/better-auth.D-2CmEwz.mjs';
import '@better-fetch/fetch';
import '../../shared/better-auth.VTXNLFMT.mjs';
import '../../shared/better-auth.8zoxzg-F.mjs';
import '../../shared/better-auth.DdzSJf-n.mjs';
import 'nanostores';
import '../../shared/better-auth.Buni1mmI.mjs';
import '../../shared/better-auth.ffWeg50w.mjs';

function registerStore(store) {
  let instance = getCurrentInstance();
  if (instance && instance.proxy) {
    let vm = instance.proxy;
    let cache = "_nanostores" in vm ? vm._nanostores : vm._nanostores = [];
    cache.push(store);
  }
}
function useStore(store) {
  let state = shallowRef();
  let unsubscribe = store.subscribe((value) => {
    state.value = value;
  });
  getCurrentScope() && onScopeDispose(unsubscribe);
  if (process.env.NODE_ENV !== "production") {
    registerStore(store);
    return readonly(state);
  }
  return state;
}

function getAtomKey(str) {
  return `use${capitalizeFirstLetter(str)}`;
}
function createAuthClient(options) {
  const {
    pluginPathMethods,
    pluginsActions,
    pluginsAtoms,
    $fetch,
    $store,
    atomListeners
  } = getClientConfig(options);
  let resolvedHooks = {};
  for (const [key, value] of Object.entries(pluginsAtoms)) {
    resolvedHooks[getAtomKey(key)] = () => useStore(value);
  }
  function useSession(useFetch) {
    if (useFetch) {
      const ref = useStore(pluginsAtoms.$sessionSignal);
      const baseURL = options?.fetchOptions?.baseURL || options?.baseURL;
      let authPath = baseURL ? new URL(baseURL).pathname : "/api/auth";
      authPath = authPath === "/" ? "/api/auth" : authPath;
      authPath = authPath.endsWith("/") ? authPath.slice(0, -1) : authPath;
      return useFetch(`${authPath}/get-session`, {
        ref
      }).then((res) => {
        return {
          data: res.data,
          isPending: false,
          error: res.error
        };
      });
    }
    return resolvedHooks.useSession();
  }
  const routes = {
    ...pluginsActions,
    ...resolvedHooks,
    useSession,
    $fetch,
    $store
  };
  const proxy = createDynamicPathProxy(
    routes,
    $fetch,
    pluginPathMethods,
    pluginsAtoms,
    atomListeners
  );
  return proxy;
}

export { createAuthClient };
