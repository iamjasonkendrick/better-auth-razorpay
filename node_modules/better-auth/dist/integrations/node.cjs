'use strict';

const node = require('better-call/node');

const toNodeHandler = (auth) => {
  return "handler" in auth ? node.toNodeHandler(auth.handler) : node.toNodeHandler(auth);
};
function fromNodeHeaders(nodeHeaders) {
  const webHeaders = new Headers();
  for (const [key, value] of Object.entries(nodeHeaders)) {
    if (value !== void 0) {
      if (Array.isArray(value)) {
        value.forEach((v) => webHeaders.append(key, v));
      } else {
        webHeaders.set(key, value);
      }
    }
  }
  return webHeaders;
}

exports.fromNodeHeaders = fromNodeHeaders;
exports.toNodeHandler = toNodeHandler;
