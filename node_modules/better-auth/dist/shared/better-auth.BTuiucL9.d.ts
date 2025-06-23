import { L as LiteralString, b as Prettify } from './better-auth.Bi8FQwDD.js';
import { z } from 'zod';
import * as jose from 'jose';

interface OAuth2Tokens {
    tokenType?: string;
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpiresAt?: Date;
    refreshTokenExpiresAt?: Date;
    scopes?: string[];
    idToken?: string;
}
interface OAuthProvider<T extends Record<string, any> = Record<string, any>> {
    id: LiteralString;
    createAuthorizationURL: (data: {
        state: string;
        codeVerifier: string;
        scopes?: string[];
        redirectURI: string;
        display?: string;
        loginHint?: string;
    }) => Promise<URL> | URL;
    name: string;
    validateAuthorizationCode: (data: {
        code: string;
        redirectURI: string;
        codeVerifier?: string;
        deviceId?: string;
    }) => Promise<OAuth2Tokens>;
    getUserInfo: (token: OAuth2Tokens & {
        /**
         * The user object from the provider
         * This is only available for some providers like Apple
         */
        user?: {
            name?: {
                firstName?: string;
                lastName?: string;
            };
            email?: string;
        };
    }) => Promise<{
        user: {
            id: string;
            name?: string;
            email?: string | null;
            image?: string;
            emailVerified: boolean;
        };
        data: T;
    } | null>;
    /**
     * Custom function to refresh a token
     */
    refreshAccessToken?: (refreshToken: string) => Promise<OAuth2Tokens>;
    revokeToken?: (token: string) => Promise<void>;
    /**
     * Verify the id token
     * @param token - The id token
     * @param nonce - The nonce
     * @returns True if the id token is valid, false otherwise
     */
    verifyIdToken?: (token: string, nonce?: string) => Promise<boolean>;
    /**
     * Disable implicit sign up for new users. When set to true for the provider,
     * sign-in need to be called with with requestSignUp as true to create new users.
     */
    disableImplicitSignUp?: boolean;
    /**
     * Disable sign up for new users.
     */
    disableSignUp?: boolean;
    options?: ProviderOptions;
}
type ProviderOptions<Profile extends Record<string, any> = any> = {
    /**
     * The client ID of your application
     */
    clientId: string;
    /**
     * The client secret of your application
     */
    clientSecret: string;
    /**
     * The scopes you want to request from the provider
     */
    scope?: string[];
    /**
     * Remove default scopes of the provider
     */
    disableDefaultScope?: boolean;
    /**
     * The redirect URL for your application. This is where the provider will
     * redirect the user after the sign in process. Make sure this URL is
     * whitelisted in the provider's dashboard.
     */
    redirectURI?: string;
    /**
     * The client key of your application
     * Tiktok Social Provider uses this field instead of clientId
     */
    clientKey?: string;
    /**
     * Disable provider from allowing users to sign in
     * with this provider with an id token sent from the
     * client.
     */
    disableIdTokenSignIn?: boolean;
    /**
     * verifyIdToken function to verify the id token
     */
    verifyIdToken?: (token: string, nonce?: string) => Promise<boolean>;
    /**
     * Custom function to get user info from the provider
     */
    getUserInfo?: (token: OAuth2Tokens) => Promise<{
        user: {
            id: string;
            name?: string;
            email?: string | null;
            image?: string;
            emailVerified: boolean;
            [key: string]: any;
        };
        data: any;
    }>;
    /**
     * Custom function to refresh a token
     */
    refreshAccessToken?: (refreshToken: string) => Promise<OAuth2Tokens>;
    /**
     * Custom function to map the provider profile to a
     * user.
     */
    mapProfileToUser?: (profile: Profile) => {
        id?: string;
        name?: string;
        email?: string | null;
        image?: string;
        emailVerified?: boolean;
        [key: string]: any;
    } | Promise<{
        id?: string;
        name?: string;
        email?: string | null;
        image?: string;
        emailVerified?: boolean;
        [key: string]: any;
    }>;
    /**
     * Disable implicit sign up for new users. When set to true for the provider,
     * sign-in need to be called with with requestSignUp as true to create new users.
     */
    disableImplicitSignUp?: boolean;
    /**
     * Disable sign up for new users.
     */
    disableSignUp?: boolean;
    /**
     * The prompt to use for the authorization code request
     */
    prompt?: "select_account" | "consent" | "login" | "none" | "select_account+consent";
    /**
     * The response mode to use for the authorization code request
     */
    responseMode?: "query" | "form_post";
    /**
     * If enabled, the user info will be overridden with the provider user info
     * This is useful if you want to use the provider user info to update the user info
     *
     * @default false
     */
    overrideUserInfoOnSignIn?: boolean;
};

type LoginType = 0 /** Facebook OAuth */ | 1 /** Google OAuth */ | 24 /** Apple OAuth */ | 27 /** Microsoft OAuth */ | 97 /** Mobile device */ | 98 /** RingCentral OAuth */ | 99 /** API user */ | 100 /** Zoom Work email */ | 101; /** Single Sign-On (SSO) */
type AccountStatus = "pending" | "active" | "inactive";
type PronounOption = 1 /** Ask the user every time */ | 2 /** Always display */ | 3; /** Do not display */
interface PhoneNumber {
    /** The country code of the phone number (Example: "+1") */
    code: string;
    /** The country of the phone number (Example: "US") */
    country: string;
    /** The label for the phone number (Example: "Mobile") */
    label: string;
    /** The phone number itself (Example: "800000000") */
    number: string;
    /** Whether the phone number has been verified (Example: true) */
    verified: boolean;
}
/**
 * See the full documentation below:
 * https://developers.zoom.us/docs/api/users/#tag/users/GET/users/{userId}
 */
