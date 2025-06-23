import { g as getClientConfig, c as createDynamicPathProxy } from '../../shared/better-auth.Dw8i6Dcb.mjs';
import { c as capitalizeFirstLetter } from '../../shared/better-auth.D-2CmEwz.mjs';
import { createStore, reconcile } from 'solid-js/store';
import { onCleanup } from 'solid-js';
import '@better-fetch/fetch';
import '../../shared/better-auth.VTXNLFMT.mjs';
import '../../shared/better-auth.8zoxzg-F.mjs';
import '../../shared/better-auth.DdzSJf-n.mjs';
import 'nanostores';
import '../../shared/better-auth.Buni1mmI.mjs';
import '../../shared/better-auth.ffWeg50w.mjs';

function useStore(store) {
  const unbindActivation = store.listen(() => {
  });
  const [state, setState] = createStore({
    value: store.get()
  });
  const unsubscribe = store.subscribe((newValue) => {
    setState("value", reconcile(newValue));
  });
  onCleanup(() => unsubscribe());
  unbindActivation();
  return () => state.value;
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
    atomListeners
  } = getClientConfig(options);
  let resolvedHooks = {};
  for (const [key, value] of Object.entries(pluginsAtoms)) {
    resolvedHooks[getAtomKey(key)] = () => useStore(value);
  }
  const routes = {
    ...pluginsActions,
    ...resolvedHooks
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
