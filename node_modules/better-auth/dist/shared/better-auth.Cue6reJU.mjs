import { Kysely, SqliteDialect, MysqlDialect, PostgresDialect, MssqlDialect } from 'kysely';
import { c as createAdapter } from './better-auth.WByh1Fkk.mjs';

function getDatabaseType(db) {
  if (!db) {
    return null;
  }
  if ("dialect" in db) {
    return getDatabaseType(db.dialect);
  }
  if ("createDriver" in db) {
    if (db instanceof SqliteDialect) {
      return "sqlite";
    }
    if (db instanceof MysqlDialect) {
      return "mysql";
    }
    if (db instanceof PostgresDialect) {
      return "postgres";
    }
    if (db instanceof MssqlDialect) {
      return "mssql";
    }
  }
  if ("aggregate" in db) {
    return "sqlite";
  }
  if ("getConnection" in db) {
    return "mysql";
  }
  if ("connect" in db) {
    return "postgres";
  }
  if ("fileControl" in db) {
    return "sqlite";
  }
  return null;
}
const createKyselyAdapter = async (config) => {
  const db = config.database;
  if (!db) {
    return {
      kysely: null,
      databaseType: null
    };
  }
  if ("db" in db) {
    return {
      kysely: db.db,
      databaseType: db.type
    };
  }
  if ("dialect" in db) {
    return {
      kysely: new Kysely({ dialect: db.dialect }),
      databaseType: db.type
    };
  }
  let dialect = void 0;
  const databaseType = getDatabaseType(db);
  if ("createDriver" in db) {
    dialect = db;
  }
  if ("aggregate" in db) {
    dialect = new SqliteDialect({
      database: db
    });
  }
  if ("getConnection" in db) {
    dialect = new MysqlDialect(db);
  }
  if ("connect" in db) {
    dialect = new PostgresDialect({
      pool: db
    });
  }
  if ("fileControl" in db) {
    const { BunSqliteDialect } = await import('../chunks/bun-sqlite-dialect.mjs');
    dialect = new BunSqliteDialect({
      database: db
    });
  }
  return {
    kysely: dialect ? new Kysely({ dialect }) : null,
    databaseType
  };
};