interface ZoomProfile extends Record<string, any> {
    /** The user's account ID (Example: "q6gBJVO5TzexKYTb_I2rpg") */
    account_id: string;
    /** The user's account number (Example: 10009239) */
    account_number: number;
    /** The user's cluster (Example: "us04") */
    cluster: string;
    /** The user's CMS ID. Only enabled for Kaltura integration (Example: "KDcuGIm1QgePTO8WbOqwIQ") */
    cms_user_id: string;
    /** The user's cost center (Example: "cost center") */
    cost_center: string;
    /** User create time (Example: "2018-10-31T04:32:37Z") */
    created_at: string;
    /** Department (Example: "Developers") */
    dept: string;
    /** User's display name (Example: "Jill Chill") */
    display_name: string;
    /** User's email address (Example: "jchill@example.com") */
    email: string;
    /** User's first name (Example: "Jill") */
    first_name: string;
    /** IDs of the web groups that the user belongs to (Example: ["RSMaSp8sTEGK0_oamiA2_w"]) */
    group_ids: string[];
    /** User ID (Example: "zJKyaiAyTNC-MWjiWC18KQ") */
    id: string;
    /** IM IDs of the groups that the user belongs to (Example: ["t-_-d56CSWG-7BF15LLrOw"]) */
    im_group_ids: string[];
    /** The user's JID (Example: "jchill@example.com") */
    jid: string;
    /** The user's job title (Example: "API Developer") */
    job_title: string;
    /** Default language for the Zoom Web Portal (Example: "en-US") */
    language: string;
    /** User last login client version (Example: "5.9.6.4993(mac)") */
    last_client_version: string;
    /** User last login time (Example: "2021-05-05T20:40:30Z") */
    last_login_time: string;
    /** User's last name (Example: "Chill") */
    last_name: string;
    /** The time zone of the user (Example: "Asia/Shanghai") */
    timezone: string;
    /** User's location (Example: "Paris") */
    location: string;
    /** The user's login method (Example: 101) */
    login_types: LoginType[];
    /** User's personal meeting URL (Example: "example.com") */
    personal_meeting_url: string;
    /** This field has been deprecated and will not be supported in the future.
     * Use the phone_numbers field instead of this field.
     * The user's phone number (Example: "+1 800000000") */
    phone_number?: string;
    /** The URL for user's profile picture (Example: "example.com") */
    pic_url: string;
    /** Personal Meeting ID (PMI) (Example: 3542471135) */
    pmi: number;
    /** Unique identifier of the user's assigned role (Example: "0") */
    role_id: string;
    /** User's role name (Example: "Admin") */
    role_name: string;
    /** Status of user's account (Example: "pending") */
    status: AccountStatus;
    /** Use the personal meeting ID (PMI) for instant meetings (Example: false) */
    use_pmi: boolean;
    /** The time and date when the user was created (Example: "2018-10-31T04:32:37Z") */
    user_created_at: string;
    /** Displays whether user is verified or not (Example: 1) */
    verified: number;
    /** The user's Zoom Workplace plan option (Example: 64) */
    zoom_one_type: number;
    /** The user's company (Example: "Jill") */
    company?: string;
    /** Custom attributes that have been assigned to the user (Example: [{ "key": "cbf_cywdkexrtqc73f97gd4w6g", "name": "A1", "value": "1" }]) */
    custom_attributes?: {
        key: string;
        name: string;
        value: string;
    }[];
    /** The employee's unique ID. This field only returns when SAML single sign-on (SSO) is enabled.
     * The `login_type` value is `101` (SSO) (Example: "HqDyI037Qjili1kNsSIrIg") */
    employee_unique_id?: string;
    /** The manager for the user (Example: "thill@example.com") */
    manager?: string;
    /** The user's country for the company phone number (Example: "US")
     * @deprecated true */
    phone_country?: string;
    /** The phone number's ISO country code (Example: "+1") */
    phone_numbers?: PhoneNumber[];
    /** The user's plan type (Example: "1") */
    plan_united_type?: string;
    /** The user's pronouns (Example: "3123") */
    pronouns?: string;
    /** The user's display pronouns setting (Example: 1) */
    pronouns_option?: PronounOption;
    /** Personal meeting room URL, if the user has one (Example: "example.com") */
    vanity_url?: string;
}
interface ZoomOptions extends ProviderOptions<ZoomProfile> {
    pkce?: boolean;
}
declare const zoom: (userOptions: ZoomOptions) => {
    id: "zoom";
    name: string;
    createAuthorizationURL: ({ state, redirectURI, codeVerifier }: {
        state: string;
        codeVerifier: string;
        scopes?: string[];
        redirectURI: string;
        display?: string;
        loginHint?: string;
    }) => Promise<URL>;
    validateAuthorizationCode: ({ code, redirectURI, codeVerifier }: {
        code: string;
        redirectURI: string;
        codeVerifier?: string;
        deviceId?: string;
    }) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
        user?: {
            name?: {
                firstName?: string;
                lastName?: string;
            };
            email
            /** Whether the phone number has been verified (Example: true) */
            ?: string;
        };
    }): Promise<{
        user: {
            id: string;
            name?: string;
            email?: string | null;
            image?: string;
            emailVerified: boolean;
            [key: string]: any;
        };
        data: any;
    } | null>;
};

