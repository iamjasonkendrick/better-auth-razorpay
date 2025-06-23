"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/adapters/node/index.ts
var node_exports = {};
__export(node_exports, {
  getRequest: () => getRequest,
  setResponse: () => setResponse,
  toNodeHandler: () => toNodeHandler
});
module.exports = __toCommonJS(node_exports);

// src/adapters/node/request.ts
var set_cookie_parser = __toESM(require("set-cookie-parser"), 1);
function get_raw_body(req, body_size_limit) {
  const h = req.headers;
  if (!h["content-type"]) return null;
  const content_length = Number(h["content-length"]);
  if (req.httpVersionMajor === 1 && isNaN(content_length) && h["transfer-encoding"] == null || content_length === 0) {
    return null;
  }
  let length = content_length;
  if (body_size_limit) {
    if (!length) {
      length = body_size_limit;
    } else if (length > body_size_limit) {
      throw Error(
        `Received content-length of ${length}, but only accept up to ${body_size_limit} bytes.`
      );
    }
  }
  if (req.destroyed) {
    const readable = new ReadableStream();
    readable.cancel();
    return readable;
  }
  let size = 0;
  let cancelled = false;
  return new ReadableStream({
    start(controller) {
      req.on("error", (error) => {
        cancelled = true;
        controller.error(error);
      });
      req.on("end", () => {
        if (cancelled) return;
        controller.close();
      });
      req.on("data", (chunk) => {
        if (cancelled) return;
        size += chunk.length;
        if (size > length) {
          cancelled = true;
          controller.error(
            new Error(
              `request body size exceeded ${content_length ? "'content-length'" : "BODY_SIZE_LIMIT"} of ${length}`
            )
          );
          return;
        }
        controller.enqueue(chunk);
        if (controller.desiredSize === null || controller.desiredSize <= 0) {
          req.pause();
        }
      });
    },
    pull() {
      req.resume();
    },
    cancel(reason) {
      cancelled = true;
      req.destroy(reason);
    }
  });
}
function getRequest({
  request,
  base,
  bodySizeLimit
}) {
  return new Request(base + request.url, {
    // @ts-expect-error
    duplex: "half",
    method: request.method,
    body: get_raw_body(request, bodySizeLimit),
    headers: request.headers
  });
}
async function setResponse(res, response) {
  for (const [key, value] of response.headers) {
    try {
      res.setHeader(
        key,
        key === "set-cookie" ? set_cookie_parser.splitCookiesString(response.headers.get(key)) : value
      );
    } catch (error) {
      res.getHeaderNames().forEach((name) => res.removeHeader(name));
      res.writeHead(500).end(String(error));
      return;
    }
  }
  res.writeHead(response.status);
  if (!response.body) {
    res.end();
    return;
  }
  if (response.body.locked) {
    res.end(
      "Fatal error: Response body is locked. This can happen when the response was already read (for example through 'response.json()' or 'response.text()')."
    );
    return;
  }
  const reader = response.body.getReader();
  if (res.destroyed) {
    reader.cancel();
    return;
  }
  const cancel = (error) => {
    res.off("close", cancel);
    res.off("error", cancel);
    reader.cancel(error).catch(() => {
    });
    if (error) res.destroy(error);
  };
  res.on("close", cancel);
  res.on("error", cancel);
  next();
  async function next() {
    try {
      for (; ; ) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!res.write(value)) {
          res.once("drain", next);
          return;
        }
      }
      res.end();
    } catch (error) {
      cancel(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

// src/adapters/node/index.ts
function toNodeHandler(handler) {
  return async (req, res) => {
    const protocol = req.headers["x-forwarded-proto"] || (req.socket.encrypted ? "https" : "http");
    const base = `${protocol}://${req.headers[":authority"] || req.headers.host}`;
    const response = await handler(getRequest({ base, request: req }));
    return setResponse(res, response);
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getRequest,
  setResponse,
  toNodeHandler
});
//# sourceMappingURL=node.cjs.map