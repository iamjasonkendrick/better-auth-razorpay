import { defaultRoles } from '../plugins/organization/access/index.mjs';

const hasPermission = (input) => {
  if (!input.permissions && !input.permission) {
    return false;
  }
  const roles = input.role.split(",");
  const acRoles = input.options.roles || defaultRoles;
  for (const role of roles) {
    const _role = acRoles[role];
    const result = _role?.authorize(input.permissions ?? input.permission);
    if (result?.success) {
      return true;
    }
  }
  return false;
};

export { hasPermission as h };