interface VkProfile {
    user: {
        user_id: string;
        first_name: string;
        last_name: string;
        email?: string;
        phone?: number;
        avatar?: string;
        sex?: number;
        verified?: boolean;
        birthday: string;
    };
}
declare const enum LANG {
    RUS = 0,
    UKR = 1,
    ENG = 3,
    SPA = 4,
    GERMAN = 6,
    POL = 15,
    FRA = 16,
    TURKEY = 82
}
interface VkOption extends ProviderOptions {
    lang_id?: LANG;
    scheme?: "light" | "dark";
}
declare const vk: (options: VkOption) => {
    id: "vk";
    name: string;
    createAuthorizationURL({ state, scopes, codeVerifier, redirectURI }: {
        state: string;
        codeVerifier: string;
        scopes?: string[];
        redirectURI: string;
        display?: string;
        loginHint?: string;
    }): Promise<URL>;
    validateAuthorizationCode: ({ code, codeVerifier, redirectURI, deviceId, }: {
        code: string;
        redirectURI: string;
        codeVerifier?: string;
        deviceId?: string;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(data: OAuth2Tokens & {
        user?: {
            name?: {
                firstName?: string;
                lastName?: string;
            };
            email?: string;
        };
    }): Promise<{
        user: {
            id: string;
            name?: string;
            email?: string | null;
            image?: string;
            emailVerified: boolean;
            [key: string]: any;
        };
        data: any;
    } | null>;
    options: VkOption;
};

interface RobloxProfile extends Record<string, any> {
    /** the user's id */
    sub: string;
    /** the user's username */
    preferred_username: string;
    /** the user's display name, will return the same value as the preferred_username if not set */
    nickname: string;
    /** the user's display name, again, will return the same value as the preferred_username if not set */
    name: string;
    /** the account creation date as a unix timestamp in seconds */
    created_at: number;
    /** the user's profile URL */
    profile: string;
    /** the user's avatar URL */
    picture: string;
}
interface RobloxOptions extends ProviderOptions<RobloxProfile> {
    prompt?: "none" | "consent" | "login" | "select_account" | "select_account+consent";
}
declare const roblox: (options: RobloxOptions) => {
    id: "roblox";
    name: string;
    createAuthorizationURL({ state, scopes, redirectURI }: {
        state: string;
        codeVerifier: string;
        scopes?: string[];
        redirectURI: string;
        display?: string;
        loginHint?: string;
    }): URL;
    validateAuthorizationCode: ({ code, redirectURI }: {
        code: string;
        redirectURI: string;
        codeVerifier?: string;
        deviceId?: string;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
        user?: {
            name?: {
                firstName?: string;
                lastName?: string;
            };
            email?: string;
        };
    }): Promise<{
        user: {
            id: string;
            name?: string;
            email?: string | null;
            image?: string;
            emailVerified: boolean;
            [key: string]: any;
        };
        data: any;
    } | null>;
    options: RobloxOptions;
};

interface RedditProfile {
    id: string;
    name: string;
    icon_img: string | null;
    has_verified_email: boolean;
    oauth_client_id: string;
    verified: boolean;
}
interface RedditOptions extends ProviderOptions<RedditProfile> {
    duration?: string;
}
declare const reddit: (options: RedditOptions) => {
    id: "reddit";
    name: string;
    createAuthorizationURL({ state, scopes, redirectURI }: {
        state: string;
        codeVerifier: string;
        scopes?: string[];
        redirectURI: string;
        display?: string;
        loginHint?: string;
    }): Promise<URL>;
    validateAuthorizationCode: ({ code, redirectURI }: {
        code: string;
        redirectURI: string;
        codeVerifier?: string;
        deviceId?: string;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
        user?: {
            name?: {
                firstName?: string;
                lastName?: string;
            };
            email?: string;
        };
    }): Promise<{
        user: {
            id: string;
            name?: string;
            email?: string | null;
            image?: string;
            emailVerified: boolean;
            [key: string]: any;
        };
        data: any;
    } | null>;
    options: RedditOptions;
};

/**
 * [More info](https://developers.tiktok.com/doc/tiktok-api-v2-get-user-info/)
 */
interface TiktokProfile extends Record<string, any> {
    data: {
        user: {
            /**
             * The unique identification of the user in the current application.Open id
             * for the client.
             *
             * To return this field, add `fields=open_id` in the user profile request's query parameter.
             */
            open_id: string;
            /**
             * The unique identification of the user across different apps for the same developer.
             * For example, if a partner has X number of clients,
             * it will get X number of open_id for the same TikTok user,
             * but one persistent union_id for the particular user.
             *
             * To return this field, add `fields=union_id` in the user profile request's query parameter.
             */
            union_id?: string;
            /**
             * User's profile image.
             *
             * To return this field, add `fields=avatar_url` in the user profile request's query parameter.
             */
            avatar_url?: string;
            /**
             * User`s profile image in 100x100 size.
             *
             * To return this field, add `fields=avatar_url_100` in the user profile request's query parameter.
             */
            avatar_url_100?: string;
            /**
             * User's profile image with higher resolution
             *
             * To return this field, add `fields=avatar_url_100` in the user profile request's query parameter.
             */
            avatar_large_url: string;
            /**
             * User's profile name
             *
             * To return this field, add `fields=display_name` in the user profile request's query parameter.
             */
            display_name: string;
            /**
             * User's username.
             *
             * To return this field, add `fields=username` in the user profile request's query parameter.
             */
            username: string;
            /** @note Email is currently unsupported by TikTok  */
            email?: string;
            /**
             * User's bio description if there is a valid one.
             *
             * To return this field, add `fields=bio_description` in the user profile request's query parameter.
             */
            bio_description?: string;
            /**
             * The link to user's TikTok profile page.
             *
             * To return this field, add `fields=profile_deep_link` in the user profile request's query parameter.
             */
            profile_deep_link?: string;
            /**
             * Whether TikTok has provided a verified badge to the account after confirming
             * that it belongs to the user it represents.
             *
             * To return this field, add `fields=is_verified` in the user profile request's query parameter.
             */
            is_verified?: boolean;
            /**
             * User's followers count.
             *
             * To return this field, add `fields=follower_count` in the user profile request's query parameter.
             */
            follower_count?: number;
            /**
             * The number of accounts that the user is following.
             *
             * To return this field, add `fields=following_count` in the user profile request's query parameter.
             */
            following_count?: number;
            /**
             * The total number of likes received by the user across all of their videos.
             *
             * To return this field, add `fields=likes_count` in the user profile request's query parameter.
             */
            likes_count?: number;
            /**
             * The total number of publicly posted videos by the user.
             *
             * To return this field, add `fields=video_count` in the user profile request's query parameter.
             */
            video_count?: number;
        };
    };
    error?: {
        /**
         * The error category in string.
         */
        code?: string;
        /**
         * The error message in string.
         */
        message?: string;
        /**
         * The error message in string.
         */
        log_id?: string;
    };
}
interface TiktokOptions extends ProviderOptions {
}
declare const tiktok: (options: TiktokOptions) => {
    id: "tiktok";
    name: string;
    createAuthorizationURL({ state, scopes, redirectURI }: {
        state: string;
        codeVerifier: string;
        scopes?: string[];
        redirectURI: string;
        display?: string;
        loginHint?: string;
    }): URL;
    validateAuthorizationCode: ({ code, redirectURI }: {
        code: string;
        redirectURI: string;
        codeVerifier?: string;
        deviceId?: string;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
        user?: {
            name?: {
                firstName?: string;
                lastName?: string;
            };
            email?: string;
        };
    }): Promise<{
        user: {
            id: string;
            name?: string;
            email?: string | null;
            image?: string;
            emailVerified: boolean;
            [key: string]: any;
        };
        data: any;
    } | null>;
    options: TiktokOptions;
};

interface GitlabProfile extends Record<string, any> {
    id: number;
    username: string;
    email: string;
    name: string;
    state: string;
    avatar_url: string;
    web_url: string;
    created_at: string;
    bio: string;
    location?: string;
    public_email: string;
    skype: string;
    linkedin: string;
    twitter: string;
    website_url: string;
    organization: string;
    job_title: string;
    pronouns: string;
    bot: boolean;
    work_information?: string;
    followers: number;
    following: number;
    local_time: string;
    last_sign_in_at: string;
    confirmed_at: string;
    theme_id: number;
    last_activity_on: string;
    color_scheme_id: number;
    projects_limit: number;
    current_sign_in_at: string;
    identities: Array<{
        provider: string;
        extern_uid: string;
    }>;
    can_create_group: boolean;
    can_create_project: boolean;
    two_factor_enabled: boolean;
    external: boolean;
    private_profile: boolean;
    commit_email: string;
    shared_runners_minutes_limit: number;
    extra_shared_runners_minutes_limit: number;
}
interface GitlabOptions extends ProviderOptions<GitlabProfile> {
    issuer?: string;
}
declare const gitlab: (options: GitlabOptions) => {
    id: "gitlab";
    name: string;
    createAuthorizationURL: ({ state, scopes, codeVerifier, loginHint, redirectURI, }: {
        state: string;
        codeVerifier: string;
        scopes?: string[];
        redirectURI: string;
        display?: string;
        loginHint?: string;
    }) => Promise<URL>;
    validateAuthorizationCode: ({ code, redirectURI, codeVerifier }: {
        code: string;
        redirectURI: string;
        codeVerifier?: string;
        deviceId?: string;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
        user?: {
            name?: {
                firstName?: string;
                lastName?: string;
            };
            email?: string;
        };
    }): Promise<{
        user: {
            id: string;
            name?: string;
            email?: string | null;
            image?: string;
            emailVerified: boolean;
            [key: string]: any;
        };
        data: any;
    } | null>;
    options: GitlabOptions;
};

interface LinkedInProfile {
    sub: string;
    name: string;
    given_name: string;
    family_name: string;
    picture: string;
    locale: {
        country: string;
        language: string;
    };
    email: string;
    email_verified: boolean;
}
interface LinkedInOptions extends ProviderOptions<LinkedInProfile> {
}
declare const linkedin: (options: LinkedInOptions) => {
    id: "linkedin";
    name: string;
    createAuthorizationURL: ({ state, scopes, redirectURI, loginHint, }: {
        state: string;
        codeVerifier: string;
        scopes?: string[];
        redirectURI: string;
        display?: string;
        loginHint?: string;
    }) => Promise<URL>;
    validateAuthorizationCode: ({ code, redirectURI }: {
        code: string;
        redirectURI: string;
        codeVerifier?: string;
        deviceId?: string;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
        user?: {
            name?: {
                firstName?: string;
                lastName?: string;
            };
            email?: string;
        };
    }): Promise<{
        user: {
            id: string;
            name?: string;
            email?: string | null;
            image?: string;
            emailVerified: boolean;
            [key: string]: any;
        };
        data: any;
    } | null>;
    options: LinkedInOptions;
};

interface KickProfile {
    /**
     * The user id of the user
     */
    user_id: string;
    /**
     * The name of the user
     */
    name: string;
    /**
     * The email of the user
     */
    email: string;
    /**
     * The picture of the user
     */
    profile_picture: string;
}
interface KickOptions extends ProviderOptions<KickProfile> {
}
declare const kick: (options: KickOptions) => {
    id: "kick";
    name: string;
    createAuthorizationURL({ state, scopes, redirectURI, codeVerifier }: {
        state: string;
        codeVerifier: string;
        scopes?: string[];
        redirectURI: string;
        display?: string;
        loginHint?: string;
    }): Promise<URL>;
    validateAuthorizationCode({ code, redirectURI, codeVerifier }: {
        code: string;
        redirectURI: string;
        codeVerifier?: string;
        deviceId?: string;
    }): Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
        user?: {
            name?: {
                firstName?: string;
                lastName?: string;
            };
            email?: string;
        };
    }): Promise<{
        user: {
            id: string;
            name?: string;
            email?: string | null;
            image?: string;
            emailVerified: boolean;
            [key: string]: any;
        };
        data: any;
    } | null>;
    options: KickOptions;
};

