import { Subset, AuthorizeResponse } from '../../access/index.js';
import '../../../shared/better-auth.Bi8FQwDD.js';
import 'zod';

declare const defaultStatements: {
    readonly user: readonly ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password"];
    readonly session: readonly ["list", "revoke", "delete"];
};
declare const defaultAc: {
    newRole<K extends "user" | "session">(statements: Subset<K, {
        readonly user: readonly ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password"];
        readonly session: readonly ["list", "revoke", "delete"];
    }>): {
        authorize<K_1 extends K>(request: K_1 extends infer T extends keyof Subset<K, {
            readonly user: readonly ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password"];
            readonly session: readonly ["list", "revoke", "delete"];
        }> ? { [key in T]?: Subset<K, {
            readonly user: readonly ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password"];
            readonly session: readonly ["list", "revoke", "delete"];
        }>[key] | {
            actions: Subset<K, {
                readonly user: readonly ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password"];
                readonly session: readonly ["list", "revoke", "delete"];
            }>[key];
            connector: "OR" | "AND";
        } | undefined; } : never, connector?: "OR" | "AND"): AuthorizeResponse;
        statements: Subset<K, {
            readonly user: readonly ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password"];
            readonly session: readonly ["list", "revoke", "delete"];
        }>;
    };
    statements: {
        readonly user: readonly ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password"];
        readonly session: readonly ["list", "revoke", "delete"];
    };
};
declare const adminAc: {
    authorize<K extends "user" | "session">(request: K extends infer T extends keyof Subset<"user" | "session", {
        readonly user: readonly ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password"];
        readonly session: readonly ["list", "revoke", "delete"];
    }> ? { [key in T]?: Subset<"user" | "session", {
        readonly user: readonly ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password"];
        readonly session: readonly ["list", "revoke", "delete"];
    }>[key] | {
        actions: Subset<"user" | "session", {
            readonly user: readonly ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password"];
            readonly session: readonly ["list", "revoke", "delete"];
        }>[key];
        connector: "OR" | "AND";
    } | undefined; } : never, connector?: "OR" | "AND"): AuthorizeResponse;
    statements: Subset<"user" | "session", {
        readonly user: readonly ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password"];
        readonly session: readonly ["list", "revoke", "delete"];
    }>;
};
declare const userAc: {
    authorize<K extends "user" | "session">(request: K extends infer T extends keyof Subset<"user" | "session", {
        readonly user: readonly ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password"];
        readonly session: readonly ["list", "revoke", "delete"];
    }> ? { [key in T]?: Subset<"user" | "session", {
        readonly user: readonly ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password"];
        readonly session: readonly ["list", "revoke", "delete"];
    }>[key] | {
        actions: Subset<"user" | "session", {
            readonly user: readonly ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password"];
            readonly session: readonly ["list", "revoke", "delete"];
        }>[key];
        connector: "OR" | "AND";
    } | undefined; } : never, connector?: "OR" | "AND"): AuthorizeResponse;
    statements: Subset<"user" | "session", {
        readonly user: readonly ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password"];
        readonly session: readonly ["list", "revoke", "delete"];
    }>;
};
declare const defaultRoles: {
    admin: {
        authorize<K extends "user" | "session">(request: K extends infer T extends keyof Subset<"user" | "session", {
            readonly user: readonly ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password"];
            readonly session: readonly ["list", "revoke", "delete"];
        }> ? { [key in T]?: Subset<"user" | "session", {
            readonly user: readonly ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password"];
            readonly session: readonly ["list", "revoke", "delete"];
        }>[key] | {
            actions: Subset<"user" | "session", {
                readonly user: readonly ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password"];
                readonly session: readonly ["list", "revoke", "delete"];
            }>[key];
            connector: "OR" | "AND";
        } | undefined; } : never, connector?: "OR" | "AND"): AuthorizeResponse;
        statements: Subset<"user" | "session", {
            readonly user: readonly ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password"];
            readonly session: readonly ["list", "revoke", "delete"];
        }>;
    };
    user: {
        authorize<K extends "user" | "session">(request: K extends infer T extends keyof Subset<"user" | "session", {
            readonly user: readonly ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password"];
            readonly session: readonly ["list", "revoke", "delete"];
        }> ? { [key in T]?: Subset<"user" | "session", {
            readonly user: readonly ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password"];
            readonly session: readonly ["list", "revoke", "delete"];
        }>[key] | {
            actions: Subset<"user" | "session", {
                readonly user: readonly ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password"];
                readonly session: readonly ["list", "revoke", "delete"];
            }>[key];
            connector: "OR" | "AND";
        } | undefined; } : never, connector?: "OR" | "AND"): AuthorizeResponse;
        statements: Subset<"user" | "session", {
            readonly user: readonly ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password"];
            readonly session: readonly ["list", "revoke", "delete"];
        }>;
    };
};

export { adminAc, defaultAc, defaultRoles, defaultStatements, userAc };
