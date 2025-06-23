'use strict';

const plugins_organization_access_index = require('../plugins/organization/access/index.cjs');

const hasPermission = (input) => {
  if (!input.permissions && !input.permission) {
    return false;
  }
  const roles = input.role.split(",");
  const acRoles = input.options.roles || plugins_organization_access_index.defaultRoles;
  for (const role of roles) {
    const _role = acRoles[role];
    const result = _role?.authorize(input.permissions ?? input.permission);
    if (result?.success) {
      return true;
    }
  }
  return false;
};

exports.hasPermission = hasPermission;