interface DropboxProfile {
    account_id: string;
    name: {
        given_name: string;
        surname: string;
        familiar_name: string;
        display_name: string;
        abbreviated_name: string;
    };
    email: string;
    email_verified: boolean;
    profile_photo_url: string;
}
interface DropboxOptions extends ProviderOptions<DropboxProfile> {
}
declare const dropbox: (options: DropboxOptions) => {
    id: "dropbox";
    name: string;
    createAuthorizationURL: ({ state, scopes, codeVerifier, redirectURI, }: {
        state: string;
        codeVerifier: string;
        scopes?: string[];
        redirectURI: string;
        display?: string;
        loginHint?: string;
    }) => Promise<URL>;
    validateAuthorizationCode: ({ code, codeVerifier, redirectURI }: {
        code: string;
        redirectURI: string;
        codeVerifier?: string;
        deviceId?: string;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
        user?: {
            name?: {
                firstName?: string;
                lastName?: string;
            };
            email?: string;
        };
    }): Promise<{
        user: {
            id: string;
            name?: string;
            email?: string | null;
            image?: string;
            emailVerified: boolean;
            [key: string]: any;
        };
        data: any;
    } | null>;
    options: DropboxOptions;
};

interface TwitterProfile {
    data: {
        /**
         * Unique identifier of this user. This is returned as a string in order to avoid complications with languages and tools
         * that cannot handle large integers.
         */
        id: string;
        /** The friendly name of this user, as shown on their profile. */
        name: string;
        /** The email address of this user. */
        email?: string;
        /** The Twitter handle (screen name) of this user. */
        username: string;
        /**
         * The location specified in the user's profile, if the user provided one.
         * As this is a freeform value, it may not indicate a valid location, but it may be fuzzily evaluated when performing searches with location queries.
         *
         * To return this field, add `user.fields=location` in the authorization request's query parameter.
         */
        location?: string;
        /**
         * This object and its children fields contain details about text that has a special meaning in the user's description.
         *
         *To return this field, add `user.fields=entities` in the authorization request's query parameter.
         */
        entities?: {
            /** Contains details about the user's profile website. */
            url: {
                /** Contains details about the user's profile website. */
                urls: Array<{
                    /** The start position (zero-based) of the recognized user's profile website. All start indices are inclusive. */
                    start: number;
                    /** The end position (zero-based) of the recognized user's profile website. This end index is exclusive. */
                    end: number;
                    /** The URL in the format entered by the user. */
                    url: string;
                    /** The fully resolved URL. */
                    expanded_url: string;
                    /** The URL as displayed in the user's profile. */
                    display_url: string;
                }>;
            };
            /** Contains details about URLs, Hashtags, Cashtags, or mentions located within a user's description. */
            description: {
                hashtags: Array<{
                    start: number;
                    end: number;
                    tag: string;
                }>;
            };
        };
        /**
         * Indicate if this user is a verified Twitter user.
         *
         * To return this field, add `user.fields=verified` in the authorization request's query parameter.
         */
        verified?: boolean;
        /**
         * The text of this user's profile description (also known as bio), if the user provided one.
         *
         * To return this field, add `user.fields=description` in the authorization request's query parameter.
         */
        description?: string;
        /**
         * The URL specified in the user's profile, if present.
         *
         * To return this field, add `user.fields=url` in the authorization request's query parameter.
         */
        url?: string;
        /** The URL to the profile image for this user, as shown on the user's profile. */
        profile_image_url?: string;
        protected?: boolean;
        /**
         * Unique identifier of this user's pinned Tweet.
         *
         *  You can obtain the expanded object in `includes.tweets` by adding `expansions=pinned_tweet_id` in the authorization request's query parameter.
         */
        pinned_tweet_id?: string;
        created_at?: string;
    };
    includes?: {
        tweets?: Array<{
            id: string;
            text: string;
        }>;
    };
    [claims: string]: unknown;
}
interface TwitterOption extends ProviderOptions<TwitterProfile> {
}
declare const twitter: (options: TwitterOption) => {
    id: "twitter";
    name: string;
    createAuthorizationURL(data: {
        state: string;
        codeVerifier: string;
        scopes?: string[];
        redirectURI: string;
        display?: string;
        loginHint?: string;
    }): Promise<URL>;
    validateAuthorizationCode: ({ code, codeVerifier, redirectURI }: {
        code: string;
        redirectURI: string;
        codeVerifier?: string;
        deviceId?: string;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
        user?: {
            name?: {
                firstName?: string;
                lastName?: string;
            };
            email?: string;
        };
    }): Promise<{
        user: {
            id: string;
            name?: string;
            email?: string | null;
            image?: string;
            emailVerified: boolean;
            [key: string]: any;
        };
        data: any;
    } | null>;
    options: TwitterOption;
};

interface TwitchProfile {
    /**
     * The sub of the user
     */
    sub: string;
    /**
     * The preferred username of the user
     */
    preferred_username: string;
    /**
     * The email of the user
     */
    email: string;
    /**
     * The picture of the user
     */
    picture: string;
}
interface TwitchOptions extends ProviderOptions<TwitchProfile> {
    claims?: string[];
}
declare const twitch: (options: TwitchOptions) => {
    id: "twitch";
    name: string;
    createAuthorizationURL({ state, scopes, redirectURI }: {
        state: string;
        codeVerifier: string;
        scopes?: string[];
        redirectURI: string;
        display?: string;
        loginHint?: string;
    }): Promise<URL>;
    validateAuthorizationCode: ({ code, redirectURI }: {
        code: string;
        redirectURI: string;
        codeVerifier?: string;
        deviceId?: string;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
        user?: {
            name?: {
                firstName?: string;
                lastName?: string;
            };
            email?: string;
        };
    }): Promise<{
        user: {
            id: string;
            name?: string;
            email?: string | null;
            image?: string;
            emailVerified: boolean;
            [key: string]: any;
        };
        data: any;
    } | null>;
    options: TwitchOptions;
};

interface SpotifyProfile {
    id: string;
    display_name: string;
    email: string;
    images: {
        url: string;
    }[];
}
interface SpotifyOptions extends ProviderOptions<SpotifyProfile> {
}
declare const spotify: (options: SpotifyOptions) => {
    id: "spotify";
    name: string;
    createAuthorizationURL({ state, scopes, codeVerifier, redirectURI }: {
        state: string;
        codeVerifier: string;
        scopes?: string[];
        redirectURI: string;
        display?: string;
        loginHint?: string;
    }): Promise<URL>;
    validateAuthorizationCode: ({ code, codeVerifier, redirectURI }: {
        code: string;
        redirectURI: string;
        codeVerifier?: string;
        deviceId?: string;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
        user?: {
            name?: {
                firstName?: string;
                lastName?: string;
            };
            email?: string;
        };
    }): Promise<{
        user: {
            id: string;
            name?: string;
            email?: string | null;
            image?: string;
            emailVerified: boolean;
            [key: string]: any;
        };
        data: any;
    } | null>;
    options: SpotifyOptions;
};

