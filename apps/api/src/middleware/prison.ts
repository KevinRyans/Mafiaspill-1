import { prisma } from "../db/client"

export async function requireNotJailed(req: any, res: any, next: any) {
  const record = await prisma.prisonInmate.findUnique({ where: { userId: req.user!.id } })
  if (record) {
    if (record.jailedUntil > new Date()) {
      return res.status(403).json({
        message: "Du sitter i fengsel",
        jailedUntil: record.jailedUntil.getTime()
      })
    }
    await prisma.prisonInmate.delete({ where: { userId: req.user!.id } })
  }
  return next()
}
