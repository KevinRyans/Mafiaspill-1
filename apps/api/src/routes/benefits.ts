import { Router } from "express"
import { z } from "zod"
import { prisma } from "../db/client"
import { requireAuth } from "../middleware/auth"
import { requireNotJailed } from "../middleware/prison"
import { requireAlive } from "../middleware/alive"
import { antiBot } from "../middleware/antiBot"
import { createNotification } from "../services/notifications"

const router = Router()

type Benefit = {
  id: string
  name: string
  description: string
  type: "respect" | "compliance" | "defense" | "health"
  amount: number
  costFiat?: number
  costToken?: number
}

const BENEFITS: Benefit[] = [
  {
    id: "respekt-liten",
    name: "Respektpakke: Liten",
    description: "+5 respekt for å låse opp fordeler.",
    type: "respect",
    amount: 5,
    costFiat: 150_000_000
  },
  {
    id: "respekt-medium",
    name: "Respektpakke: Medium",
    description: "+20 respekt, perfekt for oppgraderinger.",
    type: "respect",
    amount: 20,
    costFiat: 500_000_000
  },
  {
    id: "respekt-token",
    name: "Respektpakke: Token",
    description: "+15 respekt mot token.",
    type: "respect",
    amount: 15,
    costToken: 250
  },
  {
    id: "compliance-skjold",
    name: "Compliance-skjold",
    description: "+10 compliance for lavere risiko.",
    type: "compliance",
    amount: 10,
    costFiat: 200_000_000
  },
  {
    id: "compliance-token",
    name: "Compliance-skjold (Token)",
    description: "+12 compliance mot token.",
    type: "compliance",
    amount: 12,
    costToken: 180
  },
  {
    id: "forsvar-livvakt",
    name: "Livvakter",
    description: "+25000 forsvar (livvaktpoeng).",
    type: "defense",
    amount: 25000,
    costFiat: 300_000_000
  },
  {
    id: "forsvar-token",
    name: "Livvakter (Token)",
    description: "+40000 forsvar mot token.",
    type: "defense",
    amount: 40000,
    costToken: 280
  },
  {
    id: "helse-pakke",
    name: "Medisinsk pakke",
    description: "+10 liv.",
    type: "health",
    amount: 10,
    costFiat: 60_000_000
  }
]

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

router.get("/", requireAuth, async (_req, res) => {
  return res.json({ benefits: BENEFITS })
})

router.post("/buy", requireAuth, requireNotJailed, requireAlive, antiBot(1200), async (req, res) => {
  const schema = z.object({
    benefitId: z.string(),
    currency: z.enum(["fiat", "token"]).optional()
  })
  const { benefitId, currency } = schema.parse(req.body)
  const benefit = BENEFITS.find((item) => item.id === benefitId)
  if (!benefit) {
    return res.status(404).json({ message: "Tilbud ikke funnet" })
  }

  const selectedCurrency =
    currency ??
    (benefit.costFiat ? "fiat" : benefit.costToken ? "token" : undefined)

  if (!selectedCurrency) {
    return res.status(400).json({ message: "Ingen gyldig betalingsmetode valgt" })
  }

  const cost =
    selectedCurrency === "fiat" ? benefit.costFiat : benefit.costToken

  if (!cost || cost <= 0) {
    return res.status(400).json({ message: "Tilbudet kan ikke kjøpes med valgt valuta" })
  }

  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } })
  if (!profile) {
    return res.status(404).json({ message: "Profil ikke funnet" })
  }

  if (selectedCurrency === "fiat" && profile.fiatBalance < cost) {
    return res.status(400).json({ message: "Ikke nok USD" })
  }

  if (selectedCurrency === "token" && profile.tokenBalance < cost) {
    return res.status(400).json({ message: "Ikke nok token" })
  }

  const updated = await prisma.profile.update({
    where: { userId: req.user!.id },
    data: {
      fiatBalance:
        selectedCurrency === "fiat" ? profile.fiatBalance - cost : profile.fiatBalance,
      tokenBalance:
        selectedCurrency === "token" ? profile.tokenBalance - cost : profile.tokenBalance,
      respect:
        benefit.type === "respect" ? profile.respect + benefit.amount : profile.respect,
      compliance:
        benefit.type === "compliance"
          ? clamp(profile.compliance + benefit.amount, 0, 100)
          : profile.compliance,
      defense:
        benefit.type === "defense" ? clamp(profile.defense + benefit.amount, 0, 5_000_000) : profile.defense,
      health:
        benefit.type === "health" ? clamp(profile.health + benefit.amount, 0, 100) : profile.health
    }
  })

  await prisma.benefitPurchase.create({
    data: {
      userId: req.user!.id,
      benefitCode: benefit.id,
      benefitType: benefit.type,
      amount: benefit.amount,
      currency: selectedCurrency,
      cost
    }
  })

  await createNotification({
    userId: req.user!.id,
    type: "benefit",
    category: "system",
    title: "Fordel kjøpt",
    body: `${benefit.name} aktivert.`,
    icon: "check",
    priority: 1
  })

  return res.json({ profile: updated, benefit })
})

export default router
