'use strict';

const plugins_access_index = require('../../access/index.cjs');
require('../../../shared/better-auth.ANpbi45u.cjs');

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
const defaultAc = plugins_access_index.createAccessControl(defaultStatements);
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

exports.adminAc = adminAc;
exports.defaultAc = defaultAc;
exports.defaultRoles = defaultRoles;
exports.defaultStatements = defaultStatements;
exports.userAc = userAc;
