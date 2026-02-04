import { NextFunction, Request, Response } from "express"
import { env, adminAllowlist } from "../config/env"
import { verifyAccessToken } from "../utils/jwt"
import { prisma } from "../db/client"

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing token" })
  }

  const token = header.replace("Bearer ", "")
  try {
    const payload = verifyAccessToken(token)
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, email: true }
    })
    if (!user) {
      return res.status(401).json({ message: "User not found" })
    }

    const activeBan = await prisma.banMute.findFirst({
      where: {
        userId: user.id,
        type: "ban",
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
      }
    })
    if (activeBan) {
      return res.status(403).json({ message: "Account banned" })
    }

    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" })
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header || !header.startsWith("Bearer ")) {
    return next()
  }
  const token = header.replace("Bearer ", "")
  try {
    const payload = verifyAccessToken(token)
    req.user = { id: payload.sub, role: payload.role as any, email: "" }
  } catch (error) {
    // ignore
  }
  next()
}

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" })
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient role" })
    }
    next()
  }
}

export function requireAdminIp(req: Request, res: Response, next: NextFunction) {
  if (!adminAllowlist.length) {
    return next()
  }
  const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() || req.ip
  if (!ip || !adminAllowlist.includes(ip)) {
    return res.status(403).json({ message: "Admin access restricted" })
  }
  next()
}

export function adminRoutePath() {
  return `/${env.ADMIN_ROUTE_PATH}`
}
