import jwt, { type Secret, type SignOptions } from "jsonwebtoken"
import { env } from "../config/env"

export type AccessTokenPayload = {
  sub: string
  role: string
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
    issuer: env.TOKEN_ISSUER
  }
  return jwt.sign(payload, env.JWT_SECRET as Secret, options)
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_SECRET, {
    issuer: env.TOKEN_ISSUER
  }) as AccessTokenPayload
}

export function signRefreshToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"],
    issuer: env.TOKEN_ISSUER
  }
  return jwt.sign(payload, env.JWT_REFRESH_SECRET as Secret, options)
}

export function verifyRefreshToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, {
    issuer: env.TOKEN_ISSUER
  }) as AccessTokenPayload
}
