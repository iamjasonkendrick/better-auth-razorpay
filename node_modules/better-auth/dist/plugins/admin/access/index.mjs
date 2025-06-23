import { createAccessControl } from '../../access/index.mjs';
import '../../../shared/better-auth.DdzSJf-n.mjs';

const defaultStatements = {
  user: [
    "create",
    "list",
    "set-role",
    "ban",
    "impersonate",
    "delete",
    "set-password"
  ],
  session: ["list", "revoke", "delete"]
};
const defaultAc = createAccessControl(defaultStatements);
const adminAc = defaultAc.newRole({
  user: [
    "create",
    "list",
    "set-role",
    "ban",
    "impersonate",
    "delete",
    "set-password"
  ],
  session: ["list", "revoke", "delete"]
});
const userAc = defaultAc.newRole({
  user: [],
  session: []
});
const defaultRoles = {
  admin: adminAc,
  user: userAc
};

export { adminAc, defaultAc, defaultRoles, defaultStatements, userAc };
