import "dotenv/config"
import fastify from "fastify"
import fastifyCookie from "@fastify/cookie"
import fastifyHelmet from "@fastify/helmet"
import fastifyRateLimit from "@fastify/rate-limit"
import fastifyExpress from "@fastify/express"
import { env, rateLimitEnabled } from "./config/env"
import { requestLogger } from "./config/logger"
import { createApp as createExpressApp } from "./app"
import { initSocket } from "./socket"
import { startScheduler } from "./jobs/scheduler"
import { logger } from "./config/logger"

  const app = fastify({ logger: true })

async function start() {
  await app.register(fastifyCookie)
  await app.register(fastifyHelmet)
  if (rateLimitEnabled) {
    await app.register(fastifyRateLimit, {
      max: env.RATE_LIMIT_MAX,
      timeWindow: env.RATE_LIMIT_WINDOW_MS
    })
  }

  await app.register(fastifyExpress)
  app.use(requestLogger)
  app.use(createExpressApp())

  app.get("/health", async () => ({ ok: true }))
  app.get("/", async () => ({ status: "ok", service: "mafiaspill-api" }))

  await app.ready()
  initSocket(app.server)
  startScheduler()

  await app.listen({ port: env.PORT, host: env.HOST })
  logger.info(`API running on port ${env.PORT}`)
}

start().catch((error) => {
  logger.error(error, "API failed to start")
  process.exit(1)
})
