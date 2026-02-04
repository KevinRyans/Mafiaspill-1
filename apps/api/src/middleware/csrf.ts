import { NextFunction, Request, Response } from "express"
import { safeEqual } from "../utils/security"

export function requireCsrf(req: Request, res: Response, next: NextFunction) {
  const cookieToken = req.cookies?.csrf_token
  const headerToken = req.headers["x-csrf"] as string | undefined

  if (!cookieToken || !headerToken) {
    return res.status(403).json({ message: "Missing CSRF token" })
  }

  if (!safeEqual(cookieToken, headerToken)) {
    return res.status(403).json({ message: "Invalid CSRF token" })
  }

  next()
}
