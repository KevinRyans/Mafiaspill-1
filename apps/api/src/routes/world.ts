import { Router } from "express"
import { prisma } from "../db/client"
import { requireAuth } from "../middleware/auth"

const router = Router()

let stateCache: { data: any; expiresAt: number } | null = null
let feedCache: { data: any; expiresAt: number } | null = null

router.get("/events", requireAuth, async (req, res) => {
  const events = await prisma.worldEvent.findMany({ where: { active: true } })
  return res.json({ events })
})

router.get("/state", requireAuth, async (req, res) => {
  const now = Date.now()
  if (stateCache && stateCache.expiresAt > now) {
    return res.json(stateCache.data)
  }
  const cities = await prisma.city.findMany({ orderBy: { name: "asc" } })
  const events = await prisma.worldEvent.findMany({ where: { active: true } })
  const payload = { cities, events }
  stateCache = { data: payload, expiresAt: now + 15_000 }
  return res.json(payload)
})

router.get("/feed", requireAuth, async (req, res) => {
  const now = Date.now()
  if (feedCache && feedCache.expiresAt > now) {
    return res.json(feedCache.data)
  }
  const events = await prisma.worldEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 10
  })

  const recentKills = await prisma.deathLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      killer: { include: { profile: true } },
      victim: { include: { profile: true } },
      city: true
    }
  })

  const killLines = recentKills.map((entry) => {
    const killerName = entry.killer.profile?.displayName || entry.killer.email
    const victimName = entry.victim.profile?.displayName || entry.victim.email
    const cityName = entry.city?.name || "ukjent område"
    return `${killerName} satte ${victimName} ut av spill i ${cityName}.`
  })

  const headlines = [
    "Finanstilsynet øker trykket på fiktive token-strømmer.",
    "Markedet signaliserer økt etterspørsel etter sjeldne gjenstander.",
    "Familier rekrutterer nye operatører etter nattens hendelser.",
    "Reise mellom byene blir dyrere når heat stiger.",
    "Bysentrene opplever kortvarige bølger av ro og uro."
  ]

  const payload = {
    headlines: [...killLines, ...headlines].slice(0, 8),
    events
  }

  feedCache = { data: payload, expiresAt: now + 15_000 }
  return res.json(payload)
})

export default router
