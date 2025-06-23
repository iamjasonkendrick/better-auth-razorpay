import { g as getDate } from './better-auth.CW6D9eSx.mjs';
import { d as parseSessionOutput, b as parseUserOutput } from './better-auth.Cc72UxUH.mjs';
import { g as getIp } from './better-auth.iKoUsdFE.mjs';
import { s as safeJSONParse } from './better-auth.tB5eU6EY.mjs';
import { g as generateId } from './better-auth.BUPPRXfK.mjs';
import 'zod';
import 'better-call';
import '@better-auth/utils/hash';
import '@noble/ciphers/chacha';
import '@noble/ciphers/utils';
import '@noble/ciphers/webcrypto';
import '@better-auth/utils/base64';
import 'jose';
import '@noble/hashes/scrypt';
import '@better-auth/utils';
import '@better-auth/utils/hex';
import '@noble/hashes/utils';
import './better-auth.B4Qoxdgc.mjs';
import { l as logger, c as createLogger } from './better-auth.Cqykj82J.mjs';
import './better-auth.8zoxzg-F.mjs';
import '@better-auth/utils/random';
import { g as getAuthTables } from './better-auth.DORkW_Ge.mjs';
import { B as BetterAuthError } from './better-auth.DdzSJf-n.mjs';
import { c as createKyselyAdapter, k as kyselyAdapter } from './better-auth.Cue6reJU.mjs';
import { m as memoryAdapter } from './better-auth.CTsDOF_S.mjs';
import 'kysely';

function getWithHooks(adapter, ctx) {
  const hooks = ctx.hooks;
  async function createWithHooks(data, model, customCreateFn, context) {
    let actualData = data;
    for (const hook of hooks || []) {
      const toRun = hook[model]?.create?.before;
      if (toRun) {
        const result = await toRun(actualData, context);
        if (result === false) {
          return null;
        }
        const isObject = typeof result === "object" && "data" in result;
        if (isObject) {
          actualData = {
            ...actualData,
            ...result.data
          };
        }
      }
    }
    const customCreated = customCreateFn ? await customCreateFn.fn(actualData) : null;
    const created = !customCreateFn || customCreateFn.executeMainFn ? await adapter.create({
      model,
      data: actualData
    }) : customCreated;
    for (const hook of hooks || []) {
      const toRun = hook[model]?.create?.after;
      if (toRun) {
        await toRun(created, context);
      }
    }
    return created;
  }
  async function updateWithHooks(data, where, model, customUpdateFn, context) {
    let actualData = data;
    for (const hook of hooks || []) {
      const toRun = hook[model]?.update?.before;
      if (toRun) {
        const result = await toRun(data, context);
        if (result === false) {
          return null;
        }
        const isObject = typeof result === "object";
        actualData = isObject ? result.data : result;
      }
    }
    const customUpdated = customUpdateFn ? await customUpdateFn.fn(actualData) : null;
    const updated = !customUpdateFn || customUpdateFn.executeMainFn ? await adapter.update({
      model,
      update: actualData,
      where
    }) : customUpdated;
    for (const hook of hooks || []) {
      const toRun = hook[model]?.update?.after;
      if (toRun) {
        await toRun(updated, context);
      }
    }
    return updated;
  }
  async function updateManyWithHooks(data, where, model, customUpdateFn, context) {
    let actualData = data;
    for (const hook of hooks || []) {
      const toRun = hook[model]?.update?.before;
      if (toRun) {
        const result = await toRun(data, context);
        if (result === false) {
          return null;
        }
        const isObject = typeof result === "object";
        actualData = isObject ? result.data : result;
      }
    }
    const customUpdated = customUpdateFn ? await customUpdateFn.fn(actualData) : null;
    const updated = !customUpdateFn || customUpdateFn.executeMainFn ? await adapter.updateMany({
      model,
      update: actualData,
      where
    }) : customUpdated;
    for (const hook of hooks || []) {
      const toRun = hook[model]?.update?.after;
      if (toRun) {
        await toRun(updated, context);
      }
    }
    return updated;
  }
  return {
    createWithHooks,
    updateWithHooks,
    updateManyWithHooks
  };
}

