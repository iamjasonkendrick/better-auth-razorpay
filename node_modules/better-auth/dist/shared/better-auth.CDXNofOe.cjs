'use strict';

const betterCall = require('better-call');

async function validatePassword(ctx, data) {
  const accounts = await ctx.context.internalAdapter.findAccounts(data.userId);
  const credentialAccount = accounts?.find(
    (account) => account.providerId === "credential"
  );
  const currentPassword = credentialAccount?.password;
  if (!credentialAccount || !currentPassword) {
    return false;
  }
  const compare = await ctx.context.password.verify({
    hash: currentPassword,
    password: data.password
  });
  return compare;
}
async function checkPassword(userId, c) {
  const accounts = await c.context.internalAdapter.findAccounts(userId);
  const credentialAccount = accounts?.find(
    (account) => account.providerId === "credential"
  );
  const currentPassword = credentialAccount?.password;
  if (!credentialAccount || !currentPassword || !c.body.password) {
    throw new betterCall.APIError("BAD_REQUEST", {
      message: "No password credential found"
    });
  }
  const compare = await c.context.password.verify({
    hash: currentPassword,
    password: c.body.password
  });
  if (!compare) {
    throw new betterCall.APIError("BAD_REQUEST", {
      message: "Invalid password"
    });
  }
  return true;
}

exports.checkPassword = checkPassword;
exports.validatePassword = validatePassword;
