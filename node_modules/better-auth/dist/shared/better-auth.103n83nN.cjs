'use strict';

const zod = require('zod');
const betterCall = require('better-call');
const account = require('./better-auth.CM7smaHY.cjs');
const cookies_index = require('../cookies/index.cjs');
const schema$1 = require('./better-auth.DcWKCjjf.cjs');
require('./better-auth.DiSjtgs9.cjs');
require('./better-auth.GpOOav9x.cjs');
require('defu');
const date = require('./better-auth.C1hdVENX.cjs');
const pluginHelper = require('./better-auth.DNqtHmvg.cjs');
const hasPermission = require('./better-auth.BW8BpneG.cjs');

const ADMIN_ERROR_CODES = {
  FAILED_TO_CREATE_USER: "Failed to create user",
  USER_ALREADY_EXISTS: "User already exists",
  YOU_CANNOT_BAN_YOURSELF: "You cannot ban yourself",
  YOU_ARE_NOT_ALLOWED_TO_CHANGE_USERS_ROLE: "You are not allowed to change users role",
  YOU_ARE_NOT_ALLOWED_TO_CREATE_USERS: "You are not allowed to create users",
  YOU_ARE_NOT_ALLOWED_TO_LIST_USERS: "You are not allowed to list users",
  YOU_ARE_NOT_ALLOWED_TO_LIST_USERS_SESSIONS: "You are not allowed to list users sessions",
  YOU_ARE_NOT_ALLOWED_TO_BAN_USERS: "You are not allowed to ban users",
  YOU_ARE_NOT_ALLOWED_TO_IMPERSONATE_USERS: "You are not allowed to impersonate users",
  YOU_ARE_NOT_ALLOWED_TO_REVOKE_USERS_SESSIONS: "You are not allowed to revoke users sessions",
  YOU_ARE_NOT_ALLOWED_TO_DELETE_USERS: "You are not allowed to delete users",
  YOU_ARE_NOT_ALLOWED_TO_SET_USERS_PASSWORD: "You are not allowed to set users password",
  BANNED_USER: "You have been banned from this application"
};

