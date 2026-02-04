import { Router } from "express"
import { z } from "zod"
import { prisma } from "../db/client"
import { requireAuth } from "../middleware/auth"
import { requireNotJailed } from "../middleware/prison"
import { requireAlive } from "../middleware/alive"
import { antiBot } from "../middleware/antiBot"
import { createNotification } from "../services/notifications"

const router = Router()

async function getEscrowReleased(contractId: string) {
  const released = await prisma.escrowTransaction.aggregate({
    where: { contractId, status: "released" },
    _sum: { amount: true }
  })
  return released._sum.amount || 0
}

router.get("/contracts", requireAuth, async (_req, res) => {
  const contracts = await prisma.contract.findMany({
    orderBy: { createdAt: "desc" },
    include: { creator: { select: { id: true, profile: true } }, city: true }
  })
  return res.json({ contracts })
})

router.post("/contracts", requireAuth, requireNotJailed, requireAlive, antiBot(1200), async (req, res) => {
  const schema = z.object({
    title: z.string().min(3),
    description: z.string().min(10),
    cityId: z.string().uuid(),
    durationHours: z.coerce.number().int().min(1),
    rewardType: z.enum(["fast", "per_unit"]),
    rewardTotal: z.coerce.number().int().min(1_000_000).max(1_900_000_000),
    rewardPerUnit: z.coerce.number().int().min(0).max(300_000_000)
  })
  const data = schema.parse(req.body)

  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } })
  if (!profile) {
    return res.status(404).json({ message: "Profil mangler" })
  }
  if (profile.fiatBalance < data.rewardTotal) {
    return res.status(400).json({ message: "Ikke nok USD til escrow" })
  }

  const contract = await prisma.$transaction(async (tx) => {
    await tx.profile.update({
      where: { userId: req.user!.id },
      data: { fiatBalance: profile.fiatBalance - data.rewardTotal }
    })

    const created = await tx.contract.create({
      data: {
        creatorId: req.user!.id,
        title: data.title,
        description: data.description,
        cityId: data.cityId,
        durationHours: data.durationHours,
        rewardType: data.rewardType,
        rewardTotal: data.rewardTotal,
        rewardPerUnit: data.rewardPerUnit
      }
    })

    await tx.escrowTransaction.create({
      data: {
        contractId: created.id,
        fromUserId: req.user!.id,
        amount: data.rewardTotal,
        status: "reserved"
      }
    })

    return created
  })

  await createNotification({
    userId: req.user!.id,
    type: "contract",
    category: "kontrakter",
    title: "Kontrakt opprettet",
    body: "Midler er reservert i escrow.",
    icon: "darknet"
  })

  return res.json({ contract })
})

router.post("/contracts/:id/accept", requireAuth, requireNotJailed, requireAlive, antiBot(1200), async (req, res) => {
  const { id } = req.params
  const contract = await prisma.contract.findUnique({ where: { id } })
  if (!contract) {
    return res.status(404).json({ message: "Kontrakt ikke funnet" })
  }
  if (contract.creatorId === req.user!.id) {
    return res.status(400).json({ message: "Du kan ikke ta egen kontrakt" })
  }

  const existing = await prisma.contractAssignment.findFirst({
    where: { contractId: id, userId: req.user!.id }
  })
  if (existing) {
    return res.status(400).json({ message: "Kontrakt er allerede tatt" })
  }

  const assignment = await prisma.contractAssignment.create({
    data: {
      contractId: id,
      userId: req.user!.id
    }
  })

  await createNotification({
    userId: req.user!.id,
    type: "contract",
    category: "kontrakter",
    title: "Kontrakt tatt",
    body: "Progresjon kan starte.",
    icon: "darknet"
  })

  await createNotification({
    userId: contract.creatorId,
    type: "contract",
    category: "kontrakter",
    title: "Utfører funnet",
    body: "En spiller har tatt kontrakten din.",
    icon: "signal"
  })

  return res.json({ assignment })
})