interface GoogleProfile {
    aud: string;
    azp: string;
    email: string;
    email_verified: boolean;
    exp: number;
    /**
     * The family name of the user, or last name in most
     * Western languages.
     */
    family_name: string;
    /**
     * The given name of the user, or first name in most
     * Western languages.
     */
    given_name: string;
    hd?: string;
    iat: number;
    iss: string;
    jti?: string;
    locale?: string;
    name: string;
    nbf?: number;
    picture: string;
    sub: string;
}
interface GoogleOptions extends ProviderOptions<GoogleProfile> {
    /**
     * The access type to use for the authorization code request
     */
    accessType?: "offline" | "online";
    /**
     * The display mode to use for the authorization code request
     */
    display?: "page" | "popup" | "touch" | "wap";
    /**
     * The hosted domain of the user
     */
    hd?: string;
}
declare const google: (options: GoogleOptions) => {
    id: "google";
    name: string;
    createAuthorizationURL({ state, scopes, codeVerifier, redirectURI, loginHint, display, }: {
        state: string;
        codeVerifier: string;
        scopes?: string[];
        redirectURI: string;
        display?: string;
        loginHint?: string;
    }): Promise<URL>;
    validateAuthorizationCode: ({ code, codeVerifier, redirectURI }: {
        code: string;
        redirectURI: string;
        codeVerifier?: string;
        deviceId?: string;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    verifyIdToken(token: string, nonce: string | undefined): Promise<boolean>;
    getUserInfo(token: OAuth2Tokens & {
        user?: {
            name?: {
                firstName?: string;
                lastName?: string;
            };
            email?: string;
        };
    }): Promise<{
        user: {
            id: string;
            name?: string;
            email?: string | null;
            image?: string;
            emailVerified: boolean;
            [key: string]: any;
        };
        data: any;
    } | null>;
    options: GoogleOptions;
};

interface MicrosoftEntraIDProfile extends Record<string, any> {
    sub: string;
    name: string;
    email: string;
    picture: string;
}
interface MicrosoftOptions extends ProviderOptions<MicrosoftEntraIDProfile> {
    /**
     * The tenant ID of the Microsoft account
     * @default "common"
     */
    tenantId?: string;
    /**
     * The size of the profile photo
     * @default 48
     */
    profilePhotoSize?: 48 | 64 | 96 | 120 | 240 | 360 | 432 | 504 | 648;
    /**
     * Disable profile photo
     */
    disableProfilePhoto?: boolean;
}
declare const microsoft: (options: MicrosoftOptions) => {
    id: "microsoft";
    name: string;
    createAuthorizationURL(data: {
        state: string;
        codeVerifier: string;
        scopes?: string[];
        redirectURI: string;
        display?: string;
        loginHint?: string;
    }): Promise<URL>;
    validateAuthorizationCode({ code, codeVerifier, redirectURI }: {
        code: string;
        redirectURI: string;
        codeVerifier?: string;
        deviceId?: string;
    }): Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
        user?: {
            name?: {
                firstName?: string;
                lastName?: string;
            };
            email?: string;
        };
    }): Promise<{
        user: {
            id: string;
            name?: string;
            email?: string | null;
            image?: string;
            emailVerified: boolean;
            [key: string]: any;
        };
        data: any;
    } | null>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    options: MicrosoftOptions;
};

interface GithubProfile {
    login: string;
    id: string;
    node_id: string;
    avatar_url: string;
    gravatar_id: string;
    url: string;
    html_url: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    received_events_url: string;
    type: string;
    site_admin: boolean;
    name: string;
    company: string;
    blog: string;
    location: string;
    email: string;
    hireable: boolean;
    bio: string;
    twitter_username: string;
    public_repos: string;
    public_gists: string;
    followers: string;
    following: string;
    created_at: string;
    updated_at: string;
    private_gists: string;
    total_private_repos: string;
    owned_private_repos: string;
    disk_usage: string;
    collaborators: string;
    two_factor_authentication: boolean;
    plan: {
        name: string;
        space: string;
        private_repos: string;
        collaborators: string;
    };
}
interface GithubOptions extends ProviderOptions<GithubProfile> {
}
declare const github: (options: GithubOptions) => {
    id: "github";
    name: string;
    createAuthorizationURL({ state, scopes, loginHint, redirectURI }: {
        state: string;
        codeVerifier: string;
        scopes?: string[];
        redirectURI: string;
        display?: string;
        loginHint?: string;
    }): Promise<URL>;
    validateAuthorizationCode: ({ code, redirectURI }: {
        code: string;
        redirectURI: string;
        codeVerifier?: string;
        deviceId?: string;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
        user?: {
            name?: {
                firstName?: string;
                lastName?: string;
            };
            email?: string;
        };
    }): Promise<{
        user: {
            id: string;
            name?: string;
            email?: string | null;
            image?: string;
            emailVerified: boolean;
            [key: string]: any;
        };
        data: any;
    } | null>;
    options: GithubOptions;
};

interface FacebookProfile {
    id: string;
    name: string;
    email: string;
    email_verified: boolean;
    picture: {
        data: {
            height: number;
            is_silhouette: boolean;
            url: string;
            width: number;
        };
    };
}
interface FacebookOptions extends ProviderOptions<FacebookProfile> {
    /**
     * Extend list of fields to retrieve from the Facebook user profile.
     *
     * @default ["id", "name", "email", "picture"]
     */
    fields?: string[];
    /**
     * The config id to use when undergoing oauth
     */
    configId?: string;
}
declare const facebook: (options: FacebookOptions) => {
    id: "facebook";
    name: string;
    createAuthorizationURL({ state, scopes, redirectURI, loginHint }: {
        state: string;
        codeVerifier: string;
        scopes?: string[];
        redirectURI: string;
        display?: string;
        loginHint?: string;
    }): Promise<URL>;
    validateAuthorizationCode: ({ code, redirectURI }: {
        code: string;
        redirectURI: string;
        codeVerifier?: string;
        deviceId?: string;
    }) => Promise<OAuth2Tokens>;
    verifyIdToken(token: string, nonce: string | undefined): Promise<boolean>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
        user?: {
            name?: {
                firstName?: string;
                lastName?: string;
            };
            email?: string;
        };
    }): Promise<{
        user: {
            id: string;
            name?: string;
            email?: string | null;
            image?: string;
            emailVerified: boolean;
            [key: string]: any;
        };
        data: any;
    } | null>;
    options: FacebookOptions;
};

interface DiscordProfile extends Record<string, any> {
    /** the user's id (i.e. the numerical snowflake) */
    id: string;
    /** the user's username, not unique across the platform */
    username: string;
    /** the user's Discord-tag */
    discriminator: string;
    /** the user's display name, if it is set  */
    global_name: string | null;
    /**
     * the user's avatar hash:
     * https://discord.com/developers/docs/reference#image-formatting
     */
    avatar: string | null;
    /** whether the user belongs to an OAuth2 application */
    bot?: boolean;
    /**
     * whether the user is an Official Discord System user (part of the urgent
     * message system)
     */
    system?: boolean;
    /** whether the user has two factor enabled on their account */
    mfa_enabled: boolean;
    /**
     * the user's banner hash:
     * https://discord.com/developers/docs/reference#image-formatting
     */
    banner: string | null;
    /** the user's banner color encoded as an integer representation of hexadecimal color code */
    accent_color: number | null;
    /**
     * the user's chosen language option:
     * https://discord.com/developers/docs/reference#locales
     */
    locale: string;
    /** whether the email on this account has been verified */
    verified: boolean;
    /** the user's email */
    email: string;
    /**
     * the flags on a user's account:
     * https://discord.com/developers/docs/resources/user#user-object-user-flags
     */
    flags: number;
    /**
     * the type of Nitro subscription on a user's account:
     * https://discord.com/developers/docs/resources/user#user-object-premium-types
     */
    premium_type: number;
    /**
     * the public flags on a user's account:
     * https://discord.com/developers/docs/resources/user#user-object-user-flags
     */
    public_flags: number;
    /** undocumented field; corresponds to the user's custom nickname */
    display_name: string | null;
    /**
     * undocumented field; corresponds to the Discord feature where you can e.g.
     * put your avatar inside of an ice cube
     */
    avatar_decoration: string | null;
    /**
     * undocumented field; corresponds to the premium feature where you can
     * select a custom banner color
     */
    banner_color: string | null;
    /** undocumented field; the CDN URL of their profile picture */
    image_url: string;
}
interface DiscordOptions extends ProviderOptions<DiscordProfile> {
    prompt?: "none" | "consent";
}
declare const discord: (options: DiscordOptions) => {
    id: "discord";
    name: string;
    createAuthorizationURL({ state, scopes, redirectURI }: {
        state: string;
        codeVerifier: string;
        scopes?: string[];
        redirectURI: string;
        display?: string;
        loginHint?: string;
    }): URL;
    validateAuthorizationCode: ({ code, redirectURI }: {
        code: string;
        redirectURI: string;
        codeVerifier?: string;
        deviceId?: string;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
        user?: {
            name?: {
                firstName?: string;
                lastName?: string;
            };
            email?: string;
        };
    }): Promise<{
        user: {
            id: string;
            name?: string;
            email?: string | null;
            image?: string;
            emailVerified: boolean;
            [key: string]: any;
        };
        data: any;
    } | null>;
    options: DiscordOptions;
};