function parseRoles(roles) {
  return Array.isArray(roles) ? roles.join(",") : roles;
}
const admin = (options) => {
  const opts = {
    defaultRole: options?.defaultRole ?? "user",
    adminRoles: options?.adminRoles ?? ["admin"],
    bannedUserMessage: options?.bannedUserMessage ?? "You have been banned from this application. Please contact support if you believe this is an error.",
    ...options
  };
  const adminMiddleware = account.createAuthMiddleware(async (ctx) => {
    const session = await account.getSessionFromCtx(ctx);
    if (!session) {
      throw new betterCall.APIError("UNAUTHORIZED");
    }
    return {
      session
    };
  });
  return {
    id: "admin",
    init() {
      return {
        options: {
          databaseHooks: {
            user: {
              create: {
                async before(user) {
                  return {
                    data: {
                      role: options?.defaultRole ?? "user",
                      ...user
                    }
                  };
                }
              }
            },
            session: {
              create: {
                async before(session, ctx) {
                  if (!ctx) {
                    return;
                  }
                  const user = await ctx.context.internalAdapter.findUserById(
                    session.userId
                  );
                  if (user.banned) {
                    if (user.banExpires && user.banExpires.getTime() < Date.now()) {
                      await ctx.context.internalAdapter.updateUser(
                        session.userId,
                        {
                          banned: false,
                          banReason: null,
                          banExpires: null
                        }
                      );
                      return;
                    }
                    if (ctx && (ctx.path.startsWith("/callback") || ctx.path.startsWith("/oauth2/callback"))) {
                      const redirectURI = ctx.context.options.onAPIError?.errorURL || `${ctx.context.baseURL}/error`;
                      throw ctx.redirect(
                        `${redirectURI}?error=banned&error_description=${opts.bannedUserMessage}`
                      );
                    }
                    throw new betterCall.APIError("FORBIDDEN", {
                      message: opts.bannedUserMessage,
                      code: "BANNED_USER"
                    });
                  }
                }
              }
            }
          }
        }
      };
    },
    hooks: {
      after: [
        {
          matcher(context) {
            return context.path === "/list-sessions";
          },
          handler: account.createAuthMiddleware(async (ctx) => {
            const response = await pluginHelper.getEndpointResponse(ctx);
            if (!response) {
              return;
            }
            const newJson = response.filter((session) => {
              return !session.impersonatedBy;
            });
            return ctx.json(newJson);
          })
        }
      ]
    },
    endpoints: {
      setRole: account.createAuthEndpoint(
        "/admin/set-role",
        {
          method: "POST",
          body: zod.z.object({
            userId: zod.z.coerce.string({
              description: "The user id"
            }),
            role: zod.z.union([
              zod.z.string({
                description: "The role to set. `admin` or `user` by default"
              }),
              zod.z.array(
                zod.z.string({
                  description: "The roles to set. `admin` or `user` by default"
                })
              )
            ])
          }),
          use: [adminMiddleware],
          metadata: {
            openapi: {
              operationId: "setRole",
              summary: "Set the role of a user",
              description: "Set the role of a user",
              responses: {
                200: {
                  description: "User role updated",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          user: {
                            $ref: "#/components/schemas/User"
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            $Infer: {
              body: {}
            }
          }
        },
        async (ctx) => {
          const canSetRole = hasPermission.hasPermission({
            userId: ctx.context.session.user.id,
            role: ctx.context.session.user.role,
            options: opts,
            permissions: {
              user: ["set-role"]
            }
          });
          if (!canSetRole) {
            throw new betterCall.APIError("FORBIDDEN", {
              message: ADMIN_ERROR_CODES.YOU_ARE_NOT_ALLOWED_TO_CHANGE_USERS_ROLE
            });
          }
          const updatedUser = await ctx.context.internalAdapter.updateUser(
            ctx.body.userId,
            {
              role: parseRoles(ctx.body.role)
            },
            ctx
          );
          return ctx.json({
            user: updatedUser
          });
        }
      ),
      createUser: account.createAuthEndpoint(
        "/admin/create-user",
        {
          method: "POST",
          body: zod.z.object({
            email: zod.z.string({
              description: "The email of the user"
            }),
            password: zod.z.string({
              description: "The password of the user"
            }),
            name: zod.z.string({
              description: "The name of the user"
            }),
            role: zod.z.union([
              zod.z.string({
                description: "The role of the user"
              }),
              zod.z.array(
                zod.z.string({
                  description: "The roles of user"
                })
              )
            ]).optional(),
            /**
             * extra fields for user
             */
            data: zod.z.optional(
              zod.z.record(zod.z.any(), {
                description: "Extra fields for the user. Including custom additional fields."
              })
            )
          }),
          metadata: {
            openapi: {
              operationId: "createUser",
              summary: "Create a new user",
              description: "Create a new user",
              responses: {
                200: {
                  description: "User created",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          user: {
                            $ref: "#/components/schemas/User"
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            $Infer: {
              body: {}
            }
          }
        },
        async (ctx) => {
          const session = await account.getSessionFromCtx(ctx);
          if (!session && (ctx.request || ctx.headers)) {
            throw ctx.error("UNAUTHORIZED");
          }
          if (session) {
            const canCreateUser = hasPermission.hasPermission({
              userId: session.user.id,
              role: session.user.role,
              options: opts,
              permissions: {
                user: ["create"]
              }
            });
            if (!canCreateUser) {
              throw new betterCall.APIError("FORBIDDEN", {
                message: ADMIN_ERROR_CODES.YOU_ARE_NOT_ALLOWED_TO_CREATE_USERS
              });
            }
          }
          const existUser = await ctx.context.internalAdapter.findUserByEmail(
            ctx.body.email
          );
          if (existUser) {
            throw new betterCall.APIError("BAD_REQUEST", {
              message: ADMIN_ERROR_CODES.USER_ALREADY_EXISTS
            });
          }
          const user = await ctx.context.internalAdapter.createUser({
            email: ctx.body.email,
            name: ctx.body.name,
            role: (ctx.body.role && parseRoles(ctx.body.role)) ?? options?.defaultRole ?? "user",
            ...ctx.body.data
          });
          if (!user) {
            throw new betterCall.APIError("INTERNAL_SERVER_ERROR", {
              message: ADMIN_ERROR_CODES.FAILED_TO_CREATE_USER
            });
          }
          const hashedPassword = await ctx.context.password.hash(
            ctx.body.password
          );
          await ctx.context.internalAdapter.linkAccount(
            {
              accountId: user.id,
              providerId: "credential",
              password: hashedPassword,
              userId: user.id
            },
            ctx
          );
          return ctx.json({
            user
          });
        }
      ),
      listUsers: account.createAuthEndpoint(
        "/admin/list-users",
        {
          method: "GET",
          use: [adminMiddleware],
          query: zod.z.object({
            searchValue: zod.z.string({
              description: "The value to search for"
            }).optional(),
            searchField: zod.z.enum(["email", "name"], {
              description: "The field to search in, defaults to email. Can be `email` or `name`"
            }).optional(),
            searchOperator: zod.z.enum(["contains", "starts_with", "ends_with"], {
              description: "The operator to use for the search. Can be `contains`, `starts_with` or `ends_with`"
            }).optional(),
            limit: zod.z.string({
              description: "The number of users to return"
            }).or(zod.z.number()).optional(),
            offset: zod.z.string({
              description: "The offset to start from"
            }).or(zod.z.number()).optional(),
            sortBy: zod.z.string({
              description: "The field to sort by"
            }).optional(),
            sortDirection: zod.z.enum(["asc", "desc"], {
              description: "The direction to sort by"
            }).optional(),
            filterField: zod.z.string({
              description: "The field to filter by"
            }).optional(),
            filterValue: zod.z.string({
              description: "The value to filter by"
            }).or(zod.z.number()).or(zod.z.boolean()).optional(),
            filterOperator: zod.z.enum(["eq", "ne", "lt", "lte", "gt", "gte", "contains"], {
              description: "The operator to use for the filter"
            }).optional()
          }),
          metadata: {
            openapi: {
              operationId: "listUsers",
              summary: "List users",
              description: "List users",
              responses: {
                200: {
                  description: "List of users",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          users: {
                            type: "array",
                            items: {
                              $ref: "#/components/schemas/User"
                            }
                          },
                          total: {
                            type: "number"
                          },
                          limit: {
                            type: "number"
                          },
                          offset: {
                            type: "number"
                          }
                        },
                        required: ["users", "total"]
                      }
                    }
                  }
                }
              }
            }
          }
        },
        async (ctx) => {
          const session = ctx.context.session;
          const canListUsers = hasPermission.hasPermission({
            userId: ctx.context.session.user.id,
            role: session.user.role,
            options: opts,
            permissions: {
              user: ["list"]
            }
          });
          if (!canListUsers) {
            throw new betterCall.APIError("FORBIDDEN", {
              message: ADMIN_ERROR_CODES.YOU_ARE_NOT_ALLOWED_TO_LIST_USERS
            });
          }
          const where = [];
          if (ctx.query?.searchValue) {
            where.push({
              field: ctx.query.searchField || "email",
              operator: ctx.query.searchOperator || "contains",
              value: ctx.query.searchValue
            });
          }
          if (ctx.query?.filterValue) {
            where.push({
              field: ctx.query.filterField || "email",
              operator: ctx.query.filterOperator || "eq",
              value: ctx.query.filterValue
            });
          }
          try {
            const users = await ctx.context.internalAdapter.listUsers(
              Number(ctx.query?.limit) || void 0,
              Number(ctx.query?.offset) || void 0,
              ctx.query?.sortBy ? {
                field: ctx.query.sortBy,
                direction: ctx.query.sortDirection || "asc"
              } : void 0,
              where.length ? where : void 0
            );
            const total = await ctx.context.internalAdapter.countTotalUsers(
              where.length ? where : void 0
            );
            return ctx.json({
              users,
              total,
              limit: Number(ctx.query?.limit) || void 0,
              offset: Number(ctx.query?.offset) || void 0
            });
          } catch (e) {
            return ctx.json({
              users: [],
              total: 0
            });
          }
        }
      ),
      listUserSessions: account.createAuthEndpoint(
        "/admin/list-user-sessions",
        {
          method: "POST",
          use: [adminMiddleware],
          body: zod.z.object({
            userId: zod.z.coerce.string({
              description: "The user id"
            })
          }),
          metadata: {
            openapi: {
              operationId: "listUserSessions",
              summary: "List user sessions",
              description: "List user sessions",
              responses: {
                200: {
                  description: "List of user sessions",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          sessions: {
                            type: "array",
                            items: {
                              $ref: "#/components/schemas/Session"
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        async (ctx) => {
          const session = ctx.context.session;
          const canListSessions = hasPermission.hasPermission({
            userId: ctx.context.session.user.id,
            role: session.user.role,
            options: opts,
            permissions: {
              session: ["list"]
            }
          });
          if (!canListSessions) {
            throw new betterCall.APIError("FORBIDDEN", {
              message: ADMIN_ERROR_CODES.YOU_ARE_NOT_ALLOWED_TO_LIST_USERS_SESSIONS
            });
          }
          const sessions = await ctx.context.internalAdapter.listSessions(
            ctx.body.userId
          );
          return {
            sessions
          };
        }
      ),
      unbanUser: account.createAuthEndpoint(
        "/admin/unban-user",
        {
          method: "POST",
          body: zod.z.object({
            userId: zod.z.coerce.string({
              description: "The user id"
            })
          }),
          use: [adminMiddleware],
          metadata: {
            openapi: {
              operationId: "unbanUser",
              summary: "Unban a user",
              description: "Unban a user",
              responses: {
                200: {
                  description: "User unbanned",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          user: {
                            $ref: "#/components/schemas/User"
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        async (ctx) => {
          const session = ctx.context.session;
          const canBanUser = hasPermission.hasPermission({
            userId: ctx.context.session.user.id,
            role: session.user.role,
            options: opts,
            permissions: {
              user: ["ban"]
            }
          });
          if (!canBanUser) {
            throw new betterCall.APIError("FORBIDDEN", {
              message: ADMIN_ERROR_CODES.YOU_ARE_NOT_ALLOWED_TO_BAN_USERS
            });
          }
          const user = await ctx.context.internalAdapter.updateUser(
            ctx.body.userId,
            {
              banned: false,
              banExpires: null,
              banReason: null,
              updatedAt: /* @__PURE__ */ new Date()
            }
          );
          return ctx.json({
            user
          });
        }
      ),
      banUser: account.createAuthEndpoint(
        "/admin/ban-user",
        {
          method: "POST",
          body: zod.z.object({
            userId: zod.z.coerce.string({
              description: "The user id"
            }),
            /**
             * Reason for the ban
             */
            banReason: zod.z.string({
              description: "The reason for the ban"
            }).optional(),
            /**
             * Number of seconds until the ban expires
             */
            banExpiresIn: zod.z.number({
              description: "The number of seconds until the ban expires"
            }).optional()
          }),
          use: [adminMiddleware],
          metadata: {
            openapi: {
              operationId: "banUser",
              summary: "Ban a user",
              description: "Ban a user",
              responses: {
                200: {
                  description: "User banned",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          user: {
                            $ref: "#/components/schemas/User"
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        async (ctx) => {
          const session = ctx.context.session;
          const canBanUser = hasPermission.hasPermission({
            userId: ctx.context.session.user.id,
            role: session.user.role,
            options: opts,
            permissions: {
              user: ["ban"]
            }
          });
          if (!canBanUser) {
            throw new betterCall.APIError("FORBIDDEN", {
              message: ADMIN_ERROR_CODES.YOU_ARE_NOT_ALLOWED_TO_BAN_USERS
            });
          }
          if (ctx.body.userId === ctx.context.session.user.id) {
            throw new betterCall.APIError("BAD_REQUEST", {
              message: ADMIN_ERROR_CODES.YOU_CANNOT_BAN_YOURSELF
            });
          }
          const user = await ctx.context.internalAdapter.updateUser(
            ctx.body.userId,
            {
              banned: true,
              banReason: ctx.body.banReason || options?.defaultBanReason || "No reason",
              banExpires: ctx.body.banExpiresIn ? date.getDate(ctx.body.banExpiresIn, "sec") : options?.defaultBanExpiresIn ? date.getDate(options.defaultBanExpiresIn, "sec") : void 0,
              updatedAt: /* @__PURE__ */ new Date()
            },
            ctx
          );
          await ctx.context.internalAdapter.deleteSessions(ctx.body.userId);
          return ctx.json({
            user
          });
        }
      ),
      impersonateUser: account.createAuthEndpoint(
        "/admin/impersonate-user",
        {
          method: "POST",
          body: zod.z.object({
            userId: zod.z.coerce.string({
              description: "The user id"
            })
          }),
          use: [adminMiddleware],
          metadata: {
            openapi: {
              operationId: "impersonateUser",
              summary: "Impersonate a user",
              description: "Impersonate a user",
              responses: {
                200: {
                  description: "Impersonation session created",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          session: {
                            $ref: "#/components/schemas/Session"
                          },
                          user: {
                            $ref: "#/components/schemas/User"
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        async (ctx) => {
          const canImpersonateUser = hasPermission.hasPermission({
            userId: ctx.context.session.user.id,
            role: ctx.context.session.user.role,
            options: opts,
            permissions: {
              user: ["impersonate"]
            }
          });
          if (!canImpersonateUser) {
            throw new betterCall.APIError("FORBIDDEN", {
              message: ADMIN_ERROR_CODES.YOU_ARE_NOT_ALLOWED_TO_IMPERSONATE_USERS
            });
          }
          const targetUser = await ctx.context.internalAdapter.findUserById(
            ctx.body.userId
          );
          if (!targetUser) {
            throw new betterCall.APIError("NOT_FOUND", {
              message: "User not found"
            });
          }
          const session = await ctx.context.internalAdapter.createSession(
            targetUser.id,
            ctx,
            true,
            {
              impersonatedBy: ctx.context.session.user.id,
              expiresAt: options?.impersonationSessionDuration ? date.getDate(options.impersonationSessionDuration, "sec") : date.getDate(60 * 60, "sec")
              // 1 hour
            },
            true
          );
          if (!session) {
            throw new betterCall.APIError("INTERNAL_SERVER_ERROR", {
              message: ADMIN_ERROR_CODES.FAILED_TO_CREATE_USER
            });
          }
          const authCookies = ctx.context.authCookies;
          cookies_index.deleteSessionCookie(ctx);
          const dontRememberMeCookie = await ctx.getSignedCookie(
            ctx.context.authCookies.dontRememberToken.name,
            ctx.context.secret
          );
          const adminCookieProp = ctx.context.createAuthCookie("admin_session");
          await ctx.setSignedCookie(
            adminCookieProp.name,
            `${ctx.context.session.session.token}:${dontRememberMeCookie || ""}`,
            ctx.context.secret,
            authCookies.sessionToken.options
          );
          await cookies_index.setSessionCookie(
            ctx,
            {
              session,
              user: targetUser
            },
            true
          );
          return ctx.json({
            session,
            user: targetUser
          });
        }
      ),
      stopImpersonating: account.createAuthEndpoint(
        "/admin/stop-impersonating",
        {
          method: "POST"
        },
        async (ctx) => {
          const session = await account.getSessionFromCtx(ctx);
          if (!session) {
            throw new betterCall.APIError("UNAUTHORIZED");
          }
          if (!session.session.impersonatedBy) {
            throw new betterCall.APIError("BAD_REQUEST", {
              message: "You are not impersonating anyone"
            });
          }
          const user = await ctx.context.internalAdapter.findUserById(
            session.session.impersonatedBy
          );
          if (!user) {
            throw new betterCall.APIError("INTERNAL_SERVER_ERROR", {
              message: "Failed to find user"
            });
          }
          const adminCookieName = ctx.context.createAuthCookie("admin_session").name;
          const adminCookie = await ctx.getSignedCookie(
            adminCookieName,
            ctx.context.secret
          );
          if (!adminCookie) {
            throw new betterCall.APIError("INTERNAL_SERVER_ERROR", {
              message: "Failed to find admin session"
            });
          }
          const [adminSessionToken, dontRememberMeCookie] = adminCookie?.split(":");
          const adminSession = await ctx.context.internalAdapter.findSession(adminSessionToken);
          if (!adminSession || adminSession.session.userId !== user.id) {
            throw new betterCall.APIError("INTERNAL_SERVER_ERROR", {
              message: "Failed to find admin session"
            });
          }
          await ctx.context.internalAdapter.deleteSession(
            session.session.token
          );
          await cookies_index.setSessionCookie(ctx, adminSession, !!dontRememberMeCookie);
          return ctx.json(adminSession);
        }
      ),
      revokeUserSession: account.createAuthEndpoint(
        "/admin/revoke-user-session",
        {
          method: "POST",
          body: zod.z.object({
            sessionToken: zod.z.string({
              description: "The session token"
            })
          }),
          use: [adminMiddleware],
          metadata: {
            openapi: {
              operationId: "revokeUserSession",
              summary: "Revoke a user session",
              description: "Revoke a user session",
              responses: {
                200: {
                  description: "Session revoked",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          success: {
                            type: "boolean"
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        async (ctx) => {
          const session = ctx.context.session;
          const canRevokeSession = hasPermission.hasPermission({
            userId: ctx.context.session.user.id,
            role: session.user.role,
            options: opts,
            permissions: {
              session: ["revoke"]
            }
          });
          if (!canRevokeSession) {
            throw new betterCall.APIError("FORBIDDEN", {
              message: ADMIN_ERROR_CODES.YOU_ARE_NOT_ALLOWED_TO_REVOKE_USERS_SESSIONS
            });
          }
          await ctx.context.internalAdapter.deleteSession(
            ctx.body.sessionToken
          );
          return ctx.json({
            success: true
          });
        }
      ),
      revokeUserSessions: account.createAuthEndpoint(
        "/admin/revoke-user-sessions",
        {
          method: "POST",
          body: zod.z.object({
            userId: zod.z.coerce.string({
              description: "The user id"
            })
          }),
          use: [adminMiddleware],
          metadata: {
            openapi: {
              operationId: "revokeUserSessions",
              summary: "Revoke all user sessions",
              description: "Revoke all user sessions",
              responses: {
                200: {
                  description: "Sessions revoked",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          success: {
                            type: "boolean"
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        async (ctx) => {
          const session = ctx.context.session;
          const canRevokeSession = hasPermission.hasPermission({
            userId: ctx.context.session.user.id,
            role: session.user.role,
            options: opts,
            permissions: {
              session: ["revoke"]
            }
          });
          if (!canRevokeSession) {
            throw new betterCall.APIError("FORBIDDEN", {
              message: ADMIN_ERROR_CODES.YOU_ARE_NOT_ALLOWED_TO_REVOKE_USERS_SESSIONS
            });
          }
          await ctx.context.internalAdapter.deleteSessions(ctx.body.userId);
          return ctx.json({
            success: true
          });
        }
      ),
      removeUser: account.createAuthEndpoint(
        "/admin/remove-user",
        {
          method: "POST",
          body: zod.z.object({
            userId: zod.z.coerce.string({
              description: "The user id"
            })
          }),
          use: [adminMiddleware],
          metadata: {
            openapi: {
              operationId: "removeUser",
              summary: "Remove a user",
              description: "Delete a user and all their sessions and accounts. Cannot be undone.",
              responses: {
                200: {
                  description: "User removed",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          success: {
                            type: "boolean"
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        async (ctx) => {
          const session = ctx.context.session;
          const canDeleteUser = hasPermission.hasPermission({
            userId: ctx.context.session.user.id,
            role: session.user.role,
            options: opts,
            permissions: {
              user: ["delete"]
            }
          });
          if (!canDeleteUser) {
            throw new betterCall.APIError("FORBIDDEN", {
              message: ADMIN_ERROR_CODES.YOU_ARE_NOT_ALLOWED_TO_DELETE_USERS
            });
          }
          await ctx.context.internalAdapter.deleteUser(ctx.body.userId);
          return ctx.json({
            success: true
          });
        }
      ),
      setUserPassword: account.createAuthEndpoint(
        "/admin/set-user-password",
        {
          method: "POST",
          body: zod.z.object({
            newPassword: zod.z.string({
              description: "The new password"
            }),
            userId: zod.z.coerce.string({
              description: "The user id"
            })
          }),
          use: [adminMiddleware],
          metadata: {
            openapi: {
              operationId: "setUserPassword",
              summary: "Set a user's password",
              description: "Set a user's password",
              responses: {
                200: {
                  description: "Password set",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          status: {
                            type: "boolean"
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        async (ctx) => {
          const canSetUserPassword = hasPermission.hasPermission({
            userId: ctx.context.session.user.id,
            role: ctx.context.session.user.role,
            options: opts,
            permissions: {
              user: ["set-password"]
            }
          });
          if (!canSetUserPassword) {
            throw new betterCall.APIError("FORBIDDEN", {
              message: ADMIN_ERROR_CODES.YOU_ARE_NOT_ALLOWED_TO_SET_USERS_PASSWORD
            });
          }
          const hashedPassword = await ctx.context.password.hash(
            ctx.body.newPassword
          );
          await ctx.context.internalAdapter.updatePassword(
            ctx.body.userId,
            hashedPassword
          );
          return ctx.json({
            status: true
          });
        }
      ),
      userHasPermission: account.createAuthEndpoint(
        "/admin/has-permission",
        {
          method: "POST",
          body: zod.z.object({
            userId: zod.z.coerce.string().optional(),
            role: zod.z.string().optional()
          }).and(
            zod.z.union([
              zod.z.object({
                permission: zod.z.record(zod.z.string(), zod.z.array(zod.z.string())),
                permissions: zod.z.undefined()
              }),
              zod.z.object({
                permission: zod.z.undefined(),
                permissions: zod.z.record(zod.z.string(), zod.z.array(zod.z.string()))
              })
            ])
          ),
          metadata: {
            openapi: {
              description: "Check if the user has permission",
              requestBody: {
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        permission: {
                          type: "object",
                          description: "The permission to check",
                          deprecated: true
                        },
                        permissions: {
                          type: "object",
                          description: "The permission to check"
                        }
                      },
                      required: ["permissions"]
                    }
                  }
                }
              },
              responses: {
                "200": {
                  description: "Success",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          error: {
                            type: "string"
                          },
                          success: {
                            type: "boolean"
                          }
                        },
                        required: ["success"]
                      }
                    }
                  }
                }
              }
            },
            $Infer: {
              body: {}
            }
          }
        },
        async (ctx) => {
          if (!ctx.body?.permission && !ctx.body?.permissions) {
            throw new betterCall.APIError("BAD_REQUEST", {
              message: "invalid permission check. no permission(s) were passed."
            });
          }
          const session = await account.getSessionFromCtx(ctx);
          if (!session && (ctx.request || ctx.headers) && !ctx.body.userId && !ctx.body.role) {
            throw new betterCall.APIError("UNAUTHORIZED");
          }
          const user = session?.user || await ctx.context.internalAdapter.findUserById(
            ctx.body.userId
          ) || (ctx.body.role ? { id: "", role: ctx.body.role } : null);
          if (!user) {
            throw new betterCall.APIError("BAD_REQUEST", {
              message: "user not found"
            });
          }
          const result = hasPermission.hasPermission({
            userId: user.id,
            role: user.role,
            options,
            permissions: ctx.body.permissions ?? ctx.body.permission
          });
          return ctx.json({
            error: null,
            success: result
          });
        }
      )
    },
    $ERROR_CODES: ADMIN_ERROR_CODES,
    schema: schema$1.mergeSchema(schema, opts.schema)
  };
};
const schema = {
  user: {
    fields: {
      role: {
        type: "string",
        required: false,
        input: false
      },
      banned: {
        type: "boolean",
        defaultValue: false,
        required: false,
        input: false
      },
      banReason: {
        type: "string",
        required: false,
        input: false
      },
      banExpires: {
        type: "date",
        required: false,
        input: false
      }
    }
  },
  session: {
    fields: {
      impersonatedBy: {
        type: "string",
        required: false
      }
    }
  }
};

exports.admin = admin;
