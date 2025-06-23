import { g as getClientConfig, c as createDynamicPathProxy } from '../../shared/better-auth.Dw8i6Dcb.mjs';
import { c as capitalizeFirstLetter } from '../../shared/better-auth.D-2CmEwz.mjs';
import '@better-fetch/fetch';
import '../../shared/better-auth.VTXNLFMT.mjs';
import '../../shared/better-auth.8zoxzg-F.mjs';
import '../../shared/better-auth.DdzSJf-n.mjs';
import 'nanostores';
import '../../shared/better-auth.Buni1mmI.mjs';
import '../../shared/better-auth.ffWeg50w.mjs';

function createAuthClient(options) {
  const {
    pluginPathMethods,
    pluginsActions,
    pluginsAtoms,
    $fetch,
    atomListeners,
    $store
  } = getClientConfig(options);
  let resolvedHooks = {};
  for (const [key, value] of Object.entries(pluginsAtoms)) {
    resolvedHooks[`use${capitalizeFirstLetter(key)}`] = () => value;
  }
  const routes = {
    ...pluginsActions,
    ...resolvedHooks,
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
