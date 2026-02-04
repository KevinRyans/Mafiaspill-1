import { Router } from "express"
import { z } from "zod"
import { prisma } from "../db/client"
import { requireAuth } from "../middleware/auth"
import { antiBot } from "../middleware/antiBot"
import { slugify } from "../utils/slug"
import { emitToCrew } from "../socket/hub"
import { createNotification } from "../services/notifications"
import { unlockAchievement } from "../services/achievements"

const router = Router()

const rankPower: Record<string, number> = {
  recruit: 1,
  associate: 2,
  operator: 3,
  strategist: 4,
  captain: 5,
  boss: 6
}

router.get("/", requireAuth, async (req, res) => {
  const membership = await prisma.crewMember.findFirst({ where: { userId: req.user!.id } })
  if (membership) {
    const crew = await prisma.crew.findUnique({
      where: { id: membership.crewId },
      include: { members: { include: { user: { select: { id: true, email: true } } } } }
    })
    return res.json({ crew, membership })
  }

  const crews = await prisma.crew.findMany({ where: { recruitmentOpen: true } })
  return res.json({ crews })
})

router.post("/", requireAuth, antiBot(1500), async (req, res) => {
  const schema = z.object({ name: z.string().min(3).max(30), description: z.string().min(10).max(200) })
  const { name, description } = schema.parse(req.body)
  const slug = slugify(name)

  const existing = await prisma.crew.findUnique({ where: { slug } })
  if (existing) {
    return res.status(409).json({ message: "Crew name taken" })
  }

  const crew = await prisma.crew.create({
    data: {
      name,
      slug,
      description,
      leaderId: req.user!.id,
      members: { create: { userId: req.user!.id, rank: "boss" } }
    }
  })

  await createNotification({
    userId: req.user!.id,
    type: "crew",
    category: "crew",
    title: "Crew opprettet",
    body: `Du leder ${crew.name}. Rekrutter medlemmer for bonus.`,
    icon: "crew"
  })

  return res.status(201).json({ crew })
})

router.post("/join/:crewId", requireAuth, antiBot(1500), async (req, res) => {
  const { crewId } = req.params
  const crew = await prisma.crew.findUnique({ where: { id: crewId } })
  if (!crew || !crew.recruitmentOpen) {
    return res.status(404).json({ message: "Crew ikke tilgjengelig" })
  }

  const existing = await prisma.crewMember.findFirst({ where: { userId: req.user!.id } })
  if (existing) {
    return res.status(400).json({ message: "Already in a crew" })
  }

  const member = await prisma.crewMember.create({
    data: { crewId, userId: req.user!.id, rank: "recruit" }
  })

  emitToCrew(crewId, "crew:member:join", { userId: req.user!.id })

  await createNotification({
    userId: req.user!.id,
    type: "crew",
    category: "crew",
    title: `Du ble med i ${crew.name}`,
    body: "Crew-chat og bank er tilgjengelig.",
    icon: "crew"
  })

  return res.json({ member })
})

router.post("/bank/deposit", requireAuth, antiBot(1500), async (req, res) => {
  const schema = z.object({ amountFiat: z.coerce.number().int().min(0), amountToken: z.coerce.number().int().min(0) })
  const { amountFiat, amountToken } = schema.parse(req.body)
  const membership = await prisma.crewMember.findFirst({ where: { userId: req.user!.id } })
  if (!membership) {
    return res.status(400).json({ message: "Du er ikke i et crew" })
  }

  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } })
  if (!profile) {
    return res.status(404).json({ message: "Profil mangler" })
  }

  if (profile.fiatBalance < amountFiat || profile.tokenBalance < amountToken) {
    return res.status(400).json({ message: "Ikke nok midler" })
  }

  const crew = await prisma.crew.update({
    where: { id: membership.crewId },
    data: {
      bankFiat: { increment: amountFiat },
      bankToken: { increment: amountToken }
    }
  })

  await prisma.profile.update({
    where: { userId: req.user!.id },
    data: {
      fiatBalance: profile.fiatBalance - amountFiat,
      tokenBalance: profile.tokenBalance - amountToken
    }
  })

  await prisma.crewBankTransaction.create({
    data: {
      crewId: membership.crewId,
      userId: req.user!.id,
      type: "deposit",
      amountFiat,
      amountToken,
      reason: "Crew deposit"
    }
  })

  emitToCrew(membership.crewId, "crew:bank:update", { bankFiat: crew.bankFiat, bankToken: crew.bankToken })

  await createNotification({
    userId: req.user!.id,
    type: "crew",
    category: "crew",
    title: "Bidrag sendt",
    body: `Du bidro ${amountFiat} USD og ${amountToken} token til crew-bank.`,
    icon: "wallet"
  })

  await unlockAchievement(req.user!.id, "crew-loyal")

  return res.json({ crew })
})

