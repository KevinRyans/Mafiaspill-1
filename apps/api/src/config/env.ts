import { z } from "zod"

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
  APP_ENV: z.enum(["development", "test", "production"]).optional(),
  HOST: z.string().default("::"),
  PORT: z.coerce.number().default(4000),
  APP_URL: z.string().default("http://localhost:5173"),
  API_URL: z.string().default("http://localhost:4000"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(10),
  JWT_REFRESH_SECRET: z.string().min(10),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  TOKEN_ISSUER: z.string().default("mafiaspill"),
  ADMIN_ROUTE_PATH: z.string().default("control-room-7f3b9"),
  ADMIN_IP_ALLOWLIST: z.string().optional(),
  PROOF_OF_WORK_SECRET: z.string().default("dev-proof"),
  RATE_LIMIT_ENABLED: z
    .preprocess((value) => {
      if (typeof value === "string") {
        return value.toLowerCase() === "true"
      }
      return value
    }, z.boolean())
    .optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(10)
})

export const env = EnvSchema.parse(process.env)

export const runtimeEnv = env.APP_ENV ?? env.NODE_ENV ?? "development"

export const adminAllowlist = env.ADMIN_IP_ALLOWLIST
  ? env.ADMIN_IP_ALLOWLIST.split(",").map((entry) => entry.trim()).filter(Boolean)
  : []

export const isProd = runtimeEnv === "production"

export const rateLimitEnabled = env.RATE_LIMIT_ENABLED ?? isProd

export const corsOrigins = env.CORS_ORIGIN.split(",")
  .map((entry) => entry.trim())
  .filter(Boolean)

export function isAllowedOrigin(origin?: string | null) {
  if (!origin) return true
  if (corsOrigins.includes(origin)) return true
  if (!isProd && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true
  return false
}