interface AppleProfile {
    /**
     * The subject registered claim identifies the principal that’s the subject
     * of the identity token. Because this token is for your app, the value is
     * the unique identifier for the user.
     */
    sub: string;
    /**
     * A String value representing the user's email address.
     * The email address is either the user's real email address or the proxy
     * address, depending on their status private email relay service.
     */
    email: string;
    /**
     * A string or Boolean value that indicates whether the service verifies
     * the email. The value can either be a string ("true" or "false") or a
     * Boolean (true or false). The system may not verify email addresses for
     * Sign in with Apple at Work & School users, and this claim is "false" or
     * false for those users.
     */
    email_verified: true | "true";
    /**
     * A string or Boolean value that indicates whether the email that the user
     * shares is the proxy address. The value can either be a string ("true" or
     * "false") or a Boolean (true or false).
     */
    is_private_email: boolean;
    /**
     * An Integer value that indicates whether the user appears to be a real
     * person. Use the value of this claim to mitigate fraud. The possible
     * values are: 0 (or Unsupported), 1 (or Unknown), 2 (or LikelyReal). For
     * more information, see ASUserDetectionStatus. This claim is present only
     * in iOS 14 and later, macOS 11 and later, watchOS 7 and later, tvOS 14
     * and later. The claim isn’t present or supported for web-based apps.
     */
    real_user_status: number;
    /**
     * The user’s full name in the format provided during the authorization
     * process.
     */
    name: string;
    /**
     * The URL to the user's profile picture.
     */
    picture: string;
    user?: AppleNonConformUser;
}
/**
 * This is the shape of the `user` query parameter that Apple sends the first
 * time the user consents to the app.
 * @see https://developer.apple.com/documentation/signinwithapplerestapi/request-an-authorization-to-the-sign-in-with-apple-server./
 */
interface AppleNonConformUser {
    name: {
        firstName: string;
        lastName: string;
    };
    email: string;
}
interface AppleOptions extends ProviderOptions<AppleProfile> {
    appBundleIdentifier?: string;
}
declare const apple: (options: AppleOptions) => {
    id: "apple";
    name: string;
    createAuthorizationURL({ state, scopes, redirectURI }: {
        state: string;
        codeVerifier: string;
        scopes?: string[];
        redirectURI: string;
        display?: string;
        loginHint?: string;
    }): Promise<URL>;
    validateAuthorizationCode: ({ code, codeVerifier, redirectURI }: {
        code: string;
        redirectURI: string;
        codeVerifier?: string;
        deviceId?: string;
    }) => Promise<OAuth2Tokens>;
    verifyIdToken(token: string, nonce: string | undefined): Promise<boolean>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
        user?: {
            name?: {
                firstName?: string;
                lastName?: string;
            };
            email?: string;
        };
    }): Promise<{
        user: {
            id: string;
            name?: string;
            email?: string | null;
            image?: string;
            emailVerified: boolean;
            [key: string]: any;
        };
        data: any;
    } | null>;
    options: AppleOptions;
};
declare const getApplePublicKey: (kid: string) => Promise<Uint8Array<ArrayBufferLike> | jose.KeyLike>;

