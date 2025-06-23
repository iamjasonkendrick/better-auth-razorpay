'use strict';

const plugins_access_index = require('../../access/index.cjs');
require('../../../shared/better-auth.ANpbi45u.cjs');

const defaultStatements = {
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  team: ["create", "update", "delete"]
};
const defaultAc = plugins_access_index.createAccessControl(defaultStatements);
const adminAc = defaultAc.newRole({
  organization: ["update"],
  invitation: ["create", "cancel"],
  member: ["create", "update", "delete"],
  team: ["create", "update", "delete"]
});
const ownerAc = defaultAc.newRole({
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  team: ["create", "update", "delete"]
});
const memberAc = defaultAc.newRole({
  organization: [],
  member: [],
  invitation: [],
  team: []
});
const defaultRoles = {
  admin: adminAc,
  owner: ownerAc,
  member: memberAc
};

exports.adminAc = adminAc;
exports.defaultAc = defaultAc;
exports.defaultRoles = defaultRoles;
exports.defaultStatements = defaultStatements;
exports.memberAc = memberAc;
exports.ownerAc = ownerAc;