router.post("/bank/withdraw", requireAuth, antiBot(1500), async (req, res) => {
  const schema = z.object({ amountFiat: z.coerce.number().int().min(0), amountToken: z.coerce.number().int().min(0) })
  const { amountFiat, amountToken } = schema.parse(req.body)
  const membership = await prisma.crewMember.findFirst({ where: { userId: req.user!.id } })
  if (!membership) {
    return res.status(400).json({ message: "Du er ikke i et crew" })
  }

  const power = rankPower[membership.rank] || 0
  if (power < rankPower.strategist) {
    return res.status(403).json({ message: "For lav crew-rang" })
  }

  const crew = await prisma.crew.findUnique({ where: { id: membership.crewId } })
  if (!crew) {
    return res.status(404).json({ message: "Crew missing" })
  }

  if (crew.bankFiat < amountFiat || crew.bankToken < amountToken) {
    return res.status(400).json({ message: "Crew bank insufficient" })
  }

  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } })
  if (!profile) {
    return res.status(404).json({ message: "Profil mangler" })
  }

  const updatedCrew = await prisma.crew.update({
    where: { id: crew.id },
    data: {
      bankFiat: crew.bankFiat - amountFiat,
      bankToken: crew.bankToken - amountToken
    }
  })

  await prisma.profile.update({
    where: { userId: req.user!.id },
    data: {
      fiatBalance: profile.fiatBalance + amountFiat,
      tokenBalance: profile.tokenBalance + amountToken
    }
  })

  await prisma.crewBankTransaction.create({
    data: {
      crewId: crew.id,
      userId: req.user!.id,
      type: "withdraw",
      amountFiat,
      amountToken,
      reason: "Crew withdrawal"
    }
  })

  emitToCrew(crew.id, "crew:bank:update", { bankFiat: updatedCrew.bankFiat, bankToken: updatedCrew.bankToken })

  await createNotification({
    userId: req.user!.id,
    type: "crew",
    category: "crew",
    title: "Uttak fullført",
    body: `Du tok ut ${amountFiat} USD og ${amountToken} token.`,
    icon: "wallet"
  })

  return res.json({ crew: updatedCrew })
})

router.get("/chat", requireAuth, async (req, res) => {
  const membership = await prisma.crewMember.findFirst({ where: { userId: req.user!.id } })
  if (!membership) {
    return res.status(400).json({ message: "Du er ikke i et crew" })
  }
  const messages = await prisma.chatMessage.findMany({
    where: { crewId: membership.crewId, channel: "crew" },
    include: { user: { select: { id: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 50
  })
  return res.json({ messages })
})

router.post("/chat", requireAuth, antiBot(800), async (req, res) => {
  const schema = z.object({ message: z.string().min(1).max(240) })
  const { message } = schema.parse(req.body)
  const membership = await prisma.crewMember.findFirst({ where: { userId: req.user!.id } })
  if (!membership) {
    return res.status(400).json({ message: "Du er ikke i et crew" })
  }

  const chatMessage = await prisma.chatMessage.create({
    data: {
      crewId: membership.crewId,
      userId: req.user!.id,
      channel: "crew",
      message
    },
    include: { user: { select: { id: true, email: true } } }
  })

  emitToCrew(membership.crewId, "crew:chat", chatMessage)

  return res.status(201).json({ message: chatMessage })
})

export default router
