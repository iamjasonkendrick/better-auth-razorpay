import { z } from 'zod';
import { APIError } from 'better-call';

const accountSchema = z.object({
  id: z.string(),
  providerId: z.string(),
  accountId: z.string(),
  userId: z.coerce.string(),
  accessToken: z.string().nullish(),
  refreshToken: z.string().nullish(),
  idToken: z.string().nullish(),
  /**
   * Access token expires at
   */
  accessTokenExpiresAt: z.date().nullish(),
  /**
   * Refresh token expires at
   */
  refreshTokenExpiresAt: z.date().nullish(),
  /**
   * The scopes that the user has authorized
   */
  scope: z.string().nullish(),
  /**
   * Password is only stored in the credential provider
   */
  password: z.string().nullish(),
  createdAt: z.date().default(() => /* @__PURE__ */ new Date()),
  updatedAt: z.date().default(() => /* @__PURE__ */ new Date())
});
const userSchema = z.object({
  id: z.string(),
  email: z.string().transform((val) => val.toLowerCase()),
  emailVerified: z.boolean().default(false),
  name: z.string(),
  image: z.string().nullish(),
  createdAt: z.date().default(() => /* @__PURE__ */ new Date()),
  updatedAt: z.date().default(() => /* @__PURE__ */ new Date())
});
const sessionSchema = z.object({
  id: z.string(),
  userId: z.coerce.string(),
  expiresAt: z.date(),
  createdAt: z.date().default(() => /* @__PURE__ */ new Date()),
  updatedAt: z.date().default(() => /* @__PURE__ */ new Date()),
  token: z.string(),
  ipAddress: z.string().nullish(),
  userAgent: z.string().nullish()
});
const verificationSchema = z.object({
  id: z.string(),
  value: z.string(),
  createdAt: z.date().default(() => /* @__PURE__ */ new Date()),
  updatedAt: z.date().default(() => /* @__PURE__ */ new Date()),
  expiresAt: z.date(),
  identifier: z.string()
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
      throw new APIError("BAD_REQUEST", {
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

export { accountSchema as a, parseUserOutput as b, parseAccountOutput as c, parseSessionOutput as d, parseInputData as e, parseUserInput as f, getAllFields as g, parseAdditionalUserInput as h, parseAccountInput as i, parseSessionInput as j, mergeSchema as m, parseOutputData as p, sessionSchema as s, userSchema as u, verificationSchema as v };
