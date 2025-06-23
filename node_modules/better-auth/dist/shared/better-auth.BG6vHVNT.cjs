'use strict';

const zod = require('zod');

const schema = {
  jwks: {
    fields: {
      publicKey: {
        type: "string",
        required: true
      },
      privateKey: {
        type: "string",
        required: true
      },
      createdAt: {
        type: "date",
        required: true
      }
    }
  }
};
zod.z.object({
  id: zod.z.string(),
  publicKey: zod.z.string(),
  privateKey: zod.z.string(),
  createdAt: zod.z.date()
});

exports.schema = schema;
