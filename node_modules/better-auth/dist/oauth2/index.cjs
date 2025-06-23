'use strict';

const refreshAccessToken = require('../shared/better-auth.6XyKj7DG.cjs');
const state = require('../shared/better-auth.CWJ7qc0w.cjs');
require('@better-auth/utils/base64');
require('@better-fetch/fetch');
require('jose');
require('../shared/better-auth.C1hdVENX.cjs');
require('@better-auth/utils/hash');
require('zod');
require('better-call');
require('@noble/ciphers/chacha');
require('@noble/ciphers/utils');
require('@noble/ciphers/webcrypto');
require('@noble/hashes/scrypt');
require('@better-auth/utils');
require('@better-auth/utils/hex');
require('@noble/hashes/utils');
require('../shared/better-auth.CYeOI8C-.cjs');
require('@better-auth/utils/random');



exports.createAuthorizationURL = refreshAccessToken.createAuthorizationURL;
exports.encodeOAuthParameter = refreshAccessToken.encodeOAuthParameter;
exports.generateCodeChallenge = refreshAccessToken.generateCodeChallenge;
exports.getOAuth2Tokens = refreshAccessToken.getOAuth2Tokens;
exports.refreshAccessToken = refreshAccessToken.refreshAccessToken;
exports.validateAuthorizationCode = refreshAccessToken.validateAuthorizationCode;
exports.validateToken = refreshAccessToken.validateToken;
exports.generateState = state.generateState;
exports.parseState = state.parseState;
