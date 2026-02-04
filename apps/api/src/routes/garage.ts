import { Router } from "express"
import { prisma } from "../db/client"
import { requireAuth } from "../middleware/auth"

const router = Router()

router.get("/", requireAuth, async (req, res) => {
  const cars = await prisma.garageCar.findMany({
    where: { userId: req.user!.id },
    include: { carModel: true },
    orderBy: { acquiredAt: "desc" }
  })
  return res.json({ cars })
})

export default router