const createInternalAdapter = (adapter, ctx) => {
  const options = ctx.options;
  const secondaryStorage = options.secondaryStorage;
  const sessionExpiration = options.session?.expiresIn || 60 * 60 * 24 * 7;
  const { createWithHooks, updateWithHooks, updateManyWithHooks } = getWithHooks(adapter, ctx);
  return {
    createOAuthUser: async (user, account, context) => {
      const createdUser = await createWithHooks(
        {
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date(),
          ...user
        },
        "user",
        void 0,
        context
      );
      const createdAccount = await createWithHooks(
        {
          ...account,
          userId: createdUser.id || user.id,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        },
        "account",
        void 0,
        context
      );
      return {
        user: createdUser,
        account: createdAccount
      };
    },
    createUser: async (user, context) => {
      const createdUser = await createWithHooks(
        {
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date(),
          emailVerified: false,
          ...user,
          email: user.email?.toLowerCase()
        },
        "user",
        void 0,
        context
      );
      return createdUser;
    },
    createAccount: async (account, context) => {
      const createdAccount = await createWithHooks(
        {
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date(),
          ...account
        },
        "account",
        void 0,
        context
      );
      return createdAccount;
    },
    listSessions: async (userId) => {
      if (secondaryStorage) {
        const currentList = await secondaryStorage.get(
          `active-sessions-${userId}`
        );
        if (!currentList) return [];
        const list = safeJSONParse(currentList) || [];
        const now = Date.now();
        const validSessions = list.filter((s) => s.expiresAt > now);
        const sessions2 = [];
        for (const session of validSessions) {
          const sessionStringified = await secondaryStorage.get(session.token);
          if (sessionStringified) {
            const s = JSON.parse(sessionStringified);
            const parsedSession = parseSessionOutput(ctx.options, {
              ...s.session,
              expiresAt: new Date(s.session.expiresAt)
            });
            sessions2.push(parsedSession);
          }
        }
        return sessions2;
      }
      const sessions = await adapter.findMany({
        model: "session",
        where: [
          {
            field: "userId",
            value: userId
          }
        ]
      });
      return sessions;
    },
    listUsers: async (limit, offset, sortBy, where) => {
      const users = await adapter.findMany({
        model: "user",
        limit,
        offset,
        sortBy,
        where
      });
      return users;
    },
    countTotalUsers: async (where) => {
      const total = await adapter.count({
        model: "user",
        where
      });
      if (typeof total === "string") {
        return parseInt(total);
      }
      return total;
    },
    deleteUser: async (userId) => {
      if (secondaryStorage) {
        await secondaryStorage.delete(`active-sessions-${userId}`);
      }
      if (!secondaryStorage || options.session?.storeSessionInDatabase) {
        await adapter.deleteMany({
          model: "session",
          where: [
            {
              field: "userId",
              value: userId
            }
          ]
        });
      }
      await adapter.deleteMany({
        model: "account",
        where: [
          {
            field: "userId",
            value: userId
          }
        ]
      });
      await adapter.delete({
        model: "user",
        where: [
          {
            field: "id",
            value: userId
          }
        ]
      });
    },
    createSession: async (userId, ctx2, dontRememberMe, override, overrideAll) => {
      const headers = ctx2.headers || ctx2.request?.headers;
      const { id: _, ...rest } = override || {};
      const data = {
        ipAddress: ctx2.request || ctx2.headers ? getIp(ctx2.request || ctx2.headers, ctx2.context.options) || "" : "",
        userAgent: headers?.get("user-agent") || "",
        ...rest,
        /**
         * If the user doesn't want to be remembered
         * set the session to expire in 1 day.
         * The cookie will be set to expire at the end of the session
         */
        expiresAt: dontRememberMe ? getDate(60 * 60 * 24, "sec") : getDate(sessionExpiration, "sec"),
        userId,
        token: generateId(32),
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date(),
        ...overrideAll ? rest : {}
      };
      const res = await createWithHooks(
        data,
        "session",
        secondaryStorage ? {
          fn: async (sessionData) => {
            const currentList = await secondaryStorage.get(
              `active-sessions-${userId}`
            );
            let list = [];
            const now = Date.now();
            if (currentList) {
              list = safeJSONParse(currentList) || [];
              list = list.filter((session) => session.expiresAt > now);
            }
            list.push({
              token: data.token,
              expiresAt: now + sessionExpiration * 1e3
            });
            await secondaryStorage.set(
              `active-sessions-${userId}`,
              JSON.stringify(list),
              sessionExpiration
            );
            return sessionData;
          },
          executeMainFn: options.session?.storeSessionInDatabase
        } : void 0,
        ctx2
      );
      return res;
    },
    findSession: async (token) => {
      if (secondaryStorage) {
        const sessionStringified = await secondaryStorage.get(token);
        if (!sessionStringified && !options.session?.storeSessionInDatabase) {
          return null;
        }
        if (sessionStringified) {
          const s = JSON.parse(sessionStringified);
          const parsedSession2 = parseSessionOutput(ctx.options, {
            ...s.session,
            expiresAt: new Date(s.session.expiresAt),
            createdAt: new Date(s.session.createdAt),
            updatedAt: new Date(s.session.updatedAt)
          });
          const parsedUser2 = parseUserOutput(ctx.options, {
            ...s.user,
            createdAt: new Date(s.user.createdAt),
            updatedAt: new Date(s.user.updatedAt)
          });
          return {
            session: parsedSession2,
            user: parsedUser2
          };
        }
      }
      const session = await adapter.findOne({
        model: "session",
        where: [
          {
            value: token,
            field: "token"
          }
        ]
      });
      if (!session) {
        return null;
      }
      const user = await adapter.findOne({
        model: "user",
        where: [
          {
            value: session.userId,
            field: "id"
          }
        ]
      });
      if (!user) {
        return null;
      }
      const parsedSession = parseSessionOutput(ctx.options, session);
      const parsedUser = parseUserOutput(ctx.options, user);
      return {
        session: parsedSession,
        user: parsedUser
      };
    },
    findSessions: async (sessionTokens) => {
      if (secondaryStorage) {
        const sessions2 = [];
        for (const sessionToken of sessionTokens) {
          const sessionStringified = await secondaryStorage.get(sessionToken);
          if (sessionStringified) {
            const s = JSON.parse(sessionStringified);
            const session = {
              session: {
                ...s.session,
                expiresAt: new Date(s.session.expiresAt)
              },
              user: {
                ...s.user,
                createdAt: new Date(s.user.createdAt),
                updatedAt: new Date(s.user.updatedAt)
              }
            };
            sessions2.push(session);
          }
        }
        return sessions2;
      }
      const sessions = await adapter.findMany({
        model: "session",
        where: [
          {
            field: "token",
            value: sessionTokens,
            operator: "in"
          }
        ]
      });
      const userIds = sessions.map((session) => {
        return session.userId;
      });
      if (!userIds.length) return [];
      const users = await adapter.findMany({
        model: "user",
        where: [
          {
            field: "id",
            value: userIds,
            operator: "in"
          }
        ]
      });
      return sessions.map((session) => {
        const user = users.find((u) => u.id === session.userId);
        if (!user) return null;
        return {
          session,
          user
        };
      });
    },
    updateSession: async (sessionToken, session, context) => {
      const updatedSession = await updateWithHooks(
        session,
        [{ field: "token", value: sessionToken }],
        "session",
        secondaryStorage ? {
          async fn(data) {
            const currentSession = await secondaryStorage.get(sessionToken);
            let updatedSession2 = null;
            if (currentSession) {
              const parsedSession = JSON.parse(currentSession);
              updatedSession2 = {
                ...parsedSession.session,
                ...data
              };
              return updatedSession2;
            } else {
              return null;
            }
          },
          executeMainFn: options.session?.storeSessionInDatabase
        } : void 0,
        context
      );
      return updatedSession;
    },
    deleteSession: async (token) => {
      if (secondaryStorage) {
        await secondaryStorage.delete(token);
        if (!options.session?.storeSessionInDatabase || ctx.options.session?.preserveSessionInDatabase) {
          return;
        }
      }
      await adapter.delete({
        model: "session",
        where: [
          {
            field: "token",
            value: token
          }
        ]
      });
    },
    deleteAccounts: async (userId) => {
      await adapter.deleteMany({
        model: "account",
        where: [
          {
            field: "userId",
            value: userId
          }
        ]
      });
    },
    deleteAccount: async (accountId) => {
      await adapter.delete({
        model: "account",
        where: [
          {
            field: "id",
            value: accountId
          }
        ]
      });
    },
    deleteSessions: async (userIdOrSessionTokens) => {
      if (secondaryStorage) {
        if (typeof userIdOrSessionTokens === "string") {
          const activeSession = await secondaryStorage.get(
            `active-sessions-${userIdOrSessionTokens}`
          );
          const sessions = activeSession ? safeJSONParse(activeSession) : [];
          if (!sessions) return;
          for (const session of sessions) {
            await secondaryStorage.delete(session.token);
          }
        } else {
          for (const sessionToken of userIdOrSessionTokens) {
            const session = await secondaryStorage.get(sessionToken);
            if (session) {
              await secondaryStorage.delete(sessionToken);
            }
          }
        }
        if (!options.session?.storeSessionInDatabase || ctx.options.session?.preserveSessionInDatabase) {
          return;
        }
      }
      await adapter.deleteMany({
        model: "session",
        where: [
          {
            field: Array.isArray(userIdOrSessionTokens) ? "token" : "userId",
            value: userIdOrSessionTokens,
            operator: Array.isArray(userIdOrSessionTokens) ? "in" : void 0
          }
        ]
      });
    },
    findOAuthUser: async (email, accountId, providerId) => {
      const account = await adapter.findOne({
        model: "account",
        where: [
          {
            value: accountId,
            field: "accountId"
          },
          {
            value: providerId,
            field: "providerId"
          }
        ]
      });
      if (account) {
        const user = await adapter.findOne({
          model: "user",
          where: [
            {
              value: account.userId,
              field: "id"
            }
          ]
        });
        if (user) {
          return {
            user,
            accounts: [account]
          };
        } else {
          return null;
        }
      } else {
        const user = await adapter.findOne({
          model: "user",
          where: [
            {
              value: email.toLowerCase(),
              field: "email"
            }
          ]
        });
        if (user) {
          const accounts = await adapter.findMany({
            model: "account",
            where: [
              {
                value: user.id,
                field: "userId"
              }
            ]
          });
          return {
            user,
            accounts: accounts || []
          };
        } else {
          return null;
        }
      }
    },
    findUserByEmail: async (email, options2) => {
      const user = await adapter.findOne({
        model: "user",
        where: [
          {
            value: email.toLowerCase(),
            field: "email"
          }
        ]
      });
      if (!user) return null;
      if (options2?.includeAccounts) {
        const accounts = await adapter.findMany({
          model: "account",
          where: [
            {
              value: user.id,
              field: "userId"
            }
          ]
        });
        return {
          user,
          accounts
        };
      }
      return {
        user,
        accounts: []
      };
    },
    findUserById: async (userId) => {
      const user = await adapter.findOne({
        model: "user",
        where: [
          {
            field: "id",
            value: userId
          }
        ]
      });
      return user;
    },
    linkAccount: async (account, context) => {
      const _account = await createWithHooks(
        {
          ...account,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        },
        "account",
        void 0,
        context
      );
      return _account;
    },
    updateUser: async (userId, data, context) => {
      const user = await updateWithHooks(
        data,
        [
          {
            field: "id",
            value: userId
          }
        ],
        "user",
        void 0,
        context
      );
      return user;
    },
    updateUserByEmail: async (email, data, context) => {
      const user = await updateWithHooks(
        data,
        [
          {
            field: "email",
            value: email.toLowerCase()
          }
        ],
        "user",
        void 0,
        context
      );
      return user;
    },
    updatePassword: async (userId, password, context) => {
      await updateManyWithHooks(
        {
          password
        },
        [
          {
            field: "userId",
            value: userId
          },
          {
            field: "providerId",
            value: "credential"
          }
        ],
        "account",
        void 0,
        context
      );
    },
    findAccounts: async (userId) => {
      const accounts = await adapter.findMany({
        model: "account",
        where: [
          {
            field: "userId",
            value: userId
          }
        ]
      });
      return accounts;
    },
    findAccount: async (accountId) => {
      const account = await adapter.findOne({
        model: "account",
        where: [
          {
            field: "accountId",
            value: accountId
          }
        ]
      });
      return account;
    },
    findAccountByProviderId: async (accountId, providerId) => {
      const account = await adapter.findOne({
        model: "account",
        where: [
          {
            field: "accountId",
            value: accountId
          },
          {
            field: "providerId",
            value: providerId
          }
        ]
      });
      return account;
    },
    findAccountByUserId: async (userId) => {
      const account = await adapter.findMany({
        model: "account",
        where: [
          {
            field: "userId",
            value: userId
          }
        ]
      });
      return account;
    },
    updateAccount: async (id, data, context) => {
      const account = await updateWithHooks(
        data,
        [{ field: "id", value: id }],
        "account",
        void 0,
        context
      );
      return account;
    },
    createVerificationValue: async (data, context) => {
      const verification = await createWithHooks(
        {
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date(),
          ...data
        },
        "verification",
        void 0,
        context
      );
      return verification;
    },
    findVerificationValue: async (identifier) => {
      const verification = await adapter.findMany({
        model: "verification",
        where: [
          {
            field: "identifier",
            value: identifier
          }
        ],
        sortBy: {
          field: "createdAt",
          direction: "desc"
        },
        limit: 1
      });
      if (!options.verification?.disableCleanup) {
        await adapter.deleteMany({
          model: "verification",
          where: [
            {
              field: "expiresAt",
              value: /* @__PURE__ */ new Date(),
              operator: "lt"
            }
          ]
        });
      }
      const lastVerification = verification[0];
      return lastVerification;
    },
    deleteVerificationValue: async (id) => {
      await adapter.delete({
        model: "verification",
        where: [
          {
            field: "id",
            value: id
          }
        ]
      });
    },
    deleteVerificationByIdentifier: async (identifier) => {
      await adapter.delete({
        model: "verification",
        where: [
          {
            field: "identifier",
            value: identifier
          }
        ]
      });
    },
    updateVerificationValue: async (id, data, context) => {
      const verification = await updateWithHooks(
        data,
        [{ field: "id", value: id }],
        "verification",
        void 0,
        context
      );
      return verification;
    }
  };
};

