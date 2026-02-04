import { NextFunction, Request, Response } from "express"
import { env } from "../config/env"
import { prisma } from "../db/client"

export function antiBot(cooldownMs = 1200) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const proof = req.headers["x-human-proof"] as string | undefined
    if (!proof || proof !== env.PROOF_OF_WORK_SECRET) {
      return res.status(428).json({ message: "Missing human-proof header (placeholder)." })
    }
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" })
    }

    const profile = await prisma.profile.findUnique({ where: { userId: req.user.id } })
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" })
    }

    if (profile.lastActionAt) {
      const delta = Date.now() - profile.lastActionAt.getTime()
      if (delta < cooldownMs) {
        return res.status(429).json({ message: "Action cooldown active. Slow down." })
      }
    }

    await prisma.profile.update({
      where: { userId: req.user.id },
      data: { lastActionAt: new Date() }
    })

    next()
  }
}