declare const socialProviders: {
    apple: (options: AppleOptions) => {
        id: "apple";
        name: string;
        createAuthorizationURL({ state, scopes, redirectURI }: {
            state: string;
            codeVerifier: string;
            scopes?: string[];
            redirectURI: string;
            display?: string;
            loginHint?: string;
        }): Promise<URL>;
        validateAuthorizationCode: ({ code, codeVerifier, redirectURI }: {
            code: string;
            redirectURI: string;
            codeVerifier?: string;
            deviceId?: string;
        }) => Promise<OAuth2Tokens>;
        verifyIdToken(token: string, nonce: string | undefined): Promise<boolean>;
        refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
        getUserInfo(token: OAuth2Tokens & {
            user?: {
                name?: {
                    firstName?: string;
                    lastName?: string;
                };
                email?: string;
            };
        }): Promise<{
            user: {
                id: string;
                name?: string;
                email?: string | null;
                image?: string;
                emailVerified: boolean;
                [key: string]: any;
            };
            data: any;
        } | null>;
        options: AppleOptions;
    };
    discord: (options: DiscordOptions) => {
        id: "discord";
        name: string;
        createAuthorizationURL({ state, scopes, redirectURI }: {
            state: string;
            codeVerifier: string;
            scopes?: string[];
            redirectURI: string;
            display?: string;
            loginHint?: string;
        }): URL;
        validateAuthorizationCode: ({ code, redirectURI }: {
            code: string;
            redirectURI: string;
            codeVerifier?: string;
            deviceId?: string;
        }) => Promise<OAuth2Tokens>;
        refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
        getUserInfo(token: OAuth2Tokens & {
            user?: {
                name?: {
                    firstName?: string;
                    lastName?: string;
                };
                email?: string;
            };
        }): Promise<{
            user: {
                id: string;
                name?: string;
                email?: string | null;
                image?: string;
                emailVerified: boolean;
                [key: string]: any;
            };
            data: any;
        } | null>;
        options: DiscordOptions;
    };
    facebook: (options: FacebookOptions) => {
        id: "facebook";
        name: string;
        createAuthorizationURL({ state, scopes, redirectURI, loginHint }: {
            state: string;
            codeVerifier: string;
            scopes?: string[];
            redirectURI: string;
            display?: string;
            loginHint?: string;
        }): Promise<URL>;
        validateAuthorizationCode: ({ code, redirectURI }: {
            code: string;
            redirectURI: string;
            codeVerifier?: string;
            deviceId?: string;
        }) => Promise<OAuth2Tokens>;
        verifyIdToken(token: string, nonce: string | undefined): Promise<boolean>;
        refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
        getUserInfo(token: OAuth2Tokens & {
            user?: {
                name?: {
                    firstName?: string;
                    lastName?: string;
                };
                email?: string;
            };
        }): Promise<{
            user: {
                id: string;
                name?: string;
                email?: string | null;
                image?: string;
                emailVerified: boolean;
                [key: string]: any;
            };
            data: any;
        } | null>;
        options: FacebookOptions;
    };
    github: (options: GithubOptions) => {
        id: "github";
        name: string;
        createAuthorizationURL({ state, scopes, loginHint, redirectURI }: {
            state: string;
            codeVerifier: string;
            scopes?: string[];
            redirectURI: string;
            display?: string;
            loginHint?: string;
        }): Promise<URL>;
        validateAuthorizationCode: ({ code, redirectURI }: {
            code: string;
            redirectURI: string;
            codeVerifier?: string;
            deviceId?: string;
        }) => Promise<OAuth2Tokens>;
        refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
        getUserInfo(token: OAuth2Tokens & {
            user?: {
                name?: {
                    firstName?: string;
                    lastName?: string;
                };
                email?: string;
            };
        }): Promise<{
            user: {
                id: string;
                name?: string;
                email?: string | null;
                image?: string;
                emailVerified: boolean;
                [key: string]: any;
            };
            data: any;
        } | null>;
        options: GithubOptions;
    };
    microsoft: (options: MicrosoftOptions) => {
        id: "microsoft";
        name: string;
        createAuthorizationURL(data: {
            state: string;
            codeVerifier: string;
            scopes?: string[];
            redirectURI: string;
            display?: string;
            loginHint?: string;
        }): Promise<URL>;
        validateAuthorizationCode({ code, codeVerifier, redirectURI }: {
            code: string;
            redirectURI: string;
            codeVerifier?: string;
            deviceId?: string;
        }): Promise<OAuth2Tokens>;
        getUserInfo(token: OAuth2Tokens & {
            user?: {
                name?: {
                    firstName?: string;
                    lastName?: string;
                };
                email?: string;
            };
        }): Promise<{
            user: {
                id: string;
                name?: string;
                email?: string | null;
                image?: string;
                emailVerified: boolean;
                [key: string]: any;
            };
            data: any;
        } | null>;
        refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
        options: MicrosoftOptions;
    };
    google: (options: GoogleOptions) => {
        id: "google";
        name: string;
        createAuthorizationURL({ state, scopes, codeVerifier, redirectURI, loginHint, display, }: {
            state: string;
            codeVerifier: string;
            scopes?: string[];
            redirectURI: string;
            display?: string;
            loginHint?: string;
        }): Promise<URL>;
        validateAuthorizationCode: ({ code, codeVerifier, redirectURI }: {
            code: string;
            redirectURI: string;
            codeVerifier?: string;
            deviceId?: string;
        }) => Promise<OAuth2Tokens>;
        refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
        verifyIdToken(token: string, nonce: string | undefined): Promise<boolean>;
        getUserInfo(token: OAuth2Tokens & {
            user?: {
                name?: {
                    firstName?: string;
                    lastName?: string;
                };
                email?: string;
            };
        }): Promise<{
            user: {
                id: string;
                name?: string;
                email?: string | null;
                image?: string;
                emailVerified: boolean;
                [key: string]: any;
            };
            data: any;
        } | null>;
        options: GoogleOptions;
    };
    spotify: (options: SpotifyOptions) => {
        id: "spotify";
        name: string;
        createAuthorizationURL({ state, scopes, codeVerifier, redirectURI }: {
            state: string;
            codeVerifier: string;
            scopes?: string[];
            redirectURI: string;
            display?: string;
            loginHint?: string;
        }): Promise<URL>;
        validateAuthorizationCode: ({ code, codeVerifier, redirectURI }: {
            code: string;
            redirectURI: string;
            codeVerifier?: string;
            deviceId?: string;
        }) => Promise<OAuth2Tokens>;
        refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
        getUserInfo(token: OAuth2Tokens & {
            user?: {
                name?: {
                    firstName?: string;
                    lastName?: string;
                };
                email?: string;
            };
        }): Promise<{
            user: {
                id: string;
                name?: string;
                email?: string | null;
                image?: string;
                emailVerified: boolean;
                [key: string]: any;
            };
            data: any;
        } | null>;
        options: SpotifyOptions;
    };
    twitch: (options: TwitchOptions) => {
        id: "twitch";
        name: string;
        createAuthorizationURL({ state, scopes, redirectURI }: {
            state: string;
            codeVerifier: string;
            scopes?: string[];
            redirectURI: string;
            display?: string;
            loginHint?: string;
        }): Promise<URL>;
        validateAuthorizationCode: ({ code, redirectURI }: {
            code: string;
            redirectURI: string;
            codeVerifier?: string;
            deviceId?: string;
        }) => Promise<OAuth2Tokens>;
        refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
        getUserInfo(token: OAuth2Tokens & {
            user?: {
                name?: {
                    firstName?: string;
                    lastName?: string;
                };
                email?: string;
            };
        }): Promise<{
            user: {
                id: string;
                name?: string;
                email?: string | null;
                image?: string;
                emailVerified: boolean;
                [key: string]: any;
            };
            data: any;
        } | null>;
        options: TwitchOptions;
    };
    twitter: (options: TwitterOption) => {
        id: "twitter";
        name: string;
        createAuthorizationURL(data: {
            state: string;
            codeVerifier: string;
            scopes?: string[];
            redirectURI: string;
            display?: string;
            loginHint?: string;
        }): Promise<URL>;
        validateAuthorizationCode: ({ code, codeVerifier, redirectURI }: {
            code: string;
            redirectURI: string;
            codeVerifier?: string;
            deviceId?: string;
        }) => Promise<OAuth2Tokens>;
        refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
        getUserInfo(token: OAuth2Tokens & {
            user?: {
                name?: {
                    firstName?: string;
                    lastName?: string;
                };
                email?: string;
            };
        }): Promise<{
            user: {
                id: string;
                name?: string;
                email?: string | null;
                image?: string;
                emailVerified: boolean;
                [key: string]: any;
            };
            data: any;
        } | null>;
        options: TwitterOption;
    };
    dropbox: (options: DropboxOptions) => {
        id: "dropbox";
        name: string;
        createAuthorizationURL: ({ state, scopes, codeVerifier, redirectURI, }: {
            state: string;
            codeVerifier: string;
            scopes?: string[];
            redirectURI: string;
            display?: string;
            loginHint?: string;
        }) => Promise<URL>;
        validateAuthorizationCode: ({ code, codeVerifier, redirectURI }: {
            code: string;
            redirectURI: string;
            codeVerifier?: string;
            deviceId?: string;
        }) => Promise<OAuth2Tokens>;
        refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
        getUserInfo(token: OAuth2Tokens & {
            user?: {
                name?: {
                    firstName?: string;
                    lastName?: string;
                };
                email?: string;
            };
        }): Promise<{
            user: {
                id: string;
                name?: string;
                email?: string | null;
                image?: string;
                emailVerified: boolean;
                [key: string]: any;
            };
            data: any;
        } | null>;
        options: DropboxOptions;
    };
    kick: (options: KickOptions) => {
        id: "kick";
        name: string;
        createAuthorizationURL({ state, scopes, redirectURI, codeVerifier }: {
            state: string;
            codeVerifier: string;
            scopes?: string[];
            redirectURI: string;
            display?: string;
            loginHint?: string;
        }): Promise<URL>;
        validateAuthorizationCode({ code, redirectURI, codeVerifier }: {
            code: string;
            redirectURI: string;
            codeVerifier?: string;
            deviceId?: string;
        }): Promise<OAuth2Tokens>;
        getUserInfo(token: OAuth2Tokens & {
            user?: {
                name?: {
                    firstName?: string;
                    lastName?: string;
                };
                email?: string;
            };
        }): Promise<{
            user: {
                id: string;
                name?: string;
                email?: string | null;
                image?: string;
                emailVerified: boolean;
                [key: string]: any;
            };
            data: any;
        } | null>;
        options: KickOptions;
    };
    linkedin: (options: LinkedInOptions) => {
        id: "linkedin";
        name: string;
        createAuthorizationURL: ({ state, scopes, redirectURI, loginHint, }: {
            state: string;
            codeVerifier: string;
            scopes?: string[];
            redirectURI: string;
            display?: string;
            loginHint?: string;
        }) => Promise<URL>;
        validateAuthorizationCode: ({ code, redirectURI }: {
            code: string;
            redirectURI: string;
            codeVerifier?: string;
            deviceId?: string;
        }) => Promise<OAuth2Tokens>;
        refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
        getUserInfo(token: OAuth2Tokens & {
            user?: {
                name?: {
                    firstName?: string;
                    lastName?: string;
                };
                email?: string;
            };
        }): Promise<{
            user: {
                id: string;
                name?: string;
                email?: string | null;
                image?: string;
                emailVerified: boolean;
                [key: string]: any;
            };
            data: any;
        } | null>;
        options: LinkedInOptions;
    };
    gitlab: (options: GitlabOptions) => {
        id: "gitlab";
        name: string;
        createAuthorizationURL: ({ state, scopes, codeVerifier, loginHint, redirectURI, }: {
            state: string;
            codeVerifier: string;
            scopes?: string[];
            redirectURI: string;
            display?: string;
            loginHint?: string;
        }) => Promise<URL>;
        validateAuthorizationCode: ({ code, redirectURI, codeVerifier }: {
            code: string;
            redirectURI: string;
            codeVerifier?: string;
            deviceId?: string;
        }) => Promise<OAuth2Tokens>;
        refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
        getUserInfo(token: OAuth2Tokens & {
            user?: {
                name?: {
                    firstName?: string;
                    lastName?: string;
                };
                email?: string;
            };
        }): Promise<{
            user: {
                id: string;
                name?: string;
                email?: string | null;
                image?: string;
                emailVerified: boolean;
                [key: string]: any;
            };
            data: any;
        } | null>;
        options: GitlabOptions;
    };
    tiktok: (options: TiktokOptions) => {
        id: "tiktok";
        name: string;
        createAuthorizationURL({ state, scopes, redirectURI }: {
            state: string;
            codeVerifier: string;
            scopes?: string[];
            redirectURI: string;
            display?: string;
            loginHint?: string;
        }): URL;
        validateAuthorizationCode: ({ code, redirectURI }: {
            code: string;
            redirectURI: string;
            codeVerifier?: string;
            deviceId?: string;
        }) => Promise<OAuth2Tokens>;
        refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
        getUserInfo(token: OAuth2Tokens & {
            user?: {
                name?: {
                    firstName?: string;
                    lastName?: string;
                };
                email?: string;
            };
        }): Promise<{
            user: {
                id: string;
                name?: string;
                email?: string | null;
                image?: string;
                emailVerified: boolean;
                [key: string]: any;
            };
            data: any;
        } | null>;
        options: TiktokOptions;
    };
    reddit: (options: RedditOptions) => {
        id: "reddit";
        name: string;
        createAuthorizationURL({ state, scopes, redirectURI }: {
            state: string;
            codeVerifier: string;
            scopes?: string[];
            redirectURI: string;
            display?: string;
            loginHint?: string;
        }): Promise<URL>;
        validateAuthorizationCode: ({ code, redirectURI }: {
            code: string;
            redirectURI: string;
            codeVerifier?: string;
            deviceId?: string;
        }) => Promise<OAuth2Tokens>;
        refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
        getUserInfo(token: OAuth2Tokens & {
            user?: {
                name?: {
                    firstName?: string;
                    lastName?: string;
                };
                email?: string;
            };
        }): Promise<{
            user: {
                id: string;
                name?: string;
                email?: string | null;
                image?: string;
                emailVerified: boolean;
                [key: string]: any;
            };
            data: any;
        } | null>;
        options: RedditOptions;
    };
    roblox: (options: RobloxOptions) => {
        id: "roblox";
        name: string;
        createAuthorizationURL({ state, scopes, redirectURI }: {
            state: string;
            codeVerifier: string;
            scopes?: string[];
            redirectURI: string;
            display?: string;
            loginHint?: string;
        }): URL;
        validateAuthorizationCode: ({ code, redirectURI }: {
            code: string;
            redirectURI: string;
            codeVerifier?: string;
            deviceId?: string;
        }) => Promise<OAuth2Tokens>;
        refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
        getUserInfo(token: OAuth2Tokens & {
            user?: {
                name?: {
                    firstName?: string;
                    lastName?: string;
                };
                email?: string;
            };
        }): Promise<{
            user: {
                id: string;
                name?: string;
                email?: string | null;
                image?: string;
                emailVerified: boolean;
                [key: string]: any;
            };
            data: any;
        } | null>;
        options: RobloxOptions;
    };
    vk: (options: VkOption) => {
        id: "vk";
        name: string;
        createAuthorizationURL({ state, scopes, codeVerifier, redirectURI }: {
            state: string;
            codeVerifier: string;
            scopes?: string[];
            redirectURI: string;
            display?: string;
            loginHint?: string;
        }): Promise<URL>;
        validateAuthorizationCode: ({ code, codeVerifier, redirectURI, deviceId, }: {
            code: string;
            redirectURI: string;
            codeVerifier?: string;
            deviceId?: string;
        }) => Promise<OAuth2Tokens>;
        refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
        getUserInfo(data: OAuth2Tokens & {
            user?: {
                name?: {
                    firstName?: string;
                    lastName?: string;
                };
                email?: string;
            };
        }): Promise<{
            user: {
                id: string;
                name?: string;
                email?: string | null;
                image?: string;
                emailVerified: boolean;
                [key: string]: any;
            };
            data: any;
        } | null>;
        options: VkOption;
    };
    zoom: (userOptions: ZoomOptions) => {
        id: "zoom";
        name: string;
        createAuthorizationURL: ({ state, redirectURI, codeVerifier }: {
            state: string;
            codeVerifier: string;
            scopes?: string[];
            redirectURI: string;
            display?: string;
            loginHint?: string;
        }) => Promise<URL>;
        validateAuthorizationCode: ({ code, redirectURI, codeVerifier }: {
            code: string;
            redirectURI: string;
            codeVerifier?: string;
            deviceId?: string;
        }) => Promise<OAuth2Tokens>;
        getUserInfo(token: OAuth2Tokens & {
            user?: {
                name?: {
                    firstName?: string;
                    lastName?: string;
                };
                email?: string;
            };
        }): Promise<{
            user: {
                id: string;
                name?: string;
                email?: string | null;
                image?: string;
                emailVerified: boolean;
                [key: string]: any;
            };
            data: any;
        } | null>;
    };
};
declare const socialProviderList: ["github", ...(keyof typeof socialProviders)[]];
declare const SocialProviderListEnum: z.ZodType<SocialProviderList[number] | (string & {})>;
type SocialProvider = z.infer<typeof SocialProviderListEnum>;
type SocialProviders = {
    [K in SocialProviderList[number]]?: Prettify<Parameters<(typeof socialProviders)[K]>[0] & {
        enabled?: boolean;
    }>;
};

