import { createAccessControl } from '../../access/index.mjs';
import '../../../shared/better-auth.DdzSJf-n.mjs';

const defaultStatements = {
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  team: ["create", "update", "delete"]
};
const defaultAc = createAccessControl(defaultStatements);
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

export { adminAc, defaultAc, defaultRoles, defaultStatements, memberAc, ownerAc };
