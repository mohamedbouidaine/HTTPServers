import { UnauthorizedError } from "./index.js"
import argon2 from "argon2";
import jwt, { JwtPayload } from "jsonwebtoken";
import { Request } from "express";
import crypto from "crypto";
export async function hashPassword(password: string): Promise<string>{
return await argon2.hash(password);;
}

export async function checkPasswordHash(password: string, hash: string): Promise<boolean>{
   return await argon2.verify(hash, password);
}

type payload = Pick<JwtPayload, "iss" | "sub" | "iat" | "exp">;
export function makeJWT(userID: string, expiresIn: number, secret: string): string{
   const iat = Math.floor(Date.now() / 1000);

const payload: payload = {
    iss: "chirpy",
    sub: userID,
    iat: iat,
    exp: iat + expiresIn,
  };

  return jwt.sign(payload, secret);
}

export function validateJWT(tokenString: string, secret: string): string {
  try {
    const decoded = jwt.verify(tokenString, secret) as JwtPayload;

    if (!decoded.sub || typeof decoded.sub !== "string") {
      throw new UnauthorizedError("Invalid or expired token");
    }

    return decoded.sub;
  } catch {
    throw new UnauthorizedError("Invalid or expired token");
  }
}
export function getBearerToken(req: Request): string {
  const auth = req.header("Authorization");
  if (!auth) {
    throw new UnauthorizedError("Invalid or expired token");
  }

  const [type, token] = auth.split(" ");
  if (type !== "Bearer" || !token) {
    throw new UnauthorizedError("Invalid or expired token");
  }

  return token;
}

export function makeRefreshToken(): string {
  const random = crypto.randomBytes(32);
  return random.toString("hex");
}

export function getAPIKey(req: Request): string {
  const auth = req.header("Authorization");

  if (!auth) {
    throw new UnauthorizedError("Invalid or expired token");
  }

  const [type, key] = auth.split(" ");

  if (type !== "ApiKey" || !key) {
    throw new UnauthorizedError("Invalid or expired token");
  }

  return key;
}