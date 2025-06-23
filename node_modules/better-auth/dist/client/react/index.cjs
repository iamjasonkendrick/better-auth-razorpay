'use strict';

const proxy = require('../../shared/better-auth.DOObHhnd.cjs');
const nanostores = require('nanostores');
const react = require('react');
require('@better-fetch/fetch');
require('../../shared/better-auth.C-R0J0n1.cjs');
require('../../shared/better-auth.DiSjtgs9.cjs');
require('../../shared/better-auth.ANpbi45u.cjs');
require('../../shared/better-auth.Ck3n8bMC.cjs');
require('../../shared/better-auth.DhsGZ30Q.cjs');

function useStore(store, options = {}) {
  let snapshotRef = react.useRef(store.get());
  const { keys, deps = [store, keys] } = options;
  let subscribe = react.useCallback((onChange) => {
    const emitChange = (value) => {
      if (snapshotRef.current === value) return;
      snapshotRef.current = value;
      onChange();
    };
    emitChange(store.value);
    if (keys?.length) {
      return nanostores.listenKeys(store, keys, emitChange);
    }
    return store.listen(emitChange);
  }, deps);
  let get = () => snapshotRef.current;
  return react.useSyncExternalStore(subscribe, get, get);
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
  } = proxy.getClientConfig(options);
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
  const proxy$1 = proxy.createDynamicPathProxy(
    routes,
    $fetch,
    pluginPathMethods,
    pluginsAtoms,
    atomListeners
  );
  return proxy$1;
}

exports.capitalizeFirstLetter = capitalizeFirstLetter;
exports.createAuthClient = createAuthClient;
exports.useStore = useStore;
