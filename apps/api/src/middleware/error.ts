import { NextFunction, Request, Response } from "express"
import { ZodError } from "zod"
import { logger } from "../config/logger"

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ message: "Validation error", issues: err.issues })
  }

  logger.error({ err }, "Unhandled error")
  res.status(500).json({ message: "Server error" })
}
