'use strict';

function toSolidStartHandler(auth) {
  const handler = async (event) => {
    return "handler" in auth ? auth.handler(event.request) : auth(event.request);
  };
  return {
    GET: handler,
    POST: handler
  };
}

exports.toSolidStartHandler = toSolidStartHandler;
