import { g as getClientConfig, c as createDynamicPathProxy } from '../../shared/better-auth.Dw8i6Dcb.mjs';
import { listenKeys } from 'nanostores';
import { useRef, useCallback, useSyncExternalStore } from 'react';
import '@better-fetch/fetch';
import '../../shared/better-auth.VTXNLFMT.mjs';
import '../../shared/better-auth.8zoxzg-F.mjs';
import '../../shared/better-auth.DdzSJf-n.mjs';
import '../../shared/better-auth.Buni1mmI.mjs';
import '../../shared/better-auth.ffWeg50w.mjs';

function useStore(store, options = {}) {
  let snapshotRef = useRef(store.get());
  const { keys, deps = [store, keys] } = options;
  let subscribe = useCallback((onChange) => {
    const emitChange = (value) => {
      if (snapshotRef.current === value) return;
      snapshotRef.current = value;
      onChange();
    };
    emitChange(store.value);
    if (keys?.length) {
      return listenKeys(store, keys, emitChange);
    }
    return store.listen(emitChange);
  }, deps);
  let get = () => snapshotRef.current;
  return useSyncExternalStore(subscribe, get, get);
}

function getAtomKey(str) {
  return `use${capitalizeFirstLetter(str)}`;
}
function capitalizeFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
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

export { capitalizeFirstLetter, createAuthClient, useStore };
