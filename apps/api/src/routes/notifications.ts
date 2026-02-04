import { Router } from "express"
import { z } from "zod"
import { prisma } from "../db/client"
import { requireAuth } from "../middleware/auth"
import { revealNotificationsForUser } from "../services/notifications"

const router = Router()

router.get("/", requireAuth, async (req, res) => {
  await revealNotificationsForUser(req.user!.id)
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.id, hidden: false },
    orderBy: [{ createdAt: "desc" }],
    take: 50
  })
  return res.json({ notifications })
})

router.get("/unread", requireAuth, async (req, res) => {
  await revealNotificationsForUser(req.user!.id)
  const count = await prisma.notification.count({
    where: { userId: req.user!.id, readAt: null, hidden: false }
  })
  return res.json({ count })
})

router.post("/read", requireAuth, async (req, res) => {
  const schema = z.object({ ids: z.array(z.string().uuid()).min(1) })
  const { ids } = schema.parse(req.body)
  await prisma.notification.updateMany({
    where: { id: { in: ids }, userId: req.user!.id },
    data: { readAt: new Date() }
  })
  return res.json({ success: true })
})

export default router
