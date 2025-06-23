import { count, desc, asc, sql, eq, inArray, like, lt, lte, ne, gt, gte, and, or } from 'drizzle-orm';
import { B as BetterAuthError } from '../../shared/better-auth.DdzSJf-n.mjs';
import { c as createAdapter } from '../../shared/better-auth.WByh1Fkk.mjs';
import '../../shared/better-auth.tB5eU6EY.mjs';
import '../../shared/better-auth.DGdvqtd1.mjs';
import '../../shared/better-auth.DORkW_Ge.mjs';
import '../../shared/better-auth.BUPPRXfK.mjs';
import '@better-auth/utils/random';
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
import '../../shared/better-auth.B4Qoxdgc.mjs';
import '../../shared/better-auth.Cqykj82J.mjs';

const drizzleAdapter = (db, config) => createAdapter({
  config: {
    adapterId: "drizzle",
    adapterName: "Drizzle Adapter",
    usePlural: config.usePlural ?? false,
    debugLogs: config.debugLogs ?? false
  },
  adapter: ({ getFieldName, debugLog }) => {
    function getSchema(model) {
      const schema = config.schema || db._.fullSchema;
      if (!schema) {
        throw new BetterAuthError(
          "Drizzle adapter failed to initialize. Schema not found. Please provide a schema object in the adapter options object."
        );
      }
      const schemaModel = schema[model];
      if (!schemaModel) {
        throw new BetterAuthError(
          `[# Drizzle Adapter]: The model "${model}" was not found in the schema object. Please pass the schema directly to the adapter options.`
        );
      }
      return schemaModel;
    }
    const withReturning = async (model, builder, data, where) => {
      if (config.provider !== "mysql") {
        const c = await builder.returning();
        return c[0];
      }
      await builder.execute();
      const schemaModel = getSchema(model);
      const builderVal = builder.config?.values;
      if (where?.length) {
        const clause = convertWhereClause(where, model);
        const res = await db.select().from(schemaModel).where(...clause);
        return res[0];
      } else if (builderVal && builderVal[0]?.id?.value) {
        let tId = builderVal[0]?.id?.value;
        if (!tId) {
          const lastInsertId = await db.select({ id: sql`LAST_INSERT_ID()` }).from(schemaModel).orderBy(desc(schemaModel.id)).limit(1);
          tId = lastInsertId[0].id;
        }
        const res = await db.select().from(schemaModel).where(eq(schemaModel.id, tId)).limit(1).execute();
        return res[0];
      } else if (data.id) {
        const res = await db.select().from(schemaModel).where(eq(schemaModel.id, data.id)).limit(1).execute();
        return res[0];
      } else {
        if (!("id" in schemaModel)) {
          throw new BetterAuthError(
            `The model "${model}" does not have an "id" field. Please use the "id" field as your primary key.`
          );
        }
        const res = await db.select().from(schemaModel).orderBy(desc(schemaModel.id)).limit(1).execute();
        return res[0];
      }
    };
    function convertWhereClause(where, model) {
      const schemaModel = getSchema(model);
      if (!where) return [];
      if (where.length === 1) {
        const w = where[0];
        if (!w) {
          return [];
        }
        const field = getFieldName({ model, field: w.field });
        if (!schemaModel[field]) {
          throw new BetterAuthError(
            `The field "${w.field}" does not exist in the schema for the model "${model}". Please update your schema.`
          );
        }
        if (w.operator === "in") {
          if (!Array.isArray(w.value)) {
            throw new BetterAuthError(
              `The value for the field "${w.field}" must be an array when using the "in" operator.`
            );
          }
          return [inArray(schemaModel[field], w.value)];
        }
        if (w.operator === "contains") {
          return [like(schemaModel[field], `%${w.value}%`)];
        }
        if (w.operator === "starts_with") {
          return [like(schemaModel[field], `${w.value}%`)];
        }
        if (w.operator === "ends_with") {
          return [like(schemaModel[field], `%${w.value}`)];
        }
        if (w.operator === "lt") {
          return [lt(schemaModel[field], w.value)];
        }
        if (w.operator === "lte") {
          return [lte(schemaModel[field], w.value)];
        }
        if (w.operator === "ne") {
          return [ne(schemaModel[field], w.value)];
        }
        if (w.operator === "gt") {
          return [gt(schemaModel[field], w.value)];
        }
        if (w.operator === "gte") {
          return [gte(schemaModel[field], w.value)];
        }
        return [eq(schemaModel[field], w.value)];
      }
      const andGroup = where.filter(
        (w) => w.connector === "AND" || !w.connector
      );
      const orGroup = where.filter((w) => w.connector === "OR");
      const andClause = and(
        ...andGroup.map((w) => {
          const field = getFieldName({ model, field: w.field });
          if (w.operator === "in") {
            if (!Array.isArray(w.value)) {
              throw new BetterAuthError(
                `The value for the field "${w.field}" must be an array when using the "in" operator.`
              );
            }
            return inArray(schemaModel[field], w.value);
          }
          return eq(schemaModel[field], w.value);
        })
      );
      const orClause = or(
        ...orGroup.map((w) => {
          const field = getFieldName({ model, field: w.field });
          return eq(schemaModel[field], w.value);
        })
      );
      const clause = [];
      if (andGroup.length) clause.push(andClause);
      if (orGroup.length) clause.push(orClause);
      return clause;
    }
    function checkMissingFields(schema, model, values) {
      if (!schema) {
        throw new BetterAuthError(
          "Drizzle adapter failed to initialize. Schema not found. Please provide a schema object in the adapter options object."
        );
      }
      for (const key in values) {
        if (!schema[key]) {
          throw new BetterAuthError(
            `The field "${key}" does not exist in the "${model}" schema. Please update your drizzle schema or re-generate using "npx @better-auth/cli generate".`
          );
        }
      }
    }
    return {
      async create({ model, data: values }) {
        const schemaModel = getSchema(model);
        checkMissingFields(schemaModel, model, values);
        const builder = db.insert(schemaModel).values(values);
        const returned = await withReturning(model, builder, values);
        return returned;
      },
      async findOne({ model, where }) {
        const schemaModel = getSchema(model);
        const clause = convertWhereClause(where, model);
        const res = await db.select().from(schemaModel).where(...clause);
        if (!res.length) return null;
        return res[0];
      },
      async findMany({ model, where, sortBy, limit, offset }) {
        const schemaModel = getSchema(model);
        const clause = where ? convertWhereClause(where, model) : [];
        const sortFn = sortBy?.direction === "desc" ? desc : asc;
        const builder = db.select().from(schemaModel).limit(limit || 100).offset(offset || 0);
        if (sortBy?.field) {
          builder.orderBy(
            sortFn(
              schemaModel[getFieldName({ model, field: sortBy?.field })]
            )
          );
        }
        return await builder.where(...clause);
      },
      async count({ model, where }) {
        const schemaModel = getSchema(model);
        const clause = where ? convertWhereClause(where, model) : [];
        const res = await db.select({ count: count() }).from(schemaModel).where(...clause);
        return res[0].count;
      },
      async update({ model, where, update: values }) {
        const schemaModel = getSchema(model);
        const clause = convertWhereClause(where, model);
        const builder = db.update(schemaModel).set(values).where(...clause);
        return await withReturning(model, builder, values, where);
      },
      async updateMany({ model, where, update: values }) {
        const schemaModel = getSchema(model);
        const clause = convertWhereClause(where, model);
        const builder = db.update(schemaModel).set(values).where(...clause);
        return await builder;
      },
      async delete({ model, where }) {
        const schemaModel = getSchema(model);
        const clause = convertWhereClause(where, model);
        const builder = db.delete(schemaModel).where(...clause);
        return await builder;
      },
      async deleteMany({ model, where }) {
        const schemaModel = getSchema(model);
        const clause = convertWhereClause(where, model);
        const builder = db.delete(schemaModel).where(...clause);
        return await builder;
      },
      options: config
    };
  }
});

export { drizzleAdapter };
