import { Router } from "express"
import { z } from "zod"
import { prisma } from "../db/client"
import { requireAuth } from "../middleware/auth"
import { requireNotJailed } from "../middleware/prison"
import { requireAlive } from "../middleware/alive"
import { antiBot } from "../middleware/antiBot"
import { computeEnergy, pickMissionOutcome, calculateMissionPayout } from "@mafiaspill/shared"
import { createNotification } from "../services/notifications"
import { unlockAchievement } from "../services/achievements"
import { getRespectUpgradeCodes } from "../services/respect"

const router = Router()
const CATEGORIES = new Set([
  "oppdrag",
  "kriminalitet",
  "biltyveri",
  "husran",
  "ran_spiller",
  "fight_club",
  "organisert"
])

function hashSeed(input: string) {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash
}

function seededShuffle<T>(items: T[], seed: number) {
  const result = [...items]
  let t = seed
  for (let i = result.length - 1; i > 0; i -= 1) {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    const rand = ((r ^ (r >>> 14)) >>> 0) / 4294967296
    const j = Math.floor(rand * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

router.get("/", requireAuth, async (req, res) => {
  const requested = (req.query.category as string | undefined) || "oppdrag"
  const category = CATEGORIES.has(requested) ? requested : "oppdrag"
  const allMissions = await prisma.mission.findMany({
    where: { category },
    orderBy: { tier: "asc" },
    include: { requiredCar: true }
  })
  const seedKey = `${new Date().toISOString().slice(0, 10)}:${req.user!.id}:${category}`
  const shuffled = seededShuffle(allMissions, hashSeed(seedKey))
  const missions = shuffled.slice(0, Math.min(12, shuffled.length))
  const requiredIds = missions
    .map((mission) => mission.requiredCarModelId)
    .filter((id): id is string => Boolean(id))
  const ownedCars = requiredIds.length
    ? await prisma.garageCar.findMany({
        where: { userId: req.user!.id, carModelId: { in: requiredIds }, status: "owned" },
        select: { carModelId: true }
      })
    : []
  const ownedSet = new Set(ownedCars.map((car) => car.carModelId))
  const lastRun = await prisma.missionRun.findFirst({
    where: { userId: req.user!.id },
    orderBy: { resolvedAt: "desc" },
    include: { mission: true }
  })
  const cooldownEndsAt = lastRun?.resolvedAt
    ? lastRun.resolvedAt.getTime() + lastRun.mission.cooldownMinutes * 60 * 1000
    : null

  const location = await prisma.userLocation.findUnique({
    where: { userId: req.user!.id },
    include: { city: { include: { heat: true } } }
  })
  const heat = location?.city?.heat?.heat ?? 0

  const missionsWithStatus = missions.map((mission) => ({
    ...mission,
    hasRequiredCar: mission.requiredCarModelId ? ownedSet.has(mission.requiredCarModelId) : true
  }))

  return res.json({ missions: missionsWithStatus, cooldownEndsAt, heat, category })
})

router.get("/challenges", requireAuth, async (req, res) => {
  const day = new Date().getDay()
  const daily = [
    { id: "daily-1", text: "Fullfør 2 oppdrag", reward: 15000000 },
    { id: "daily-2", text: "Utfør 1 biltyveri", reward: 12000000 },
    { id: "daily-3", text: "Kjøp 1 fordel i Respekt", reward: 20000000 },
    { id: "daily-4", text: "Hent inntekt fra firma", reward: 18000000 }
  ]
  const weekly = [
    { id: "weekly-1", text: "Vinn 2 turf-dueller", reward: 75000000 },
    { id: "weekly-2", text: "Bidra 80000000 USD til familie-bank", reward: 60000000 },
    { id: "weekly-3", text: "Fullfør 10 oppdrag", reward: 90000000 }
  ]
  return res.json({ daily, weekly, seed: day })
})

router.post("/run", requireAuth, requireNotJailed, requireAlive, antiBot(1500), async (req, res) => {
  const schema = z.object({ missionId: z.string().uuid(), optionId: z.string() })
  const { missionId, optionId } = schema.parse(req.body)
  const mission = await prisma.mission.findUnique({
    where: { id: missionId },
    include: { requiredCar: true }
  })
  if (!mission) {
    return res.status(404).json({ message: "Oppdrag ikke funnet" })
  }

  if (mission.requiredCarModelId) {
    const hasCar = await prisma.garageCar.findFirst({
      where: { userId: req.user!.id, carModelId: mission.requiredCarModelId, status: "owned" }
    })
    if (!hasCar) {
      return res.status(400).json({ message: "Du mangler påkrevd bil i garasjen" })
    }
  }

  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } })
  if (!profile) {
    return res.status(404).json({ message: "Profil ikke funnet" })
  }

  if (profile.lastMissionAt) {
    const next = new Date(profile.lastMissionAt.getTime() + mission.cooldownMinutes * 60 * 1000)
    if (next > new Date()) {
      return res.status(429).json({ message: "Oppdrag er i nedkjøling", nextAvailableAt: next.getTime() })
    }
  }

  const energyState = computeEnergy(new Date(), {
    energy: profile.energy,
    maxEnergy: 100,
    lastEnergyAt: profile.energyUpdatedAt,
    regenPerHour: 12
  })

  if (energyState.energy < mission.energyCost) {
    return res.status(400).json({ message: "Ikke nok energi" })
  }

  const options = mission.options as any[]
  const option = options.find((opt) => opt.id === optionId)
  if (!option) {
    return res.status(400).json({ message: "Valg ikke funnet" })
  }

  const location = await prisma.userLocation.findUnique({
    where: { userId: req.user!.id },
    include: { city: { include: { heat: true } } }
  })
  const cityHeat = location?.city?.heat?.heat ?? 0

  const upgrades = await getRespectUpgradeCodes(req.user!.id)
  const bonusRisk = mission.category === "ran_spiller" && upgrades.has("efficient_robbery") ? -3 : 0
  const outcome = pickMissionOutcome(mission.baseRisk + Math.round(cityHeat / 10) + bonusRisk, option)
  let payout = calculateMissionPayout(mission.baseReward, mission.baseRisk + option.riskDelta, option.rewardMultiplier)
  if (mission.category === "kriminalitet" && upgrades.has("profit_crime")) {
    payout = Math.round(payout * 1.25)
  }

  const rewardFiat = outcome.success ? payout : Math.round(payout * 0.2)
  const rewardToken = outcome.success ? Math.round(payout * 0.25) : 0

  const newRisk = Math.max(0, Math.min(100, profile.risk + outcome.riskDelta))
  const newCompliance = Math.max(0, Math.min(100, profile.compliance + outcome.complianceImpact))
  const missionRun = await prisma.missionRun.create({
    data: {
      missionId: mission.id,
      userId: req.user!.id,
      status: outcome.success ? "success" : "failed",
      rewardFiat,
      rewardToken,
      riskDelta: outcome.riskDelta,
      complianceImpact: outcome.complianceImpact,
      choiceId: optionId,
      resolvedAt: new Date()
    }
  })

  await prisma.missionEvent.createMany({
    data: [
      {
        missionRunId: missionRun.id,
        eventType: "summary",
        message: outcome.success
          ? "Oppdraget gikk etter planen. Compliance-meteret holder seg stabilt."
          : "Oppdraget skar seg. Etterforskningstrykket stiger midlertidig."
      }
    ]
  })

  const trainingBonus = mission.category === "fight_club" && upgrades.has("efficient_training") ? 2 : 0
  const defenseGain = mission.category === "fight_club" && outcome.success ? 4 + trainingBonus : 0
  const healthGain = mission.category === "fight_club" && outcome.success ? 1 : 0
  const updatedProfile = await prisma.profile.update({
    where: { userId: req.user!.id },
    data: {
      energy: energyState.energy - mission.energyCost,
      energyUpdatedAt: energyState.lastEnergyAt,
      lastMissionAt: new Date(),
      fiatBalance: profile.fiatBalance + rewardFiat,
      tokenBalance: profile.tokenBalance + rewardToken,
      risk: newRisk,
      compliance: newCompliance,
      respect: profile.respect + (outcome.success ? 8 : 3),
      notoriety: profile.notoriety + (outcome.success ? 8 : 2),
      defense: Math.min(5_000_000, profile.defense + defenseGain),
      health: Math.min(100, profile.health + healthGain)
    }
  })
  const cooldownEndsAt = updatedProfile.lastMissionAt
    ? updatedProfile.lastMissionAt.getTime() + mission.cooldownMinutes * 60 * 1000
    : null

  await createNotification({
    userId: req.user!.id,
    type: "mission",
    category: "system",
    title: outcome.success ? "Oppdrag fullført" : "Oppdrag feilet",
    body: outcome.success
      ? `Belønning: +${rewardFiat} USD, +${rewardToken} token.`
      : "Etterforskningstrykket øker. Vurder lavrisiko oppdrag.",
    icon: outcome.success ? "check" : "warning",
    priority: outcome.success ? 1 : 2
  })

  let prisoned: { jailedUntil: number } | null = null
  if (!outcome.success) {
    const jailChance = Math.min(0.65, 0.15 + cityHeat / 160 + mission.baseRisk / 200)
    if (Math.random() < jailChance) {
      const minutes = Math.min(15, 2 + Math.round(cityHeat / 12) + Math.round(mission.baseRisk / 15))
      const jailedUntil = new Date(Date.now() + minutes * 60 * 1000)
      const cityId = location?.city?.id || location?.cityId
      if (cityId) {
        await prisma.prisonInmate.upsert({
          where: { userId: req.user!.id },
          update: { cityId, jailedUntil, reason: "Oppdrag feilet" },
          create: { userId: req.user!.id, cityId, jailedUntil, reason: "Oppdrag feilet" }
        })
        await createNotification({
          userId: req.user!.id,
          type: "prison",
          category: "sikkerhet",
          title: "Du ble fengslet",
          body: `Fengselstid: ${minutes} min.`,
          icon: "warning",
          priority: 2
        })
        prisoned = { jailedUntil: jailedUntil.getTime() }
      }
    }
  }

  await unlockAchievement(req.user!.id, "first-run")

  return res.json({ missionRun, profile: updatedProfile, prisoned, cooldownEndsAt })
})

export default router
