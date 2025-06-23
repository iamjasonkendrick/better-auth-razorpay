'use strict';

const jose = require('jose');

async function signJWT(payload, secret, expiresIn = 3600) {
  const jwt = await new jose.SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(Math.floor(Date.now() / 1e3) + expiresIn).sign(new TextEncoder().encode(secret));
  return jwt;
}

exports.signJWT = signJWT;
