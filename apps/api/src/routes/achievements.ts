import { Router } from "express"
import { prisma } from "../db/client"
import { requireAuth } from "../middleware/auth"

const router = Router()

router.get("/", requireAuth, async (req, res) => {
  const achievements = await prisma.achievement.findMany({ orderBy: { points: "desc" } })
  const unlocked = await prisma.userAchievement.findMany({
    where: { userId: req.user!.id },
    include: { achievement: true }
  })

  return res.json({ achievements, unlocked })
})

export default router
