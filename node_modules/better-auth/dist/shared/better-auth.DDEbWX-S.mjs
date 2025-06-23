import { SignJWT } from 'jose';

async function signJWT(payload, secret, expiresIn = 3600) {
  const jwt = await new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(Math.floor(Date.now() / 1e3) + expiresIn).sign(new TextEncoder().encode(secret));
  return jwt;
}

export { signJWT as s };
