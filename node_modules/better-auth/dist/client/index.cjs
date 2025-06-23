'use strict';

const proxy = require('../shared/better-auth.DOObHhnd.cjs');
const misc = require('../shared/better-auth.BLDOwz3i.cjs');
const query = require('../shared/better-auth.Ck3n8bMC.cjs');
require('@better-fetch/fetch');
require('../shared/better-auth.C-R0J0n1.cjs');
require('../shared/better-auth.DiSjtgs9.cjs');
require('../shared/better-auth.ANpbi45u.cjs');
require('nanostores');
require('../shared/better-auth.DhsGZ30Q.cjs');

function createAuthClient(options) {
  const {
    pluginPathMethods,
    pluginsActions,
    pluginsAtoms,
    $fetch,
    atomListeners,
    $store
  } = proxy.getClientConfig(options);
  let resolvedHooks = {};
  for (const [key, value] of Object.entries(pluginsAtoms)) {
    resolvedHooks[`use${misc.capitalizeFirstLetter(key)}`] = value;
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

const InferPlugin = () => {
  return {
    id: "infer-server-plugin",
    $InferServerPlugin: {}
  };
};

exports.useAuthQuery = query.useAuthQuery;
exports.InferPlugin = InferPlugin;
exports.createAuthClient = createAuthClient;
