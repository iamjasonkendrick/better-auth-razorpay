import { s as safeJSONParse } from './better-auth.tB5eU6EY.mjs';
import { w as withApplyDefault } from './better-auth.DGdvqtd1.mjs';
import { g as getAuthTables } from './better-auth.DORkW_Ge.mjs';
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
import { l as logger } from './better-auth.Cqykj82J.mjs';

let debugLogs = [];
let transactionId = -1;
const colors = {
  reset: "\x1B[0m",
  bright: "\x1B[1m",
  dim: "\x1B[2m",
  fg: {
    yellow: "\x1B[33m",
    magenta: "\x1B[35m"},
  bg: {
    black: "\x1B[40m"}
};
const createAdapter = ({
  adapter,
  config: cfg
}) => (options) => {
  const config = {
    ...cfg,
    supportsBooleans: cfg.supportsBooleans ?? true,
    supportsDates: cfg.supportsDates ?? true,
    supportsJSON: cfg.supportsJSON ?? false,
    adapterName: cfg.adapterName ?? cfg.adapterId,
    supportsNumericIds: cfg.supportsNumericIds ?? true
  };
  if (options.advanced?.database?.useNumberId === true && config.supportsNumericIds === false) {
    throw new Error(
      `[${config.adapterName}] Your database or database adapter does not support numeric ids. Please disable "useNumberId" in your config.`
    );
  }
  const schema = getAuthTables(options);
  const getDefaultFieldName = ({
    field,
    model: unsafe_model
  }) => {
    if (field === "id") {
      return field;
    }
    const model = getDefaultModelName(unsafe_model);
    let f = schema[model]?.fields[field];
    if (!f) {
      f = Object.values(schema[model]?.fields).find(
        (f2) => f2.fieldName === field
      );
    }
    if (!f) {
      debugLog(`Field ${field} not found in model ${model}`);
      debugLog(`Schema:`, schema);
      throw new Error(`Field ${field} not found in model ${model}`);
    }
    return field;
  };
  const getDefaultModelName = (model) => {
    if (config.usePlural && model.charAt(model.length - 1) === "s") {
      let pluralessModel = model.slice(0, -1);
      let m2 = schema[pluralessModel] ? pluralessModel : void 0;
      if (!m2) {
        m2 = Object.entries(schema).find(
          ([_, f]) => f.modelName === pluralessModel
        )?.[0];
      }
      if (m2) {
        return m2;
      }
    }
    let m = schema[model] ? model : void 0;
    if (!m) {
      m = Object.entries(schema).find(([_, f]) => f.modelName === model)?.[0];
    }
    if (!m) {
      debugLog(`Model "${model}" not found in schema`);
      debugLog(`Schema:`, schema);
      throw new Error(`Model "${model}" not found in schema`);
    }
    return m;
  };
  const getModelName = (model) => {
    return schema[getDefaultModelName(model)].modelName !== model ? schema[getDefaultModelName(model)].modelName : config.usePlural ? `${model}s` : model;
  };
  function getFieldName({
    model: model_name,
    field: field_name
  }) {
    const model = getDefaultModelName(model_name);
    const field = getDefaultFieldName({ model, field: field_name });
    return schema[model]?.fields[field]?.fieldName || field;
  }
  const debugLog = (...args) => {
    if (config.debugLogs === true || typeof config.debugLogs === "object") {
      if (typeof config.debugLogs === "object" && "isRunningAdapterTests" in config.debugLogs) {
        if (config.debugLogs.isRunningAdapterTests) {
          args.shift();
          debugLogs.push(args);
        }
        return;
      }
      if (typeof config.debugLogs === "object" && config.debugLogs.logCondition && !config.debugLogs.logCondition?.()) {
        return;
      }
      if (typeof args[0] === "object" && "method" in args[0]) {
        const method = args.shift().method;
        if (typeof config.debugLogs === "object") {
          if (method === "create" && !config.debugLogs.create) {
            return;
          } else if (method === "update" && !config.debugLogs.update) {
            return;
          } else if (method === "updateMany" && !config.debugLogs.updateMany) {
            return;
          } else if (method === "findOne" && !config.debugLogs.findOne) {
            return;
          } else if (method === "findMany" && !config.debugLogs.findMany) {
            return;
          } else if (method === "delete" && !config.debugLogs.delete) {
            return;
          } else if (method === "deleteMany" && !config.debugLogs.deleteMany) {
            return;
          } else if (method === "count" && !config.debugLogs.count) {
            return;
          }
        }
        logger.info(`[${config.adapterName}]`, ...args);
      } else {
        logger.info(`[${config.adapterName}]`, ...args);
      }
    }
  };
  const idField = ({
    customModelName,
    forceAllowId
  }) => {
    const shouldGenerateId = !config.disableIdGeneration && !options.advanced?.database?.useNumberId && !forceAllowId;
    const model = getDefaultModelName(customModelName ?? "id");
    return {
      type: options.advanced?.database?.useNumberId ? "number" : "string",
      required: shouldGenerateId ? true : false,
      ...shouldGenerateId ? {
        defaultValue() {
          if (config.disableIdGeneration) return void 0;
          const useNumberId = options.advanced?.database?.useNumberId;
          let generateId$1 = options.advanced?.database?.generateId;
          if (options.advanced?.generateId !== void 0) {
            logger.warn(
              "Your Better Auth config includes advanced.generateId which is deprecated. Please use advanced.database.generateId instead. This will be removed in future releases."
            );
            generateId$1 = options.advanced?.generateId;
          }
          if (generateId$1 === false || useNumberId) return void 0;
          if (generateId$1) {
            return generateId$1({
              model
            });
          }
          if (config.customIdGenerator) {
            return config.customIdGenerator({ model });
          }
          return generateId();
        }
      } : {}
    };
  };
  const getFieldAttributes = ({
    model,
    field
  }) => {
    const defaultModelName = getDefaultModelName(model);
    const defaultFieldName = getDefaultFieldName({
      field,
      model
    });
    const fields = schema[defaultModelName].fields;
    fields.id = idField({ customModelName: defaultModelName });
    return fields[defaultFieldName];
  };
  const adapterInstance = adapter({
    options,
    schema,
    debugLog,
    getFieldName,
    getModelName,
    getDefaultModelName,
    getDefaultFieldName,
    getFieldAttributes
  });
  const transformInput = async (data, unsafe_model, action, forceAllowId) => {
    const transformedData = {};
    const fields = schema[unsafe_model].fields;
    const newMappedKeys = config.mapKeysTransformInput ?? {};
    if (!config.disableIdGeneration && !options.advanced?.database?.useNumberId) {
      fields.id = idField({ customModelName: unsafe_model, forceAllowId });
    }
    for (const field in fields) {
      const value = data[field];
      const fieldAttributes = fields[field];
      let newFieldName = newMappedKeys[field] || fields[field].fieldName || field;
      if (value === void 0 && (!fieldAttributes.defaultValue && !fieldAttributes.transform?.input || action === "update")) {
        continue;
      }
      let newValue = withApplyDefault(value, fieldAttributes, action);
      if (fieldAttributes.transform?.input) {
        newValue = await fieldAttributes.transform.input(newValue);
      }
      if (fieldAttributes.references?.field === "id" && options.advanced?.database?.useNumberId) {
        if (Array.isArray(newValue)) {
          newValue = newValue.map(Number);
        } else {
          newValue = Number(newValue);
        }
      } else if (config.supportsJSON === false && typeof newValue === "object" && //@ts-expect-error -Future proofing
      fieldAttributes.type === "json") {
        newValue = JSON.stringify(newValue);
      } else if (config.supportsDates === false && newValue instanceof Date && fieldAttributes.type === "date") {
        newValue = newValue.toISOString();
      } else if (config.supportsBooleans === false && typeof newValue === "boolean") {
        newValue = newValue ? 1 : 0;
      }
      if (config.customTransformInput) {
        newValue = config.customTransformInput({
          data: newValue,
          action,
          field: newFieldName,
          fieldAttributes,
          model: unsafe_model,
          schema,
          options
        });
      }
      transformedData[newFieldName] = newValue;
    }
    return transformedData;
  };
  const transformOutput = async (data, unsafe_model, select = []) => {
    if (!data) return null;
    const newMappedKeys = config.mapKeysTransformOutput ?? {};
    const transformedData = {};
    const tableSchema = schema[unsafe_model].fields;
    const idKey = Object.entries(newMappedKeys).find(
      ([_, v]) => v === "id"
    )?.[0];
    tableSchema[idKey ?? "id"] = {
      type: options.advanced?.database?.useNumberId ? "number" : "string"
    };
    for (const key in tableSchema) {
      if (select.length && !select.includes(key)) {
        continue;
      }
      const field = tableSchema[key];
      if (field) {
        const originalKey = field.fieldName || key;
        let newValue = data[Object.entries(newMappedKeys).find(
          ([_, v]) => v === originalKey
        )?.[0] || originalKey];
        if (field.transform?.output) {
          newValue = await field.transform.output(newValue);
        }
        let newFieldName = newMappedKeys[key] || key;
        if (originalKey === "id" || field.references?.field === "id") {
          if (typeof newValue !== "undefined") newValue = String(newValue);
        } else if (config.supportsJSON === false && typeof newValue === "string" && //@ts-expect-error - Future proofing
        field.type === "json") {
          newValue = safeJSONParse(newValue);
        } else if (config.supportsDates === false && typeof newValue === "string" && field.type === "date") {
          newValue = new Date(newValue);
        } else if (config.supportsBooleans === false && typeof newValue === "number" && field.type === "boolean") {
          newValue = newValue === 1;
        }
        if (config.customTransformOutput) {
          newValue = config.customTransformOutput({
            data: newValue,
            field: newFieldName,
            fieldAttributes: field,
            select,
            model: unsafe_model,
            schema,
            options
          });
        }
        transformedData[newFieldName] = newValue;
      }
    }
    return transformedData;
  };
  const transformWhereClause = ({
    model,
    where
  }) => {
    if (!where) return void 0;
    return where.map((w) => {
      const {
        field: unsafe_field,
        value,
        operator = "eq",
        connector = "AND"
      } = w;
      if (operator === "in") {
        if (!Array.isArray(value)) {
          throw new Error("Value must be an array");
        }
      }
      const defaultModelName = getDefaultModelName(model);
      const defaultFieldName = getDefaultFieldName({
        field: unsafe_field,
        model
      });
      const fieldName = getFieldName({
        field: defaultFieldName,
        model: defaultModelName
      });
      const fieldAttr = getFieldAttributes({
        field: defaultFieldName,
        model: defaultModelName
      });
      if (defaultFieldName === "id" || fieldAttr.references?.field === "id") {
        if (options.advanced?.database?.useNumberId) {
          if (Array.isArray(value)) {
            return {
              operator,
              connector,
              field: fieldName,
              value: value.map(Number)
            };
          }
          return {
            operator,
            connector,
            field: fieldName,
            value: Number(value)
          };
        }
      }
      return {
        operator,
        connector,
        field: fieldName,
        value
      };
    });
  };
  return {
    create: async ({
      data: unsafeData,
      model: unsafeModel,
      select,
      forceAllowId = false
    }) => {
      transactionId++;
      let thisTransactionId = transactionId;
      const model = getModelName(unsafeModel);
      if ("id" in unsafeData && !forceAllowId) {
        logger.warn(
          `[${config.adapterName}] - You are trying to create a record with an id. This is not allowed as we handle id generation for you, unless you pass in the \`forceAllowId\` parameter. The id will be ignored.`
        );
        const err = new Error();
        const stack = err.stack?.split("\n").filter((_, i) => i !== 1).join("\n").replace("Error:", "Create method with `id` being called at:");
        console.log(stack);
        unsafeData.id = void 0;
      }
      debugLog(
        { method: "create" },
        `${formatTransactionId(thisTransactionId)} ${formatStep(1, 4)}`,
        `${formatMethod("create")} ${formatAction("Unsafe Input")}:`,
        { model, data: unsafeData }
      );
      const data = await transformInput(
        unsafeData,
        unsafeModel,
        "create",
        forceAllowId
      );
      debugLog(
        { method: "create" },
        `${formatTransactionId(thisTransactionId)} ${formatStep(2, 4)}`,
        `${formatMethod("create")} ${formatAction("Parsed Input")}:`,
        { model, data }
      );
      const res = await adapterInstance.create({ data, model });
      debugLog(
        { method: "create" },
        `${formatTransactionId(thisTransactionId)} ${formatStep(3, 4)}`,
        `${formatMethod("create")} ${formatAction("DB Result")}:`,
        { model, res }
      );
      const transformed = await transformOutput(res, unsafeModel, select);
      debugLog(
        { method: "create" },
        `${formatTransactionId(thisTransactionId)} ${formatStep(4, 4)}`,
        `${formatMethod("create")} ${formatAction("Parsed Result")}:`,
        { model, data: transformed }
      );
      return transformed;
    },
    update: async ({
      model: unsafeModel,
      where: unsafeWhere,
      update: unsafeData
    }) => {
      transactionId++;
      let thisTransactionId = transactionId;
      const model = getModelName(unsafeModel);
      const where = transformWhereClause({
        model: unsafeModel,
        where: unsafeWhere
      });
      debugLog(
        { method: "update" },
        `${formatTransactionId(thisTransactionId)} ${formatStep(1, 4)}`,
        `${formatMethod("update")} ${formatAction("Unsafe Input")}:`,
        { model, data: unsafeData }
      );
      const data = await transformInput(
        unsafeData,
        unsafeModel,
        "update"
      );
      debugLog(
        { method: "update" },
        `${formatTransactionId(thisTransactionId)} ${formatStep(2, 4)}`,
        `${formatMethod("update")} ${formatAction("Parsed Input")}:`,
        { model, data }
      );
      const res = await adapterInstance.update({
        model,
        where,
        update: data
      });
      debugLog(
        { method: "update" },
        `${formatTransactionId(thisTransactionId)} ${formatStep(3, 4)}`,
        `${formatMethod("update")} ${formatAction("DB Result")}:`,
        { model, data: res }
      );
      const transformed = await transformOutput(res, unsafeModel);
      debugLog(
        { method: "update" },
        `${formatTransactionId(thisTransactionId)} ${formatStep(4, 4)}`,
        `${formatMethod("update")} ${formatAction("Parsed Result")}:`,
        { model, data: transformed }
      );
      return transformed;
    },
    updateMany: async ({
      model: unsafeModel,
      where: unsafeWhere,
      update: unsafeData
    }) => {
      transactionId++;
      let thisTransactionId = transactionId;
      const model = getModelName(unsafeModel);
      const where = transformWhereClause({
        model: unsafeModel,
        where: unsafeWhere
      });
      debugLog(
        { method: "updateMany" },
        `${formatTransactionId(thisTransactionId)} ${formatStep(1, 4)}`,
        `${formatMethod("updateMany")} ${formatAction("Unsafe Input")}:`,
        { model, data: unsafeData }
      );
      const data = await transformInput(unsafeData, unsafeModel, "update");
      debugLog(
        { method: "updateMany" },
        `${formatTransactionId(thisTransactionId)} ${formatStep(2, 4)}`,
        `${formatMethod("updateMany")} ${formatAction("Parsed Input")}:`,
        { model, data }
      );
      const updatedCount = await adapterInstance.updateMany({
        model,
        where,
        update: data
      });
      debugLog(
        { method: "updateMany" },
        `${formatTransactionId(thisTransactionId)} ${formatStep(3, 4)}`,
        `${formatMethod("updateMany")} ${formatAction("DB Result")}:`,
        { model, data: updatedCount }
      );
      debugLog(
        { method: "updateMany" },
        `${formatTransactionId(thisTransactionId)} ${formatStep(4, 4)}`,
        `${formatMethod("updateMany")} ${formatAction("Parsed Result")}:`,
        { model, data: updatedCount }
      );
      return updatedCount;
    },
    findOne: async ({
      model: unsafeModel,
      where: unsafeWhere,
      select
    }) => {
      transactionId++;
      let thisTransactionId = transactionId;
      const model = getModelName(unsafeModel);
      const where = transformWhereClause({
        model: unsafeModel,
        where: unsafeWhere
      });
      debugLog(
        { method: "findOne" },
        `${formatTransactionId(thisTransactionId)} ${formatStep(1, 3)}`,
        `${formatMethod("findOne")}:`,
        { model, where, select }
      );
      const res = await adapterInstance.findOne({
        model,
        where,
        select
      });
      debugLog(
        { method: "findOne" },
        `${formatTransactionId(thisTransactionId)} ${formatStep(2, 3)}`,
        `${formatMethod("findOne")} ${formatAction("DB Result")}:`,
        { model, data: res }
      );
      const transformed = await transformOutput(
        res,
        unsafeModel,
        select
      );
      debugLog(
        { method: "findOne" },
        `${formatTransactionId(thisTransactionId)} ${formatStep(3, 3)}`,
        `${formatMethod("findOne")} ${formatAction("Parsed Result")}:`,
        { model, data: transformed }
      );
      return transformed;
    },
    findMany: async ({
      model: unsafeModel,
      where: unsafeWhere,
      limit: unsafeLimit,
      sortBy,
      offset
    }) => {
      transactionId++;
      let thisTransactionId = transactionId;
      const limit = unsafeLimit ?? options.advanced?.database?.defaultFindManyLimit ?? 100;
      const model = getModelName(unsafeModel);
      const where = transformWhereClause({
        model: unsafeModel,
        where: unsafeWhere
      });
      debugLog(
        { method: "findMany" },
        `${formatTransactionId(thisTransactionId)} ${formatStep(1, 3)}`,
        `${formatMethod("findMany")}:`,
        { model, where, limit, sortBy, offset }
      );
      const res = await adapterInstance.findMany({
        model,
        where,
        limit,
        sortBy,
        offset
      });
      debugLog(
        { method: "findMany" },
        `${formatTransactionId(thisTransactionId)} ${formatStep(2, 3)}`,
        `${formatMethod("findMany")} ${formatAction("DB Result")}:`,
        { model, data: res }
      );
      const transformed = await Promise.all(
        res.map(async (r) => await transformOutput(r, unsafeModel))
      );
      debugLog(
        { method: "findMany" },
        `${formatTransactionId(thisTransactionId)} ${formatStep(3, 3)}`,
        `${formatMethod("findMany")} ${formatAction("Parsed Result")}:`,
        { model, data: transformed }
      );
      return transformed;
    },
    delete: async ({
      model: unsafeModel,
      where: unsafeWhere
    }) => {
      transactionId++;
      let thisTransactionId = transactionId;
      const model = getModelName(unsafeModel);
      const where = transformWhereClause({
        model: unsafeModel,
        where: unsafeWhere
      });
      debugLog(
        { method: "delete" },
        `${formatTransactionId(thisTransactionId)} ${formatStep(1, 2)}`,
        `${formatMethod("delete")}:`,
        { model, where }
      );
      await adapterInstance.delete({
        model,
        where
      });
      debugLog(
        { method: "delete" },
        `${formatTransactionId(thisTransactionId)} ${formatStep(2, 2)}`,
        `${formatMethod("delete")} ${formatAction("DB Result")}:`,
        { model }
      );
    },
    deleteMany: async ({
      model: unsafeModel,
      where: unsafeWhere
    }) => {
      transactionId++;
      let thisTransactionId = transactionId;
      const model = getModelName(unsafeModel);
      const where = transformWhereClause({
        model: unsafeModel,
        where: unsafeWhere
      });
      debugLog(
        { method: "deleteMany" },
        `${formatTransactionId(thisTransactionId)} ${formatStep(1, 2)}`,
        `${formatMethod("deleteMany")} ${formatAction("DeleteMany")}:`,
        { model, where }
      );
      const res = await adapterInstance.deleteMany({
        model,
        where
      });
      debugLog(
        { method: "deleteMany" },
        `${formatTransactionId(thisTransactionId)} ${formatStep(2, 2)}`,
        `${formatMethod("deleteMany")} ${formatAction("DB Result")}:`,
        { model, data: res }
      );
      return res;
    },
    count: async ({
      model: unsafeModel,
      where: unsafeWhere
    }) => {
      transactionId++;
      let thisTransactionId = transactionId;
      const model = getModelName(unsafeModel);
      const where = transformWhereClause({
        model: unsafeModel,
        where: unsafeWhere
      });
      debugLog(
        { method: "count" },
        `${formatTransactionId(thisTransactionId)} ${formatStep(1, 2)}`,
        `${formatMethod("count")}:`,
        {
          model,
          where
        }
      );
      const res = await adapterInstance.count({
        model,
        where
      });
      debugLog(
        { method: "count" },
        `${formatTransactionId(thisTransactionId)} ${formatStep(2, 2)}`,
        `${formatMethod("count")}:`,
        {
          model,
          data: res
        }
      );
      return res;
    },
    createSchema: adapterInstance.createSchema ? async (_, file) => {
      const tables = getAuthTables(options);
      if (options.secondaryStorage && !options.session?.storeSessionInDatabase) {
        delete tables.session;
      }
      if (options.rateLimit && options.rateLimit.storage === "database" && // rate-limit will default to enabled in production,
      // and given storage is database, it will try to use the rate-limit table,
      // so we should make sure to generate rate-limit table schema
      (typeof options.rateLimit.enabled === "undefined" || // and of course if they forcefully set to true, then they want rate-limit,
      // thus we should also generate rate-limit table schema
      options.rateLimit.enabled === true)) {
        tables.ratelimit = {
          modelName: options.rateLimit.modelName ?? "ratelimit",
          fields: {
            key: {
              type: "string",
              unique: true,
              required: true,
              fieldName: options.rateLimit.fields?.key ?? "key"
            },
            count: {
              type: "number",
              required: true,
              fieldName: options.rateLimit.fields?.count ?? "count"
            },
            lastRequest: {
              type: "number",
              required: true,
              bigint: true,
              defaultValue: () => Date.now(),
              fieldName: options.rateLimit.fields?.lastRequest ?? "lastRequest"
            }
          }
        };
      }
      return adapterInstance.createSchema({ file, tables });
    } : void 0,
    options: {
      adapterConfig: config,
      ...adapterInstance.options ?? {}
    },
    id: config.adapterId,
    // Secretly export values ONLY if this adapter has enabled adapter-test-debug-logs.
    // This would then be used during our adapter-tests to help print debug logs if a test fails.
    //@ts-expect-error - ^^
    ...config.debugLogs?.isRunningAdapterTests ? {
      adapterTestDebugLogs: {
        resetDebugLogs() {
          debugLogs = [];
        },
        printDebugLogs() {
          const separator = `\u2500`.repeat(80);
          let log = debugLogs.reverse().map((log2) => {
            log2[0] = `
${log2[0]}`;
            return [...log2, "\n"];
          }).reduce(
            (prev, curr) => {
              return [...curr, ...prev];
            },
            [`
${separator}`]
          );
          console.log(...log);
        }
      }
    } : {}
  };
};
function formatTransactionId(transactionId2) {
  return `${colors.fg.magenta}#${transactionId2}${colors.reset}`;
}
function formatStep(step, total) {
  return `${colors.bg.black}${colors.fg.yellow}[${step}/${total}]${colors.reset}`;
}
function formatMethod(method) {
  return `${colors.bright}${method}${colors.reset}`;
}
function formatAction(action) {
  return `${colors.dim}(${action})${colors.reset}`;
}

export { createAdapter as c };
