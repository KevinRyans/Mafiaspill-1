import { Router } from "express"
import { z } from "zod"
import { prisma } from "../db/client"
import { requireAuth } from "../middleware/auth"
import { requireNotJailed } from "../middleware/prison"
import { requireAlive } from "../middleware/alive"
import { antiBot } from "../middleware/antiBot"
import { minutesFromNow } from "../utils/time"
import { createNotification } from "../services/notifications"

const router = Router()

router.get("/actions", requireAuth, async (req, res) => {
  const now = new Date()
  await prisma.passiveRun.updateMany({
    where: { userId: req.user!.id, status: "active", endsAt: { lte: now } },
    data: { status: "ready" }
  })

  const actions = await prisma.passiveAction.findMany({ orderBy: { durationMinutes: "asc" } })
  const runs = await prisma.passiveRun.findMany({
    where: { userId: req.user!.id, status: { in: ["active", "ready"] } },
    orderBy: { endsAt: "asc" },
    include: { action: true }
  })
  return res.json({ actions, runs })
})

router.post("/start", requireAuth, requireNotJailed, requireAlive, antiBot(1500), async (req, res) => {
  const schema = z.object({ actionId: z.string().uuid() })
  const { actionId } = schema.parse(req.body)

  const action = await prisma.passiveAction.findUnique({ where: { id: actionId } })
  if (!action) {
    return res.status(404).json({ message: "Handling ikke funnet" })
  }

  const existing = await prisma.passiveRun.findFirst({
    where: { userId: req.user!.id, status: "active" }
  })
  if (existing) {
    return res.status(400).json({ message: "En passiv handling er allerede aktiv." })
  }

  const endsAt = minutesFromNow(action.durationMinutes)
  const run = await prisma.passiveRun.create({
    data: {
      userId: req.user!.id,
      actionId: action.id,
      endsAt,
      status: "active"
    }
  })

  await createNotification({
    userId: req.user!.id,
    type: "passive",
    category: "progress",
    title: `${action.name} startet`,
    body: `Fullfores ${action.durationMinutes} min. Du kan samle belonningen senere.`,
    icon: "timer"
  })

  return res.json({ run })
})

router.post("/claim", requireAuth, requireNotJailed, requireAlive, antiBot(1200), async (req, res) => {
  const schema = z.object({ runId: z.string().uuid() })
  const { runId } = schema.parse(req.body)

  const run = await prisma.passiveRun.findUnique({
    where: { id: runId },
    include: { action: true }
  })
  if (!run || run.userId !== req.user!.id) {
    return res.status(404).json({ message: "Økt ikke funnet" })
  }

  if (run.status === "claimed") {
    return res.status(400).json({ message: "Allerede hentet" })
  }

  if (run.endsAt > new Date()) {
    return res.status(400).json({ message: "Ikke ferdig enna" })
  }

  const rewardFiat = run.action.baseRewardFiat
  const rewardToken = run.action.baseRewardToken

  await prisma.$transaction(async (tx) => {
    await tx.passiveRun.update({
      where: { id: run.id },
      data: {
        status: "claimed",
        claimedAt: new Date(),
        rewardFiat,
        rewardToken,
        outcome: "success"
      }
    })

    await tx.profile.update({
      where: { userId: req.user!.id },
      data: {
        fiatBalance: { increment: rewardFiat },
        tokenBalance: { increment: rewardToken },
        lastPassiveAt: new Date()
      }
    })
  })

  await createNotification({
    userId: req.user!.id,
    type: "passive",
    category: "economy",
    title: "Passiv inntekt mottatt",
    body: `+${rewardFiat} USD og +${rewardToken} token`,
    icon: "wallet",
    priority: 2
  })

  return res.json({ success: true })
})

export default router
