import * as better_call from 'better-call';
import { z } from 'zod';

interface OneTapOptions {
    /**
     * Disable the signup flow
     *
     * @default false
     */
    disableSignup?: boolean;
    /**
     * Google Client ID
     *
     * If a client ID is provided in the social provider configuration,
     * it will be used.
     */
    clientId?: string;
}
declare const oneTap: (options?: OneTapOptions) => {
    id: "one-tap";
    endpoints: {
        oneTapCallback: {
            <AsResponse extends boolean = false, ReturnHeaders extends boolean = false>(inputCtx_0: {
                body: {
                    idToken: string;
                };
            } & {
                method?: "POST" | undefined;
            } & {
                query?: Record<string, any> | undefined;
            } & {
                params?: Record<string, any>;
            } & {
                request?: Request;
            } & {
                headers?: HeadersInit;
            } & {
                asResponse?: boolean;
                returnHeaders?: boolean;
                use?: better_call.Middleware[];
                path?: string;
            } & {
                asResponse?: AsResponse | undefined;
                returnHeaders?: ReturnHeaders | undefined;
            }): Promise<[AsResponse] extends [true] ? Response : [ReturnHeaders] extends [true] ? {
                headers: Headers;
                response: {
                    error: string;
                } | {
                    token: string;
                    user: {
                        id: any;
                        email: any;
                        emailVerified: any;
                        name: any;
                        image: any;
                        createdAt: any;
                        updatedAt: any;
                    };
                };
            } : {
                error: string;
            } | {
                token: string;
                user: {
                    id: any;
                    email: any;
                    emailVerified: any;
                    name: any;
                    image: any;
                    createdAt: any;
                    updatedAt: any;
                };
            }>;
            options: {
                method: "POST";
                body: z.ZodObject<{
                    idToken: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    idToken: string;
                }, {
                    idToken: string;
                }>;
                metadata: {
                    openapi: {
                        summary: string;
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                session: {
                                                    $ref: string;
                                                };
                                                user: {
                                                    $ref: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            400: {
                                description: string;
                            };
                        };
                    };
                };
            } & {
                use: any[];
            };
            path: "/one-tap/callback";
        };
    };
};

export { oneTap };
