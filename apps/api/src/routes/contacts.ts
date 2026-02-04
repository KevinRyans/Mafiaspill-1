import { Router } from "express"
import { z } from "zod"
import { prisma } from "../db/client"
import { requireAuth } from "../middleware/auth"
import { antiBot } from "../middleware/antiBot"
import { createNotification } from "../services/notifications"
import { unlockAchievement } from "../services/achievements"

const router = Router()

router.get("/", requireAuth, async (req, res) => {
  const contacts = await prisma.contact.findMany({ include: { city: true } })
  const relations = await prisma.userContact.findMany({
    where: { userId: req.user!.id },
    include: { contact: true }
  })

  return res.json({ contacts, relations })
})

router.post("/link", requireAuth, antiBot(1200), async (req, res) => {
  const schema = z.object({ contactId: z.string().uuid() })
  const { contactId } = schema.parse(req.body)

  const contact = await prisma.contact.findUnique({ where: { id: contactId } })
  if (!contact) {
    return res.status(404).json({ message: "Kontakt ikke funnet" })
  }

  const relation = await prisma.userContact.upsert({
    where: { userId_contactId: { userId: req.user!.id, contactId } },
    update: {},
    create: {
      userId: req.user!.id,
      contactId,
      trust: 40,
      loyalty: contact.loyaltyBase
    }
  })

  await createNotification({
    userId: req.user!.id,
    type: "contact",
    category: "social",
    title: `Ny kontakt: ${contact.name}`,
    body: "Relasjonen er etablert. Bygg tillit for nye fordeler.",
    icon: contact.icon || "network"
  })

  const total = await prisma.userContact.count({ where: { userId: req.user!.id } })
  if (total >= 3) {
    await unlockAchievement(req.user!.id, "silent-network")
  }

  return res.json({ relation })
})

router.post("/boost", requireAuth, antiBot(1200), async (req, res) => {
  const schema = z.object({ contactId: z.string().uuid(), trust: z.coerce.number().int().min(1).max(10) })
  const { contactId, trust } = schema.parse(req.body)

  const relation = await prisma.userContact.findUnique({
    where: { userId_contactId: { userId: req.user!.id, contactId } },
    include: { contact: true }
  })
  if (!relation) {
    return res.status(404).json({ message: "Kontakt ikke funnet" })
  }

  const updated = await prisma.userContact.update({
    where: { id: relation.id },
    data: {
      trust: Math.min(100, relation.trust + trust),
      loyalty: Math.min(100, relation.loyalty + Math.ceil(trust / 2)),
      lastEventAt: new Date()
    }
  })

  await createNotification({
    userId: req.user!.id,
    type: "contact",
    category: "social",
    title: `${relation.contact.name} responderer positivt`,
    body: "Tillit og lojalitet oker. Nye oppdrag kan bli tilgjengelig.",
    icon: relation.contact.icon || "signal"
  })

  return res.json({ relation: updated })
})

router.post("/abuse", requireAuth, antiBot(1200), async (req, res) => {
  const schema = z.object({ contactId: z.string().uuid() })
  const { contactId } = schema.parse(req.body)

  const relation = await prisma.userContact.findUnique({
    where: { userId_contactId: { userId: req.user!.id, contactId } },
    include: { contact: true }
  })
  if (!relation) {
    return res.status(404).json({ message: "Kontakt ikke funnet" })
  }

  const loyaltyDrop = 12
  const updated = await prisma.userContact.update({
    where: { id: relation.id },
    data: {
      loyalty: Math.max(0, relation.loyalty - loyaltyDrop),
      trust: Math.max(0, relation.trust - Math.ceil(loyaltyDrop / 2)),
      lastEventAt: new Date()
    }
  })

  await createNotification({
    userId: req.user!.id,
    type: "contact",
    category: "risk",
    title: `${relation.contact.name} er skeptisk`,
    body: "Du presset kontakten. Risiko for svik oker.",
    icon: "warning",
    priority: 2
  })

  return res.json({ relation: updated })
})

export default router