router.post("/contracts/:id/progress", requireAuth, requireNotJailed, requireAlive, antiBot(1200), async (req, res) => {
  const { id } = req.params
  const schema = z.object({ units: z.coerce.number().int().min(1).max(5) })
  const { units } = schema.parse(req.body)

  const contract = await prisma.contract.findUnique({ where: { id } })
  if (!contract) {
    return res.status(404).json({ message: "Kontrakt ikke funnet" })
  }

  const assignment = await prisma.contractAssignment.findFirst({
    where: { contractId: id, userId: req.user!.id }
  })
  if (!assignment) {
    return res.status(400).json({ message: "Du har ikke tatt denne kontrakten" })
  }

  const existing = await prisma.contractProgress.findFirst({
    where: { contractId: id, userId: req.user!.id }
  })

  const progress = existing
    ? await prisma.contractProgress.update({
        where: { id: existing.id },
        data: { units: { increment: units } }
      })
    : await prisma.contractProgress.create({
        data: { contractId: id, userId: req.user!.id, units }
      })

  let released = 0
  if (contract.rewardType === "per_unit" && contract.rewardPerUnit > 0) {
    const alreadyReleased = await getEscrowReleased(contract.id)
    const remaining = Math.max(contract.rewardTotal - alreadyReleased, 0)
    const payout = Math.min(remaining, units * contract.rewardPerUnit)

    if (payout > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.escrowTransaction.create({
          data: {
            contractId: contract.id,
            fromUserId: contract.creatorId,
            toUserId: req.user!.id,
            amount: payout,
            status: "released"
          }
        })

        const profile = await tx.profile.findUnique({ where: { userId: req.user!.id } })
        if (profile) {
          await tx.profile.update({
            where: { userId: req.user!.id },
            data: { fiatBalance: profile.fiatBalance + payout }
          })
        }
      })
      released = payout
    }
  }

  await createNotification({
    userId: req.user!.id,
    type: "contract",
    category: "kontrakter",
    title: "Progresjon registrert",
    body: `+${units} handlinger registrert.${released ? ` Utbetaling ${released}.` : ""}`,
    icon: "signal"
  })

  return res.json({ progress, released })
})

router.post("/contracts/:id/claim", requireAuth, requireNotJailed, requireAlive, antiBot(1200), async (req, res) => {
  const { id } = req.params
  const contract = await prisma.contract.findUnique({ where: { id } })
  if (!contract) {
    return res.status(404).json({ message: "Kontrakt ikke funnet" })
  }

  const assignment = await prisma.contractAssignment.findFirst({
    where: { contractId: id, userId: req.user!.id }
  })
  if (!assignment) {
    return res.status(400).json({ message: "Du har ikke tatt denne kontrakten" })
  }

  const alreadyReleased = await getEscrowReleased(contract.id)
  const remaining = Math.max(contract.rewardTotal - alreadyReleased, 0)
  if (remaining <= 0) {
    return res.status(400).json({ message: "Ingen escrow igjen" })
  }

  await prisma.$transaction(async (tx) => {
    await tx.escrowTransaction.create({
      data: {
        contractId: contract.id,
        fromUserId: contract.creatorId,
        toUserId: req.user!.id,
        amount: remaining,
        status: "released"
      }
    })

    const profile = await tx.profile.findUnique({ where: { userId: req.user!.id } })
    if (profile) {
      await tx.profile.update({
        where: { userId: req.user!.id },
        data: { fiatBalance: profile.fiatBalance + remaining }
      })
    }

    await tx.contract.update({
      where: { id: contract.id },
      data: { status: "closed" }
    })
  })

  await createNotification({
    userId: req.user!.id,
    type: "contract",
    category: "kontrakter",
    title: "Escrow utbetalt",
    body: "Utbetaling er overført.",
    icon: "wallet",
    priority: 2
  })

  return res.json({ success: true })
})

router.get("/escrow", requireAuth, async (req, res) => {
  const escrow = await prisma.escrowTransaction.findMany({
    where: {
      OR: [{ fromUserId: req.user!.id }, { toUserId: req.user!.id }]
    },
    orderBy: { createdAt: "desc" }
  })
  return res.json({ escrow })
})

router.post("/disputes", requireAuth, requireNotJailed, requireAlive, antiBot(1200), async (req, res) => {
  const schema = z.object({ contractId: z.string().uuid(), reason: z.string().min(10) })
  const data = schema.parse(req.body)

  const dispute = await prisma.dispute.create({
    data: {
      contractId: data.contractId,
      openedById: req.user!.id,
      reason: data.reason
    }
  })

  await createNotification({
    userId: req.user!.id,
    type: "contract",
    category: "sikkerhet",
    title: "Tvist opprettet",
    body: "Kontrollrommet vil vurdere saken.",
    icon: "warning",
    priority: 2
  })

  return res.json({ dispute })
})

router.get("/reputation/:userId", requireAuth, async (req, res) => {
  const { userId } = req.params
  const ratings = await prisma.reputationRating.findMany({
    where: { toUserId: userId },
    orderBy: { createdAt: "desc" }
  })
  const avg = ratings.length
    ? ratings.reduce((sum, rating) => sum + rating.score, 0) / ratings.length
    : 0

  return res.json({ ratings, average: Number(avg.toFixed(2)) })
})

router.post("/reputation", requireAuth, requireNotJailed, requireAlive, antiBot(1200), async (req, res) => {
  const schema = z.object({ toUserId: z.string().uuid(), score: z.coerce.number().int().min(1).max(5), note: z.string().optional() })
  const data = schema.parse(req.body)

  const rating = await prisma.reputationRating.create({
    data: {
      fromUserId: req.user!.id,
      toUserId: data.toUserId,
      score: data.score,
      note: data.note
    }
  })

  return res.json({ rating })
})

export default router
