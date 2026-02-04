import "dotenv/config"
import express from "express"
import cors from "cors"
import helmet from "helmet"
import cookieParser from "cookie-parser"
import "express-async-errors"
import { env, isAllowedOrigin } from "./config/env"
import { requestLogger } from "./config/logger"
import { apiLimiter } from "./middleware/rateLimit"
import { errorHandler } from "./middleware/error"
import routes from "./routes"

export function createApp() {
  const app = express()

  app.use(requestLogger)
  app.use(helmet())
  const originHandler = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (isAllowedOrigin(origin)) return callback(null, true)
    return callback(new Error("Not allowed by CORS"))
  }
  app.use(cors({ origin: originHandler, credentials: true }))
  app.use(cookieParser())
  app.use(express.json({ limit: "1mb" }))
  app.use((_req, res, next) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8")
    next()
  })
  app.use(apiLimiter)

  app.get("/health", (_req, res) => res.json({ ok: true }))
  app.get("/utf8", (_req, res) => res.json({ sample: "ÆØÅæøå" }))
  app.use(routes)
  app.use(errorHandler)

  return app
}
