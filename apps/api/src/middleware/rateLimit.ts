import rateLimit from "express-rate-limit"
import { env, rateLimitEnabled } from "../config/env"

export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: rateLimitEnabled ? env.RATE_LIMIT_MAX : env.RATE_LIMIT_MAX * 100,
  skip: () => !rateLimitEnabled,
  standardHeaders: true,
  legacyHeaders: false
})

export const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  skip: () => !rateLimitEnabled,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many auth attempts. Try again later."
})
