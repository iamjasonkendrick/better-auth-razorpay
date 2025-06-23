'use strict';

const plugins_admin_access_index = require('../plugins/admin/access/index.cjs');

const hasPermission = (input) => {
  if (input.userId && input.options?.adminUserIds?.includes(input.userId)) {
    return true;
  }
  if (!input.permissions && !input.permission) {
    return false;
  }
  const roles = (input.role || input.options?.defaultRole || "user").split(",");
  const acRoles = input.options?.roles || plugins_admin_access_index.defaultRoles;
  for (const role of roles) {
    const _role = acRoles[role];
    const result = _role?.authorize(input.permission ?? input.permissions);
    if (result?.success) {
      return true;
    }
  }
  return false;
};

exports.hasPermission = hasPermission;
