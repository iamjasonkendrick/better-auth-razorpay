'use strict';

function withApplyDefault(value, field, action) {
  if (action === "update") {
    return value;
  }
  if (value === void 0 || value === null) {
    if (field.defaultValue !== void 0) {
      if (typeof field.defaultValue === "function") {
        return field.defaultValue();
      }
      return field.defaultValue;
    }
  }
  return value;
}

exports.withApplyDefault = withApplyDefault;
