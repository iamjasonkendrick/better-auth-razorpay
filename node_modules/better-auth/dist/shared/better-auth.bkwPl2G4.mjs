import { defaultRoles } from '../plugins/admin/access/index.mjs';

const hasPermission = (input) => {
  if (input.userId && input.options?.adminUserIds?.includes(input.userId)) {
    return true;
  }
  if (!input.permissions && !input.permission) {
    return false;
  }
  const roles = (input.role || input.options?.defaultRole || "user").split(",");
  const acRoles = input.options?.roles || defaultRoles;
  for (const role of roles) {
    const _role = acRoles[role];
    const result = _role?.authorize(input.permission ?? input.permissions);
    if (result?.success) {
      return true;
    }
  }
  return false;
};

export { hasPermission as h };