async function getAdapter(options) {
  if (!options.database) {
    const tables = getAuthTables(options);
    const memoryDB = Object.keys(tables).reduce((acc, key) => {
      acc[key] = [];
      return acc;
    }, {});
    logger.warn(
      "No database configuration provided. Using memory adapter in development"
    );
    return memoryAdapter(memoryDB)(options);
  }
  if (typeof options.database === "function") {
    return options.database(options);
  }
  const { kysely, databaseType } = await createKyselyAdapter(options);
  if (!kysely) {
    throw new BetterAuthError("Failed to initialize database adapter");
  }
  return kyselyAdapter(kysely, {
    type: databaseType || "sqlite",
    debugLogs: "debugLogs" in options.database ? options.database.debugLogs : false
  })(options);
}
function convertToDB(fields, values) {
  let result = values.id ? {
    id: values.id
  } : {};
  for (const key in fields) {
    const field = fields[key];
    const value = values[key];
    if (value === void 0) {
      continue;
    }
    result[field.fieldName || key] = value;
  }
  return result;
}
function convertFromDB(fields, values) {
  if (!values) {
    return null;
  }
  let result = {
    id: values.id
  };
  for (const [key, value] of Object.entries(fields)) {
    result[key] = values[value.fieldName || key];
  }
  return result;
}

