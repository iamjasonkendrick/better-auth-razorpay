'use strict';

const _envShim = /* @__PURE__ */ Object.create(null);
const _getEnv = (useShim) => globalThis.process?.env || //@ts-expect-error
globalThis.Deno?.env.toObject() || //@ts-expect-error
globalThis.__env__ || (useShim ? _envShim : globalThis);
const env = new Proxy(_envShim, {
  get(_, prop) {
    const env2 = _getEnv();
    return env2[prop] ?? _envShim[prop];
  },
  has(_, prop) {
    const env2 = _getEnv();
    return prop in env2 || prop in _envShim;
  },
  set(_, prop, value) {
    const env2 = _getEnv(true);
    env2[prop] = value;
    return true;
  },
  deleteProperty(_, prop) {
    if (!prop) {
      return false;
    }
    const env2 = _getEnv(true);
    delete env2[prop];
    return true;
  },
  ownKeys() {
    const env2 = _getEnv(true);
    return Object.keys(env2);
  }
});
function toBoolean(val) {
  return val ? val !== "false" : false;
}
const nodeENV = typeof process !== "undefined" && process.env && process.env.NODE_ENV || "";
const isProduction = nodeENV === "production";
const isDevelopment = nodeENV === "dev" || nodeENV === "development";
const isTest = nodeENV === "test" || toBoolean(env.TEST);

exports.env = env;
exports.isDevelopment = isDevelopment;
exports.isProduction = isProduction;
exports.isTest = isTest;