type SocialProviderList = typeof socialProviderList;

export { twitter as E, dropbox as J, linkedin as N, gitlab as U, tiktok as X, reddit as _, roblox as a1, LANG as a3, vk as a5, zoom as ac, kick as af, socialProviderList as c, SocialProviderListEnum as d, github as g, google as j, apple as m, getApplePublicKey as n, microsoft as p, discord as r, socialProviders as s, spotify as v, twitch as x, facebook as z };
export type { RobloxProfile as $, AppleProfile as A, TwitterProfile as B, TwitterOption as C, DiscordProfile as D, FacebookProfile as F, GithubProfile as G, DropboxProfile as H, DropboxOptions as I, LinkedInOptions as K, LinkedInProfile as L, MicrosoftEntraIDProfile as M, OAuth2Tokens as O, ProviderOptions as P, GitlabProfile as Q, GitlabOptions as R, SocialProviders as S, TwitchProfile as T, TiktokProfile as V, TiktokOptions as W, RedditProfile as Y, RedditOptions as Z, OAuthProvider as a, RobloxOptions as a0, VkProfile as a2, VkOption as a4, LoginType as a6, AccountStatus as a7, PronounOption as a8, PhoneNumber as a9, ZoomProfile as aa, ZoomOptions as ab, KickProfile as ad, KickOptions as ae, SocialProviderList as b, SocialProvider as e, GithubOptions as f, GoogleProfile as h, GoogleOptions as i, AppleNonConformUser as k, AppleOptions as l, MicrosoftOptions as o, DiscordOptions as q, SpotifyProfile as t, SpotifyOptions as u, TwitchOptions as w, FacebookOptions as y };
