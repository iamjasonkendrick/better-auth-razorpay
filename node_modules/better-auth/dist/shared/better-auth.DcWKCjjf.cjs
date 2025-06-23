'use strict';

const zod = require('zod');
const betterCall = require('better-call');

const accountSchema = zod.z.object({
  id: zod.z.string(),
  providerId: zod.z.string(),
  accountId: zod.z.string(),
  userId: zod.z.coerce.string(),
  accessToken: zod.z.string().nullish(),
  refreshToken: zod.z.string().nullish(),
  idToken: zod.z.string().nullish(),
  /**
   * Access token expires at
   */
  accessTokenExpiresAt: zod.z.date().nullish(),
  /**
   * Refresh token expires at
   */
  refreshTokenExpiresAt: zod.z.date().nullish(),
  /**
   * The scopes that the user has authorized
   */
  scope: zod.z.string().nullish(),
  /**
   * Password is only stored in the credential provider
   */
  password: zod.z.string().nullish(),
  createdAt: zod.z.date().default(() => /* @__PURE__ */ new Date()),
  updatedAt: zod.z.date().default(() => /* @__PURE__ */ new Date())
});
const userSchema = zod.z.object({
  id: zod.z.string(),
  email: zod.z.string().transform((val) => val.toLowerCase()),
  emailVerified: zod.z.boolean().default(false),
  name: zod.z.string(),
  image: zod.z.string().nullish(),
  createdAt: zod.z.date().default(() => /* @__PURE__ */ new Date()),
  updatedAt: zod.z.date().default(() => /* @__PURE__ */ new Date())
});
const sessionSchema = zod.z.object({
  id: zod.z.string(),
  userId: zod.z.coerce.string(),
  expiresAt: zod.z.date(),
  createdAt: zod.z.date().default(() => /* @__PURE__ */ new Date()),
  updatedAt: zod.z.date().default(() => /* @__PURE__ */ new Date()),
  token: zod.z.string(),
  ipAddress: zod.z.string().nullish(),
  userAgent: zod.z.string().nullish()
});
const verificationSchema = zod.z.object({
  id: zod.z.string(),
  value: zod.z.string(),
  createdAt: zod.z.date().default(() => /* @__PURE__ */ new Date()),
  updatedAt: zod.z.date().default(() => /* @__PURE__ */ new Date()),
  expiresAt: zod.z.date(),
  identifier: zod.z.string()
});
function parseOutputData(data, schema) {
  const fields = schema.fields;
  const parsedData = {};
  for (const key in data) {
    const field = fields[key];
    if (!field) {
      parsedData[key] = data[key];
      continue;
    }
    if (field.returned === false) {
      continue;
    }
    parsedData[key] = data[key];
  }
  return parsedData;
}
function getAllFields(options, table) {
  let schema = {
    ...table === "user" ? options.user?.additionalFields : {},
    ...table === "session" ? options.session?.additionalFields : {}
  };
  for (const plugin of options.plugins || []) {
    if (plugin.schema && plugin.schema[table]) {
      schema = {
        ...schema,
        ...plugin.schema[table].fields
      };
    }
  }
  return schema;
}
function parseUserOutput(options, user) {
  const schema = getAllFields(options, "user");
  return parseOutputData(user, { fields: schema });
}
function parseAccountOutput(options, account) {
  const schema = getAllFields(options, "account");
  return parseOutputData(account, { fields: schema });
}
function parseSessionOutput(options, session) {
  const schema = getAllFields(options, "session");
  return parseOutputData(session, { fields: schema });
}
function parseInputData(data, schema) {
  const action = schema.action || "create";
  const fields = schema.fields;
  const parsedData = {};
  for (const key in fields) {
    if (key in data) {
      if (fields[key].input === false) {
        if (fields[key].defaultValue) {
          parsedData[key] = fields[key].defaultValue;
          continue;
        }
        continue;
      }
      if (fields[key].validator?.input && data[key] !== void 0) {
        parsedData[key] = fields[key].validator.input.parse(data[key]);
        continue;
      }
      if (fields[key].transform?.input && data[key] !== void 0) {
        parsedData[key] = fields[key].transform?.input(data[key]);
        continue;
      }
      parsedData[key] = data[key];
      continue;
    }
    if (fields[key].defaultValue && action === "create") {
      parsedData[key] = fields[key].defaultValue;
      continue;
    }
    if (fields[key].required && action === "create") {
      throw new betterCall.APIError("BAD_REQUEST", {
        message: `${key} is required`
      });
    }
  }
  return parsedData;
}
function parseUserInput(options, user, action) {
  const schema = getAllFields(options, "user");
  return parseInputData(user || {}, { fields: schema, action });
}
function parseAdditionalUserInput(options, user) {
  const schema = getAllFields(options, "user");
  return parseInputData(user || {}, { fields: schema });
}
function parseAccountInput(options, account) {
  const schema = getAllFields(options, "account");
  return parseInputData(account, { fields: schema });
}
function parseSessionInput(options, session) {
  const schema = getAllFields(options, "session");
  return parseInputData(session, { fields: schema });
}
function mergeSchema(schema, newSchema) {
  if (!newSchema) {
    return schema;
  }
  for (const table in newSchema) {
    const newModelName = newSchema[table]?.modelName;
    if (newModelName) {
      schema[table].modelName = newModelName;
    }
    for (const field in schema[table].fields) {
      const newField = newSchema[table]?.fields?.[field];
      if (!newField) {
        continue;
      }
      schema[table].fields[field].fieldName = newField;
    }
  }
  return schema;
}

exports.accountSchema = accountSchema;
exports.getAllFields = getAllFields;
exports.mergeSchema = mergeSchema;
exports.parseAccountInput = parseAccountInput;
exports.parseAccountOutput = parseAccountOutput;
exports.parseAdditionalUserInput = parseAdditionalUserInput;
exports.parseInputData = parseInputData;
exports.parseOutputData = parseOutputData;
exports.parseSessionInput = parseSessionInput;
exports.parseSessionOutput = parseSessionOutput;
exports.parseUserInput = parseUserInput;
exports.parseUserOutput = parseUserOutput;
exports.sessionSchema = sessionSchema;
exports.userSchema = userSchema;
exports.verificationSchema = verificationSchema;
