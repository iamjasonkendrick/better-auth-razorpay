import { Subset, AuthorizeResponse } from '../../access/index.js';
import '../../../shared/better-auth.Bi8FQwDD.js';
import 'zod';

declare const defaultStatements: {
    readonly organization: readonly ["update", "delete"];
    readonly member: readonly ["create", "update", "delete"];
    readonly invitation: readonly ["create", "cancel"];
    readonly team: readonly ["create", "update", "delete"];
};
declare const defaultAc: {
    newRole<K extends "organization" | "member" | "invitation" | "team">(statements: Subset<K, {
        readonly organization: readonly ["update", "delete"];
        readonly member: readonly ["create", "update", "delete"];
        readonly invitation: readonly ["create", "cancel"];
        readonly team: readonly ["create", "update", "delete"];
    }>): {
        authorize<K_1 extends K>(request: K_1 extends infer T extends keyof Subset<K, {
            readonly organization: readonly ["update", "delete"];
            readonly member: readonly ["create", "update", "delete"];
            readonly invitation: readonly ["create", "cancel"];
            readonly team: readonly ["create", "update", "delete"];
        }> ? { [key in T]?: Subset<K, {
            readonly organization: readonly ["update", "delete"];
            readonly member: readonly ["create", "update", "delete"];
            readonly invitation: readonly ["create", "cancel"];
            readonly team: readonly ["create", "update", "delete"];
        }>[key] | {
            actions: Subset<K, {
                readonly organization: readonly ["update", "delete"];
                readonly member: readonly ["create", "update", "delete"];
                readonly invitation: readonly ["create", "cancel"];
                readonly team: readonly ["create", "update", "delete"];
            }>[key];
            connector: "OR" | "AND";
        } | undefined; } : never, connector?: "OR" | "AND"): AuthorizeResponse;
        statements: Subset<K, {
            readonly organization: readonly ["update", "delete"];
            readonly member: readonly ["create", "update", "delete"];
            readonly invitation: readonly ["create", "cancel"];
            readonly team: readonly ["create", "update", "delete"];
        }>;
    };
    statements: {
        readonly organization: readonly ["update", "delete"];
        readonly member: readonly ["create", "update", "delete"];
        readonly invitation: readonly ["create", "cancel"];
        readonly team: readonly ["create", "update", "delete"];
    };
};
declare const adminAc: {
    authorize<K extends "organization" | "member" | "invitation" | "team">(request: K extends infer T extends keyof Subset<"organization" | "member" | "invitation" | "team", {
        readonly organization: readonly ["update", "delete"];
        readonly member: readonly ["create", "update", "delete"];
        readonly invitation: readonly ["create", "cancel"];
        readonly team: readonly ["create", "update", "delete"];
    }> ? { [key in T]?: Subset<"organization" | "member" | "invitation" | "team", {
        readonly organization: readonly ["update", "delete"];
        readonly member: readonly ["create", "update", "delete"];
        readonly invitation: readonly ["create", "cancel"];
        readonly team: readonly ["create", "update", "delete"];
    }>[key] | {
        actions: Subset<"organization" | "member" | "invitation" | "team", {
            readonly organization: readonly ["update", "delete"];
            readonly member: readonly ["create", "update", "delete"];
            readonly invitation: readonly ["create", "cancel"];
            readonly team: readonly ["create", "update", "delete"];
        }>[key];
        connector: "OR" | "AND";
    } | undefined; } : never, connector?: "OR" | "AND"): AuthorizeResponse;
    statements: Subset<"organization" | "member" | "invitation" | "team", {
        readonly organization: readonly ["update", "delete"];
        readonly member: readonly ["create", "update", "delete"];
        readonly invitation: readonly ["create", "cancel"];
        readonly team: readonly ["create", "update", "delete"];
    }>;
};
declare const ownerAc: {
    authorize<K extends "organization" | "member" | "invitation" | "team">(request: K extends infer T extends keyof Subset<"organization" | "member" | "invitation" | "team", {
        readonly organization: readonly ["update", "delete"];
        readonly member: readonly ["create", "update", "delete"];
        readonly invitation: readonly ["create", "cancel"];
        readonly team: readonly ["create", "update", "delete"];
    }> ? { [key in T]?: Subset<"organization" | "member" | "invitation" | "team", {
        readonly organization: readonly ["update", "delete"];
        readonly member: readonly ["create", "update", "delete"];
        readonly invitation: readonly ["create", "cancel"];
        readonly team: readonly ["create", "update", "delete"];
    }>[key] | {
        actions: Subset<"organization" | "member" | "invitation" | "team", {
            readonly organization: readonly ["update", "delete"];
            readonly member: readonly ["create", "update", "delete"];
            readonly invitation: readonly ["create", "cancel"];
            readonly team: readonly ["create", "update", "delete"];
        }>[key];
        connector: "OR" | "AND";
    } | undefined; } : never, connector?: "OR" | "AND"): AuthorizeResponse;
    statements: Subset<"organization" | "member" | "invitation" | "team", {
        readonly organization: readonly ["update", "delete"];
        readonly member: readonly ["create", "update", "delete"];
        readonly invitation: readonly ["create", "cancel"];
        readonly team: readonly ["create", "update", "delete"];
    }>;
};
declare const memberAc: {
    authorize<K extends "organization" | "member" | "invitation" | "team">(request: K extends infer T extends keyof Subset<"organization" | "member" | "invitation" | "team", {
        readonly organization: readonly ["update", "delete"];
        readonly member: readonly ["create", "update", "delete"];
        readonly invitation: readonly ["create", "cancel"];
        readonly team: readonly ["create", "update", "delete"];
    }> ? { [key in T]?: Subset<"organization" | "member" | "invitation" | "team", {
        readonly organization: readonly ["update", "delete"];
        readonly member: readonly ["create", "update", "delete"];
        readonly invitation: readonly ["create", "cancel"];
        readonly team: readonly ["create", "update", "delete"];
    }>[key] | {
        actions: Subset<"organization" | "member" | "invitation" | "team", {
            readonly organization: readonly ["update", "delete"];
            readonly member: readonly ["create", "update", "delete"];
            readonly invitation: readonly ["create", "cancel"];
            readonly team: readonly ["create", "update", "delete"];
        }>[key];
        connector: "OR" | "AND";
    } | undefined; } : never, connector?: "OR" | "AND"): AuthorizeResponse;
    statements: Subset<"organization" | "member" | "invitation" | "team", {
        readonly organization: readonly ["update", "delete"];
        readonly member: readonly ["create", "update", "delete"];
        readonly invitation: readonly ["create", "cancel"];
        readonly team: readonly ["create", "update", "delete"];
    }>;
};
declare const defaultRoles: {
    admin: {
        authorize<K extends "organization" | "member" | "invitation" | "team">(request: K extends infer T extends keyof Subset<"organization" | "member" | "invitation" | "team", {
            readonly organization: readonly ["update", "delete"];
            readonly member: readonly ["create", "update", "delete"];
            readonly invitation: readonly ["create", "cancel"];
            readonly team: readonly ["create", "update", "delete"];
        }> ? { [key in T]?: Subset<"organization" | "member" | "invitation" | "team", {
            readonly organization: readonly ["update", "delete"];
            readonly member: readonly ["create", "update", "delete"];
            readonly invitation: readonly ["create", "cancel"];
            readonly team: readonly ["create", "update", "delete"];
        }>[key] | {
            actions: Subset<"organization" | "member" | "invitation" | "team", {
                readonly organization: readonly ["update", "delete"];
                readonly member: readonly ["create", "update", "delete"];
                readonly invitation: readonly ["create", "cancel"];
                readonly team: readonly ["create", "update", "delete"];
            }>[key];
            connector: "OR" | "AND";
        } | undefined; } : never, connector?: "OR" | "AND"): AuthorizeResponse;
        statements: Subset<"organization" | "member" | "invitation" | "team", {
            readonly organization: readonly ["update", "delete"];
            readonly member: readonly ["create", "update", "delete"];
            readonly invitation: readonly ["create", "cancel"];
            readonly team: readonly ["create", "update", "delete"];
        }>;
    };
    owner: {
        authorize<K extends "organization" | "member" | "invitation" | "team">(request: K extends infer T extends keyof Subset<"organization" | "member" | "invitation" | "team", {
            readonly organization: readonly ["update", "delete"];
            readonly member: readonly ["create", "update", "delete"];
            readonly invitation: readonly ["create", "cancel"];
            readonly team: readonly ["create", "update", "delete"];
        }> ? { [key in T]?: Subset<"organization" | "member" | "invitation" | "team", {
            readonly organization: readonly ["update", "delete"];
            readonly member: readonly ["create", "update", "delete"];
            readonly invitation: readonly ["create", "cancel"];
            readonly team: readonly ["create", "update", "delete"];
        }>[key] | {
            actions: Subset<"organization" | "member" | "invitation" | "team", {
                readonly organization: readonly ["update", "delete"];
                readonly member: readonly ["create", "update", "delete"];
                readonly invitation: readonly ["create", "cancel"];
                readonly team: readonly ["create", "update", "delete"];
            }>[key];
            connector: "OR" | "AND";
        } | undefined; } : never, connector?: "OR" | "AND"): AuthorizeResponse;
        statements: Subset<"organization" | "member" | "invitation" | "team", {
            readonly organization: readonly ["update", "delete"];
            readonly member: readonly ["create", "update", "delete"];
            readonly invitation: readonly ["create", "cancel"];
            readonly team: readonly ["create", "update", "delete"];
        }>;
    };
    member: {
        authorize<K extends "organization" | "member" | "invitation" | "team">(request: K extends infer T extends keyof Subset<"organization" | "member" | "invitation" | "team", {
            readonly organization: readonly ["update", "delete"];
            readonly member: readonly ["create", "update", "delete"];
            readonly invitation: readonly ["create", "cancel"];
            readonly team: readonly ["create", "update", "delete"];
        }> ? { [key in T]?: Subset<"organization" | "member" | "invitation" | "team", {
            readonly organization: readonly ["update", "delete"];
            readonly member: readonly ["create", "update", "delete"];
            readonly invitation: readonly ["create", "cancel"];
            readonly team: readonly ["create", "update", "delete"];
        }>[key] | {
            actions: Subset<"organization" | "member" | "invitation" | "team", {
                readonly organization: readonly ["update", "delete"];
                readonly member: readonly ["create", "update", "delete"];
                readonly invitation: readonly ["create", "cancel"];
                readonly team: readonly ["create", "update", "delete"];
            }>[key];
            connector: "OR" | "AND";
        } | undefined; } : never, connector?: "OR" | "AND"): AuthorizeResponse;
        statements: Subset<"organization" | "member" | "invitation" | "team", {
            readonly organization: readonly ["update", "delete"];
            readonly member: readonly ["create", "update", "delete"];
            readonly invitation: readonly ["create", "cancel"];
            readonly team: readonly ["create", "update", "delete"];
        }>;
    };
};

export { adminAc, defaultAc, defaultRoles, defaultStatements, memberAc, ownerAc };
