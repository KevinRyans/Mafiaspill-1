import { Router } from "express"
import { z } from "zod"
import { prisma } from "../db/client"
import { requireAuth } from "../middleware/auth"
import { requireNotJailed } from "../middleware/prison"
import { requireAlive } from "../middleware/alive"
import { antiBot } from "../middleware/antiBot"
import { resolveCombatTurn } from "@mafiaspill/shared"
import { createNotification } from "../services/notifications"

const router = Router()

function buildCombatant(userId: string, profile: any, cityHeat: number) {
  const maxHp = Math.max(60, profile.health)
  const power = 10 + Math.floor(profile.notoriety / 60)
  const defense = 6 + Math.floor(profile.defense / 1000)
  const evasion = Math.min(0.25, 0.05 + profile.risk / 250)
  const critChance = Math.min(0.25, 0.05 + cityHeat / 300)

  return {
    id: userId,
    name: profile.displayName,
    maxHp,
    hp: maxHp,
    power,
    defense,
    evasion,
    critChance
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function calcDefenseLoss(defense: number, hpLoss: number, lostFight: boolean) {
  const base = Math.max(180, Math.round(defense * (lostFight ? 0.08 : 0.04)))
  return base + Math.round(hpLoss * 6)
}

function calcHealthLoss(hpLoss: number) {
  return Math.max(4, Math.round(hpLoss / 3))
}

router.post("/pvp", requireAuth, requireNotJailed, requireAlive, antiBot(1500), async (req, res) => {
  const schema = z.object({ defenderId: z.string().uuid(), stakeFiat: z.coerce.number().int().min(0).optional() })
  const { defenderId, stakeFiat = 0 } = schema.parse(req.body)

  if (defenderId === req.user!.id) {
    return res.status(400).json({ message: "Du kan ikke angripe deg selv" })
  }

  const attackerProfile = await prisma.profile.findUnique({ where: { userId: req.user!.id } })
  const defenderProfile = await prisma.profile.findUnique({ where: { userId: defenderId } })
  if (!attackerProfile || !defenderProfile) {
    return res.status(404).json({ message: "Kjemper mangler" })
  }

  const now = new Date()
  if (defenderProfile.downUntil && defenderProfile.downUntil > now) {
    return res.status(400).json({ message: "Målet er satt ut av spill" })
  }

  if (attackerProfile.lastPvpAt) {
    const next = new Date(attackerProfile.lastPvpAt.getTime() + 15 * 60 * 1000)
    if (next > new Date()) {
      return res.status(429).json({ message: "PvP i nedkjøling", nextAvailableAt: next })
    }
  }

  const attackerLocation = await prisma.userLocation.findUnique({
    where: { userId: req.user!.id },
    include: { city: { include: { heat: true } } }
  })
  const defenderLocation = await prisma.userLocation.findUnique({
    where: { userId: defenderId },
    include: { city: { include: { heat: true } } }
  })
  const attackerHeat = attackerLocation?.city?.heat?.heat ?? 0
  const defenderHeat = defenderLocation?.city?.heat?.heat ?? 0

  const attacker = buildCombatant(req.user!.id, attackerProfile, attackerHeat)
  const defender = buildCombatant(defenderId, defenderProfile, defenderHeat)

  const combat = await prisma.combat.create({
    data: {
      type: "pvp",
      attackerId: attacker.id,
      defenderId: defender.id
    }
  })

  const turns = [] as any[]
  let turnNumber = 1
  let attackerTurn = true

  while (attacker.hp > 0 && defender.hp > 0 && turnNumber <= 12) {
    const currentAttacker = attackerTurn ? attacker : defender
    const currentDefender = attackerTurn ? defender : attacker
    const result = resolveCombatTurn(currentAttacker, currentDefender)

    if (attackerTurn) {
      defender.hp = result.defenderHp
    } else {
      attacker.hp = result.defenderHp
    }

    turns.push({
      combatId: combat.id,
      turnNumber,
      attackerId: result.attackerId,
      defenderId: result.defenderId,
      damage: result.damage,
      crit: result.crit,
      evaded: result.evaded,
      defenderHp: result.defenderHp
    })

    attackerTurn = !attackerTurn
    turnNumber += 1
  }

  const winnerId = attacker.hp > defender.hp ? attacker.id : defender.id
  const loserId = winnerId === attacker.id ? defender.id : attacker.id
  const attackerLoss = attacker.maxHp - attacker.hp
  const defenderLoss = defender.maxHp - defender.hp

  const attackerDefenseLoss = calcDefenseLoss(attackerProfile.defense, attackerLoss, winnerId !== attacker.id)
  const defenderDefenseLoss = calcDefenseLoss(defenderProfile.defense, defenderLoss, winnerId !== defender.id)
  const attackerHealthLoss = calcHealthLoss(attackerLoss)
  const defenderHealthLoss = calcHealthLoss(defenderLoss)

  const killCityId = defenderLocation?.cityId
  let attackerDownUntil: Date | null = null
  let defenderDownUntil: Date | null = null

  await prisma.$transaction(async (tx) => {
    await tx.combat.update({
      where: { id: combat.id },
      data: {
        status: "resolved",
        winnerId,
        resolvedAt: new Date()
      }
    })

    await tx.combatTurn.createMany({ data: turns })

    await tx.pvpMatch.create({
      data: {
        combatId: combat.id,
        attackerId: attacker.id,
        defenderId: defender.id,
        stakeFiat,
        cooldownEndsAt: new Date(Date.now() + 15 * 60 * 1000)
      }
    })

    const updatedAttackerDefense = clamp(attackerProfile.defense - attackerDefenseLoss, 0, 5_000_000)
    const updatedDefenderDefense = clamp(defenderProfile.defense - defenderDefenseLoss, 0, 5_000_000)
    const updatedAttackerHealth = clamp(attackerProfile.health - attackerHealthLoss, 0, 100)
    const updatedDefenderHealth = clamp(defenderProfile.health - defenderHealthLoss, 0, 100)

    attackerDownUntil =
      winnerId === attacker.id || updatedAttackerDefense > 0
        ? null
        : new Date(Date.now() + 20 * 60 * 1000)
    defenderDownUntil =
      winnerId === defender.id || updatedDefenderDefense > 0
        ? null
        : new Date(Date.now() + 20 * 60 * 1000)

    await tx.profile.update({
      where: { userId: req.user!.id },
      data: {
        lastPvpAt: new Date(),
        respect: { increment: winnerId === req.user!.id ? 6 : 2 },
        defense: updatedAttackerDefense,
        health: updatedAttackerHealth,
        downUntil: attackerDownUntil ?? undefined,
        deaths: attackerDownUntil ? { increment: 1 } : undefined
      }
    })

    await tx.profile.update({
      where: { userId: defenderId },
      data: {
        respect: { increment: winnerId === defenderId ? 6 : 2 },
        defense: updatedDefenderDefense,
        health: updatedDefenderHealth,
        downUntil: defenderDownUntil ?? undefined,
        deaths: defenderDownUntil ? { increment: 1 } : undefined
      }
    })

    if (
      winnerId &&
      loserId &&
      ((loserId === defender.id && defenderDownUntil) || (loserId === attacker.id && attackerDownUntil))
    ) {
      await tx.deathLog.create({
        data: {
          killerId: winnerId,
          victimId: loserId,
          cityId: killCityId,
          reason: "pvp"
        }
      })
    }
  })

  await createNotification({
    userId: req.user!.id,
    type: "combat",
    category: "sikkerhet",
    title: winnerId === req.user!.id ? "Du vant duellen" : "Du tapte duellen",
    body: "PvP er avgjort. Sjekk nedkjøling og forsvar.",
    icon: winnerId === req.user!.id ? "sword" : "warning",
    priority: 2
  })

  await createNotification({
    userId: defenderId,
    type: "combat",
    category: "sikkerhet",
    title: winnerId === defenderId ? "Du forsvarte deg" : "Du ble overvunnet",
    body: "En turf-duell er avsluttet. Sjekk forsvar og nedkjøling.",
    icon: "sword",
    priority: 2
  })

  if (defenderDownUntil) {
    await createNotification({
      userId: defenderId,
      type: "combat",
      category: "sikkerhet",
      title: "Du er satt ut av spill",
      body: "Forsvaret ditt nådde null. Bygg opp livvakter før du går tilbake.",
      icon: "warning",
      priority: 1
    })
  }

  if (attackerDownUntil) {
    await createNotification({
      userId: req.user!.id,
      type: "combat",
      category: "sikkerhet",
      title: "Du er satt ut av spill",
      body: "Forsvaret ditt nådde null. Skjerm deg til du er tilbake.",
      icon: "warning",
      priority: 1
    })
  }

  return res.json({ combatId: combat.id, winnerId, turns })
})

router.get("/targets", requireAuth, async (req, res) => {
  const now = new Date()
  const users = await prisma.user.findMany({
    where: { id: { not: req.user!.id } },
    take: 12,
    include: {
      profile: true,
      location: { include: { city: true } }
    },
    orderBy: { createdAt: "desc" }
  })

  const targets = users
    .map((user) => ({
      id: user.id,
      name: user.profile?.displayName || user.email,
      city: user.location?.city?.name || "Ukjent",
      health: user.profile?.health ?? 100,
      defense: user.profile?.defense ?? 0,
      downUntil:
        user.profile?.downUntil && user.profile.downUntil > now ? user.profile.downUntil.getTime() : null
    }))
    .filter((target) => !target.downUntil)

  return res.json({ targets })
})

router.get("/:combatId", requireAuth, async (req, res) => {
  const { combatId } = req.params
  const combat = await prisma.combat.findUnique({
    where: { id: combatId },
    include: { turns: true }
  })
  if (!combat) {
    return res.status(404).json({ message: "Kamp ikke funnet" })
  }
  return res.json({ combat })
})

export default router
