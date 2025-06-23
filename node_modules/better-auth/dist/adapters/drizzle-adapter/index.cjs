'use strict';

const drizzleOrm = require('drizzle-orm');
const index$1 = require('../../shared/better-auth.ANpbi45u.cjs');
const index = require('../../shared/better-auth.DiXGV1jJ.cjs');
require('../../shared/better-auth.D3mtHEZg.cjs');
require('../../shared/better-auth.h_UKC9xe.cjs');
require('../../shared/better-auth.BEphVDyL.cjs');
require('../../shared/better-auth.Bg6iw3ig.cjs');
require('@better-auth/utils/random');
require('zod');
require('better-call');
require('@better-auth/utils/hash');
require('@noble/ciphers/chacha');
require('@noble/ciphers/utils');
require('@noble/ciphers/webcrypto');
require('@better-auth/utils/base64');
require('jose');
require('@noble/hashes/scrypt');
require('@better-auth/utils');
require('@better-auth/utils/hex');
require('@noble/hashes/utils');
require('../../shared/better-auth.CYeOI8C-.cjs');
require('../../shared/better-auth.GpOOav9x.cjs');

const drizzleAdapter = (db, config) => index.createAdapter({
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
        throw new index$1.BetterAuthError(
          "Drizzle adapter failed to initialize. Schema not found. Please provide a schema object in the adapter options object."
        );
      }
      const schemaModel = schema[model];
      if (!schemaModel) {
        throw new index$1.BetterAuthError(
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
          const lastInsertId = await db.select({ id: drizzleOrm.sql`LAST_INSERT_ID()` }).from(schemaModel).orderBy(drizzleOrm.desc(schemaModel.id)).limit(1);
          tId = lastInsertId[0].id;
        }
        const res = await db.select().from(schemaModel).where(drizzleOrm.eq(schemaModel.id, tId)).limit(1).execute();
        return res[0];
      } else if (data.id) {
        const res = await db.select().from(schemaModel).where(drizzleOrm.eq(schemaModel.id, data.id)).limit(1).execute();
        return res[0];
      } else {
        if (!("id" in schemaModel)) {
          throw new index$1.BetterAuthError(
            `The model "${model}" does not have an "id" field. Please use the "id" field as your primary key.`
          );
        }
        const res = await db.select().from(schemaModel).orderBy(drizzleOrm.desc(schemaModel.id)).limit(1).execute();
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
          throw new index$1.BetterAuthError(
            `The field "${w.field}" does not exist in the schema for the model "${model}". Please update your schema.`
          );
        }
        if (w.operator === "in") {
          if (!Array.isArray(w.value)) {
            throw new index$1.BetterAuthError(
              `The value for the field "${w.field}" must be an array when using the "in" operator.`
            );
          }
          return [drizzleOrm.inArray(schemaModel[field], w.value)];
        }
        if (w.operator === "contains") {
          return [drizzleOrm.like(schemaModel[field], `%${w.value}%`)];
        }
        if (w.operator === "starts_with") {
          return [drizzleOrm.like(schemaModel[field], `${w.value}%`)];
        }
        if (w.operator === "ends_with") {
          return [drizzleOrm.like(schemaModel[field], `%${w.value}`)];
        }
        if (w.operator === "lt") {
          return [drizzleOrm.lt(schemaModel[field], w.value)];
        }
        if (w.operator === "lte") {
          return [drizzleOrm.lte(schemaModel[field], w.value)];
        }
        if (w.operator === "ne") {
          return [drizzleOrm.ne(schemaModel[field], w.value)];
        }
        if (w.operator === "gt") {
          return [drizzleOrm.gt(schemaModel[field], w.value)];
        }
        if (w.operator === "gte") {
          return [drizzleOrm.gte(schemaModel[field], w.value)];
        }
        return [drizzleOrm.eq(schemaModel[field], w.value)];
      }
      const andGroup = where.filter(
        (w) => w.connector === "AND" || !w.connector
      );
      const orGroup = where.filter((w) => w.connector === "OR");
      const andClause = drizzleOrm.and(
        ...andGroup.map((w) => {
          const field = getFieldName({ model, field: w.field });
          if (w.operator === "in") {
            if (!Array.isArray(w.value)) {
              throw new index$1.BetterAuthError(
                `The value for the field "${w.field}" must be an array when using the "in" operator.`
              );
            }
            return drizzleOrm.inArray(schemaModel[field], w.value);
          }
          return drizzleOrm.eq(schemaModel[field], w.value);
        })
      );
      const orClause = drizzleOrm.or(
        ...orGroup.map((w) => {
          const field = getFieldName({ model, field: w.field });
          return drizzleOrm.eq(schemaModel[field], w.value);
        })
      );
      const clause = [];
      if (andGroup.length) clause.push(andClause);
      if (orGroup.length) clause.push(orClause);
      return clause;
    }
    function checkMissingFields(schema, model, values) {
      if (!schema) {
        throw new index$1.BetterAuthError(
          "Drizzle adapter failed to initialize. Schema not found. Please provide a schema object in the adapter options object."
        );
      }
      for (const key in values) {
        if (!schema[key]) {
          throw new index$1.BetterAuthError(
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
        const sortFn = sortBy?.direction === "desc" ? drizzleOrm.desc : drizzleOrm.asc;
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
        const res = await db.select({ count: drizzleOrm.count() }).from(schemaModel).where(...clause);
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

exports.drizzleAdapter = drizzleAdapter;
