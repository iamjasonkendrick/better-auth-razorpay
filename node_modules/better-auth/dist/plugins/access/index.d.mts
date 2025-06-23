import { L as LiteralString } from '../../shared/better-auth.Bi8FQwDD.mjs';
import 'zod';

type SubArray<T extends unknown[] | readonly unknown[] | any[]> = T[number][];
type Subset<K extends keyof R, R extends Record<string | LiteralString, readonly string[] | readonly LiteralString[]>> = {
    [P in K]: SubArray<R[P]>;
};
type Statements = {
    readonly [resource: string]: readonly LiteralString[];
};
type AccessControl<TStatements extends Statements = Statements> = ReturnType<typeof createAccessControl<TStatements>>;
type Role<TStatements extends Statements = Record<string, any>> = {
    authorize: (request: any, connector?: "OR" | "AND") => AuthorizeResponse;
    statements: TStatements;
};

type AuthorizeResponse = {
    success: false;
    error: string;
} | {
    success: true;
    error?: never;
};
declare function role<TStatements extends Statements>(statements: TStatements): {
    authorize<K extends keyof TStatements>(request: { [key in K]?: TStatements[key] | {
        actions: TStatements[key];
        connector: "OR" | "AND";
    }; }, connector?: "OR" | "AND"): AuthorizeResponse;
    statements: TStatements;
};
declare function createAccessControl<const TStatements extends Statements>(s: TStatements): {
    newRole<K extends keyof TStatements>(statements: Subset<K, TStatements>): {
        authorize<K_1 extends K>(request: K_1 extends infer T extends keyof Subset<K, TStatements> ? { [key in T]?: Subset<K, TStatements>[key] | {
            actions: Subset<K, TStatements>[key];
            connector: "OR" | "AND";
        } | undefined; } : never, connector?: "OR" | "AND"): AuthorizeResponse;
        statements: Subset<K, TStatements>;
    };
    statements: TStatements;
};

export { createAccessControl, role };
export type { AccessControl, AuthorizeResponse, Role, Statements, SubArray, Subset };