const kyselyAdapter = (db, config) => createAdapter({
  config: {
    adapterId: "kysely",
    adapterName: "Kysely Adapter",
    usePlural: config?.usePlural,
    debugLogs: config?.debugLogs,
    supportsBooleans: config?.type === "sqlite" || config?.type === "mssql" || !config?.type ? false : true,
    supportsDates: config?.type === "sqlite" || config?.type === "mssql" || !config?.type ? false : true,
    supportsJSON: false
  },
  adapter: ({ getFieldName, schema }) => {
    const withReturning = async (values, builder, model, where) => {
      let res;
      if (config?.type === "mysql") {
        await builder.execute();
        const field = values.id ? "id" : where.length > 0 && where[0].field ? where[0].field : "id";
        if (!values.id && where.length === 0) {
          res = await db.selectFrom(model).selectAll().orderBy(getFieldName({ model, field }), "desc").limit(1).executeTakeFirst();
          return res;
        }
        const value = values[field] || where[0].value;
        res = await db.selectFrom(model).selectAll().orderBy(getFieldName({ model, field }), "desc").where(getFieldName({ model, field }), "=", value).limit(1).executeTakeFirst();
        return res;
      }
      if (config?.type === "mssql") {
        res = await builder.outputAll("inserted").executeTakeFirst();
        return res;
      }
      res = await builder.returningAll().executeTakeFirst();
      return res;
    };
    function transformValueToDB(value, model, field) {
      if (field === "id") {
        return value;
      }
      const { type = "sqlite" } = config || {};
      let f = schema[model]?.fields[field];
      if (!f) {
        f = Object.values(schema).find((f2) => f2.modelName === model);
      }
      if (f.type === "boolean" && (type === "sqlite" || type === "mssql") && value !== null && value !== void 0) {
        return value ? 1 : 0;
      }
      if (f.type === "date" && value && value instanceof Date) {
        return type === "sqlite" ? value.toISOString() : value;
      }
      return value;
    }
    function convertWhereClause(model, w) {
      if (!w)
        return {
          and: null,
          or: null
        };
      const conditions = {
        and: [],
        or: []
      };
      w.forEach((condition) => {
        let {
          field: _field,
          value,
          operator = "=",
          connector = "AND"
        } = condition;
        const field = getFieldName({ model, field: _field });
        value = transformValueToDB(value, model, _field);
        const expr = (eb) => {
          if (operator.toLowerCase() === "in") {
            return eb(field, "in", Array.isArray(value) ? value : [value]);
          }
          if (operator === "contains") {
            return eb(field, "like", `%${value}%`);
          }
          if (operator === "starts_with") {
            return eb(field, "like", `${value}%`);
          }
          if (operator === "ends_with") {
            return eb(field, "like", `%${value}`);
          }
          if (operator === "eq") {
            return eb(field, "=", value);
          }
          if (operator === "ne") {
            return eb(field, "<>", value);
          }
          if (operator === "gt") {
            return eb(field, ">", value);
          }
          if (operator === "gte") {
            return eb(field, ">=", value);
          }
          if (operator === "lt") {
            return eb(field, "<", value);
          }
          if (operator === "lte") {
            return eb(field, "<=", value);
          }
          return eb(field, operator, value);
        };
        if (connector === "OR") {
          conditions.or.push(expr);
        } else {
          conditions.and.push(expr);
        }
      });
      return {
        and: conditions.and.length ? conditions.and : null,
        or: conditions.or.length ? conditions.or : null
      };
    }
    return {
      async create({ data, model }) {
        const builder = db.insertInto(model).values(data);
        return await withReturning(data, builder, model, []);
      },
      async findOne({ model, where, select }) {
        const { and, or } = convertWhereClause(model, where);
        let query = db.selectFrom(model).selectAll();
        if (and) {
          query = query.where((eb) => eb.and(and.map((expr) => expr(eb))));
        }
        if (or) {
          query = query.where((eb) => eb.or(or.map((expr) => expr(eb))));
        }
        const res = await query.executeTakeFirst();
        if (!res) return null;
        return res;
      },
      async findMany({ model, where, limit, offset, sortBy }) {
        const { and, or } = convertWhereClause(model, where);
        let query = db.selectFrom(model);
        if (and) {
          query = query.where((eb) => eb.and(and.map((expr) => expr(eb))));
        }
        if (or) {
          query = query.where((eb) => eb.or(or.map((expr) => expr(eb))));
        }
        if (config?.type === "mssql") {
          if (!offset) {
            query = query.top(limit || 100);
          }
        } else {
          query = query.limit(limit || 100);
        }
        if (sortBy) {
          query = query.orderBy(
            getFieldName({ model, field: sortBy.field }),
            sortBy.direction
          );
        }
        if (offset) {
          if (config?.type === "mssql") {
            if (!sortBy) {
              query = query.orderBy(getFieldName({ model, field: "id" }));
            }
            query = query.offset(offset).fetch(limit || 100);
          } else {
            query = query.offset(offset);
          }
        }
        const res = await query.selectAll().execute();
        if (!res) return [];
        return res;
      },
      async update({ model, where, update: values }) {
        const { and, or } = convertWhereClause(model, where);
        let query = db.updateTable(model).set(values);
        if (and) {
          query = query.where((eb) => eb.and(and.map((expr) => expr(eb))));
        }
        if (or) {
          query = query.where((eb) => eb.or(or.map((expr) => expr(eb))));
        }
        return await withReturning(values, query, model, where);
      },
      async updateMany({ model, where, update: values }) {
        const { and, or } = convertWhereClause(model, where);
        let query = db.updateTable(model).set(values);
        if (and) {
          query = query.where((eb) => eb.and(and.map((expr) => expr(eb))));
        }
        if (or) {
          query = query.where((eb) => eb.or(or.map((expr) => expr(eb))));
        }
        const res = await query.execute();
        return res.length;
      },
      async count({ model, where }) {
        const { and, or } = convertWhereClause(model, where);
        let query = db.selectFrom(model).select(db.fn.count("id").as("count"));
        if (and) {
          query = query.where((eb) => eb.and(and.map((expr) => expr(eb))));
        }
        if (or) {
          query = query.where((eb) => eb.or(or.map((expr) => expr(eb))));
        }
        const res = await query.execute();
        return res[0].count;
      },
      async delete({ model, where }) {
        const { and, or } = convertWhereClause(model, where);
        let query = db.deleteFrom(model);
        if (and) {
          query = query.where((eb) => eb.and(and.map((expr) => expr(eb))));
        }
        if (or) {
          query = query.where((eb) => eb.or(or.map((expr) => expr(eb))));
        }
        await query.execute();
      },
      async deleteMany({ model, where }) {
        const { and, or } = convertWhereClause(model, where);
        let query = db.deleteFrom(model);
        if (and) {
          query = query.where((eb) => eb.and(and.map((expr) => expr(eb))));
        }
        if (or) {
          query = query.where((eb) => eb.or(or.map((expr) => expr(eb))));
        }
        return (await query.execute()).length;
      },
      options: config
    };
  }
});

export { createKyselyAdapter as c, kyselyAdapter as k };