function getSchema(config) {
  const tables = getAuthTables(config);
  let schema = {};
  for (const key in tables) {
    const table = tables[key];
    const fields = table.fields;
    let actualFields = {};
    Object.entries(fields).forEach(([key2, field]) => {
      actualFields[field.fieldName || key2] = field;
      if (field.references) {
        const refTable = tables[field.references.model];
        if (refTable) {
          actualFields[field.fieldName || key2].references = {
            model: refTable.modelName,
            field: field.references.field
          };
        }
      }
    });
    if (schema[table.modelName]) {
      schema[table.modelName].fields = {
        ...schema[table.modelName].fields,
        ...actualFields
      };
      continue;
    }
    schema[table.modelName] = {
      fields: actualFields,
      order: table.order || Infinity
    };
  }
  return schema;
}

const postgresMap = {
  string: ["character varying", "text"],
  number: [
    "int4",
    "integer",
    "bigint",
    "smallint",
    "numeric",
    "real",
    "double precision"
  ],
  boolean: ["bool", "boolean"],
  date: ["timestamp", "date"]
};
const mysqlMap = {
  string: ["varchar", "text"],
  number: [
    "integer",
    "int",
    "bigint",
    "smallint",
    "decimal",
    "float",
    "double"
  ],
  boolean: ["boolean", "tinyint"],
  date: ["timestamp", "datetime", "date"]
};
const sqliteMap = {
  string: ["TEXT"],
  number: ["INTEGER", "REAL"],
  boolean: ["INTEGER", "BOOLEAN"],
  // 0 or 1
  date: ["DATE", "INTEGER"]
};
const mssqlMap = {
  string: ["text", "varchar"],
  number: ["int", "bigint", "smallint", "decimal", "float", "double"],
  boolean: ["bit", "smallint"],
  date: ["datetime", "date"]
};
const map = {
  postgres: postgresMap,
  mysql: mysqlMap,
  sqlite: sqliteMap,
  mssql: mssqlMap
};
function matchType(columnDataType, fieldType, dbType) {
  if (fieldType === "string[]" || fieldType === "number[]") {
    return columnDataType.toLowerCase().includes("json");
  }
  const types = map[dbType];
  const type = Array.isArray(fieldType) ? types["string"].map((t) => t.toLowerCase()) : types[fieldType].map((t) => t.toLowerCase());
  const matches = type.includes(columnDataType.toLowerCase());
  return matches;
}
async function getMigrations(config) {
  const betterAuthSchema = getSchema(config);
  const logger = createLogger(config.logger);
  let { kysely: db, databaseType: dbType } = await createKyselyAdapter(config);
  if (!dbType) {
    logger.warn(
      "Could not determine database type, defaulting to sqlite. Please provide a type in the database options to avoid this."
    );
    dbType = "sqlite";
  }
  if (!db) {
    logger.error(
      "Only kysely adapter is supported for migrations. You can use `generate` command to generate the schema, if you're using a different adapter."
    );
    process.exit(1);
  }
  const tableMetadata = await db.introspection.getTables();
  const toBeCreated = [];
  const toBeAdded = [];
  for (const [key, value] of Object.entries(betterAuthSchema)) {
    const table = tableMetadata.find((t) => t.name === key);
    if (!table) {
      const tIndex = toBeCreated.findIndex((t) => t.table === key);
      const tableData = {
        table: key,
        fields: value.fields,
        order: value.order || Infinity
      };
      const insertIndex = toBeCreated.findIndex(
        (t) => (t.order || Infinity) > tableData.order
      );
      if (insertIndex === -1) {
        if (tIndex === -1) {
          toBeCreated.push(tableData);
        } else {
          toBeCreated[tIndex].fields = {
            ...toBeCreated[tIndex].fields,
            ...value.fields
          };
        }
      } else {
        toBeCreated.splice(insertIndex, 0, tableData);
      }
      continue;
    }
    let toBeAddedFields = {};
    for (const [fieldName, field] of Object.entries(value.fields)) {
      const column = table.columns.find((c) => c.name === fieldName);
      if (!column) {
        toBeAddedFields[fieldName] = field;
        continue;
      }
      if (matchType(column.dataType, field.type, dbType)) {
        continue;
      } else {
        logger.warn(
          `Field ${fieldName} in table ${key} has a different type in the database. Expected ${field.type} but got ${column.dataType}.`
        );
      }
    }
    if (Object.keys(toBeAddedFields).length > 0) {
      toBeAdded.push({
        table: key,
        fields: toBeAddedFields,
        order: value.order || Infinity
      });
    }
  }
  const migrations = [];
  function getType(field, fieldName) {
    const type = field.type;
    const typeMap = {
      string: {
        sqlite: "text",
        postgres: "text",
        mysql: field.unique ? "varchar(255)" : field.references ? "varchar(36)" : "text",
        mssql: field.unique || field.sortable ? "varchar(255)" : field.references ? "varchar(36)" : "text"
      },
      boolean: {
        sqlite: "integer",
        postgres: "boolean",
        mysql: "boolean",
        mssql: "smallint"
      },
      number: {
        sqlite: field.bigint ? "bigint" : "integer",
        postgres: field.bigint ? "bigint" : "integer",
        mysql: field.bigint ? "bigint" : "integer",
        mssql: field.bigint ? "bigint" : "integer"
      },
      date: {
        sqlite: "date",
        postgres: "timestamp",
        mysql: "datetime",
        mssql: "datetime"
      },
      id: {
        postgres: config.advanced?.database?.useNumberId ? "serial" : "text",
        mysql: config.advanced?.database?.useNumberId ? "integer" : "varchar(36)",
        mssql: config.advanced?.database?.useNumberId ? "integer" : "varchar(36)",
        sqlite: config.advanced?.database?.useNumberId ? "integer" : "text"
      }
    };
    if (fieldName === "id" || field.references?.field === "id") {
      return typeMap.id[dbType];
    }
    if (dbType === "sqlite" && (type === "string[]" || type === "number[]")) {
      return "text";
    }
    if (type === "string[]" || type === "number[]") {
      return "jsonb";
    }
    if (Array.isArray(type)) {
      return "text";
    }
    return typeMap[type][dbType || "sqlite"];
  }
  if (toBeAdded.length) {
    for (const table of toBeAdded) {
      for (const [fieldName, field] of Object.entries(table.fields)) {
        const type = getType(field, fieldName);
        const exec = db.schema.alterTable(table.table).addColumn(fieldName, type, (col) => {
          col = field.required !== false ? col.notNull() : col;
          if (field.references) {
            col = col.references(
              `${field.references.model}.${field.references.field}`
            );
          }
          if (field.unique) {
            col = col.unique();
          }
          return col;
        });
        migrations.push(exec);
      }
    }
  }
  if (toBeCreated.length) {
    for (const table of toBeCreated) {
      let dbT = db.schema.createTable(table.table).addColumn(
        "id",
        config.advanced?.database?.useNumberId ? dbType === "postgres" ? "serial" : "integer" : dbType === "mysql" || dbType === "mssql" ? "varchar(36)" : "text",
        (col) => {
          if (config.advanced?.database?.useNumberId) {
            if (dbType === "postgres") {
              return col.primaryKey().notNull();
            }
            return col.autoIncrement().primaryKey().notNull();
          }
          return col.primaryKey().notNull();
        }
      );
      for (const [fieldName, field] of Object.entries(table.fields)) {
        const type = getType(field, fieldName);
        dbT = dbT.addColumn(fieldName, type, (col) => {
          col = field.required !== false ? col.notNull() : col;
          if (field.references) {
            col = col.references(
              `${field.references.model}.${field.references.field}`
            );
          }
          if (field.unique) {
            col = col.unique();
          }
          return col;
        });
      }
      migrations.push(dbT);
    }
  }
  async function runMigrations() {
    for (const migration of migrations) {
      await migration.execute();
    }
  }
  async function compileMigrations() {
    const compiled = migrations.map((m) => m.compile().sql);
    return compiled.join(";\n\n") + ";";
  }
  return { toBeCreated, toBeAdded, runMigrations, compileMigrations };
}

export { getAdapter as a, convertToDB as b, createInternalAdapter as c, convertFromDB as d, getMigrations as e, getSchema as f, getWithHooks as g, matchType as m };
