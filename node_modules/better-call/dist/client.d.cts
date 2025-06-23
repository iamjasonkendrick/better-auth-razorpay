import { BetterFetchOption, BetterFetchResponse } from '@better-fetch/fetch';
import { j as Router, X as UnionToIntersection, b as Endpoint, U as HasRequiredKeys } from './router-Bn_wF2y_.cjs';

type HasRequired<T extends {
    body?: any;
    query?: any;
    params?: any;
}> = HasRequiredKeys<T> extends true ? HasRequiredKeys<T["body"]> extends false ? HasRequiredKeys<T["query"]> extends false ? HasRequiredKeys<T["params"]> extends false ? false : true : true : true : true;
type InferContext<T> = T extends (ctx: infer Ctx) => any ? Ctx extends object ? Ctx : never : never;
interface ClientOptions extends BetterFetchOption {
    baseURL: string;
}
type WithRequired<T, K> = T & {
    [P in K extends string ? K : never]-?: T[P extends keyof T ? P : never];
};
type WithoutServerOnly<T extends Record<string, Endpoint>> = {
    [K in keyof T]: T[K] extends Endpoint<any, infer O> ? O extends {
        metadata: {
            SERVER_ONLY: true;
        };
    } ? never : T[K] : T[K];
};
type RequiredOptionKeys<C extends {
    body?: any;
    query?: any;
    params?: any;
}> = (undefined extends C["body"] ? {} : {
    body: true;
}) & (undefined extends C["query"] ? {} : {
    query: true;
}) & (undefined extends C["params"] ? {} : {
    params: true;
});
declare const createClient: <R extends Router | Router["endpoints"]>(options: ClientOptions) => <OPT extends UnionToIntersection<WithoutServerOnly<R extends {
    endpoints: Record<string, Endpoint>;
} ? R["endpoints"] : R> extends {
    [key: string]: infer T_1;
} ? T_1 extends Endpoint ? { [key in T_1["options"]["method"] extends "GET" ? T_1["path"] : `@${T_1["options"]["method"] extends string ? Lowercase<T_1["options"]["method"]> : never}${T_1["path"]}`]: T_1; } : {} : {}> extends infer T ? { [K_1 in keyof T]: UnionToIntersection<WithoutServerOnly<R extends {
    endpoints: Record<string, Endpoint>;
} ? R["endpoints"] : R> extends {
    [key: string]: infer T_1;
} ? T_1 extends Endpoint ? { [key in T_1["options"]["method"] extends "GET" ? T_1["path"] : `@${T_1["options"]["method"] extends string ? Lowercase<T_1["options"]["method"]> : never}${T_1["path"]}`]: T_1; } : {} : {}>[K_1]; } : never, K extends keyof OPT, C extends InferContext<OPT[K]>>(path: K, ...options: HasRequired<C> extends true ? [WithRequired<BetterFetchOption<C["body"], C["query"], C["params"]>, keyof RequiredOptionKeys<C>>] : [BetterFetchOption<C["body"], C["query"], C["params"]>?]) => Promise<BetterFetchResponse<Awaited<ReturnType<OPT[K] extends Endpoint ? OPT[K] : never>>>>;

export { type ClientOptions, type RequiredOptionKeys, createClient };
