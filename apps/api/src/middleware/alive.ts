import { prisma } from "../db/client"

export async function requireAlive(req: any, res: any, next: any) {
  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } })
  if (!profile) {
    return res.status(404).json({ message: "Profil ikke funnet" })
  }

  if (profile.downUntil && profile.downUntil > new Date()) {
    return res.status(403).json({
      message: "Du er satt ut av spill midlertidig",
      downUntil: profile.downUntil.getTime()
    })
  }

  if (profile.downUntil && profile.downUntil <= new Date()) {
    await prisma.profile.update({
      where: { userId: req.user!.id },
      data: { downUntil: null }
    })
  }

  return next()
}
