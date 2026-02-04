import pino from "pino"
import pinoHttp from "pino-http"
import { isProd } from "./env"

export const logger = pino({
  level: isProd ? "info" : "debug"
})

export const requestLogger = pinoHttp()
