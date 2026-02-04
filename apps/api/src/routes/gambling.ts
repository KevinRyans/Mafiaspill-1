import { Router } from "express"
import { z } from "zod"
import { prisma } from "../db/client"
import { requireAuth } from "../middleware/auth"
import { requireNotJailed } from "../middleware/prison"
import { requireAlive } from "../middleware/alive"
import { antiBot } from "../middleware/antiBot"
import { createNotification } from "../services/notifications"

const router = Router()
async function ensureLimits(userId: string) {
  const existing = await prisma.gamblingLimit.findFirst({ where: { userId } })
  if (existing) {
    if (existing.dailyMax < 1_000_000 || existing.hourlyMax < 1_000_000) {
      return prisma.gamblingLimit.update({
        where: { id: existing.id },
        data: { dailyMax: 600_000_000, hourlyMax: 150_000_000 }
      })
    }
    return existing
  }
  return prisma.gamblingLimit.create({
    data: { userId, dailyMax: 600_000_000, hourlyMax: 150_000_000 }
  })
}

async function getSpent(userId: string, windowMs: number) {
  const since = new Date(Date.now() - windowMs)
  const bets = await prisma.gamblingBet.findMany({
    where: { userId, createdAt: { gte: since } },
    select: { stake: true }
  })
  return bets.reduce((sum, bet) => sum + bet.stake, 0)
}

async function applyBetResult(userId: string, stake: number, payout: number) {
  const profile = await prisma.profile.findUnique({ where: { userId } })
  if (!profile) {
    throw new Error("Profil mangler")
  }
  if (profile.fiatBalance < stake) {
    throw new Error("Ikke nok USD")
  }

  await prisma.profile.update({
    where: { userId },
    data: { fiatBalance: profile.fiatBalance - stake + payout }
  })
}

async function enforceLimits(userId: string, stake: number) {
  const limits = await ensureLimits(userId)
  const hourlySpent = await getSpent(userId, 1000 * 60 * 60)
  const dailySpent = await getSpent(userId, 1000 * 60 * 60 * 24)

  if (hourlySpent + stake > limits.hourlyMax) {
    throw new Error("Timesgrense nådd")
  }
  if (dailySpent + stake > limits.dailyMax) {
    throw new Error("Døgnlimit nådd")
  }

  return limits
}

router.get("/games", requireAuth, async (_req, res) => {
  const games = await prisma.gamblingGame.findMany({ orderBy: { minBet: "asc" } })
  return res.json({ games })
})

router.get("/limits", requireAuth, async (req, res) => {
  const limits = await ensureLimits(req.user!.id)
  const hourlySpent = await getSpent(req.user!.id, 1000 * 60 * 60)
  const dailySpent = await getSpent(req.user!.id, 1000 * 60 * 60 * 24)
  return res.json({ limits, usage: { hourlySpent, dailySpent } })
})

router.post("/coinflip", requireAuth, requireNotJailed, requireAlive, antiBot(0), async (req, res) => {
  const schema = z.object({ stake: z.coerce.number().int().min(0).max(10_000_000) })
  const { stake } = schema.parse(req.body)

  try {
    await enforceLimits(req.user!.id, stake)
    const win = Math.random() < 0.48
    const payout = win ? stake * 2 : 0

    const game = await prisma.gamblingGame.findFirst({ where: { type: "coin" } })

    await prisma.gamblingBet.create({
      data: {
        userId: req.user!.id,
        gameId: game?.id || (await prisma.gamblingGame.findFirst())!.id,
        stake,
        payout,
        status: win ? "win" : "lose",
        result: {
          create: {
            outcome: win ? "win" : "lose",
            detail: { flip: win ? "kron" : "mynt" }
          }
        }
      }
    })

    await applyBetResult(req.user!.id, stake, payout)

    await createNotification({
      userId: req.user!.id,
      type: "gambling",
      category: "gambling",
      title: win ? "Gevinst!" : "Tap",
      body: win ? `Du vant ${payout} USD.` : "Huset vant denne gangen.",
      icon: "gambling",
      priority: 2
    })

    return res.json({ win, payout, message: win ? "Du vant!" : "Du tapte." })
  } catch (error: any) {
    return res.status(400).json({ message: error.message || "Kunne ikke plassere spill" })
  }
})

router.post("/blackjack", requireAuth, requireNotJailed, requireAlive, antiBot(0), async (req, res) => {
  const schema = z.object({ stake: z.coerce.number().int().min(0).max(25_000_000) })
  const { stake } = schema.parse(req.body)

  try {
    await enforceLimits(req.user!.id, stake)
    const winChance = 0.44
    const blackjack = Math.random() < 0.07
    const win = Math.random() < winChance
    const payout = win ? Math.round(stake * (blackjack ? 2.3 : 1.9)) : 0

    const game = await prisma.gamblingGame.findFirst({ where: { type: "blackjack" } })

    await prisma.gamblingBet.create({
      data: {
        userId: req.user!.id,
        gameId: game?.id || (await prisma.gamblingGame.findFirst())!.id,
        stake,
        payout,
        status: win ? "win" : "lose",
        result: {
          create: {
            outcome: win ? "win" : "lose",
            detail: { blackjack }
          }
        }
      }
    })

    await applyBetResult(req.user!.id, stake, payout)

    await createNotification({
      userId: req.user!.id,
      type: "gambling",
      category: "gambling",
      title: win ? "Blackjack gevinst" : "Blackjack tap",
      body: win ? `Utbetaling ${payout} USD.` : "Kortene var ikke med deg.",
      icon: "gambling",
      priority: 2
    })

    return res.json({ win, payout, blackjack })
  } catch (error: any) {
    return res.status(400).json({ message: error.message || "Kunne ikke spille" })
  }
})

router.post("/race", requireAuth, requireNotJailed, requireAlive, antiBot(0), async (req, res) => {
  const schema = z.object({ stake: z.coerce.number().int().min(0).max(15_000_000), pick: z.number().int().min(1).max(4) })
  const { stake, pick } = schema.parse(req.body)

  try {
    await enforceLimits(req.user!.id, stake)
    const odds = [2.2, 2.8, 3.4, 4.0]
    const winner = Math.floor(Math.random() * 4) + 1
    const win = winner === pick
    const payout = win ? Math.round(stake * odds[pick - 1]) : 0

    const game = await prisma.gamblingGame.findFirst({ where: { type: "race" } })

    await prisma.gamblingBet.create({
      data: {
        userId: req.user!.id,
        gameId: game?.id || (await prisma.gamblingGame.findFirst())!.id,
        stake,
        payout,
        status: win ? "win" : "lose",
        result: {
          create: { outcome: win ? "win" : "lose", detail: { winner, pick } }
        }
      }
    })

    await applyBetResult(req.user!.id, stake, payout)

    await createNotification({
      userId: req.user!.id,
      type: "gambling",
      category: "gambling",
      title: win ? "Hesteløp gevinst" : "Hesteløp tap",
      body: win ? `Vinner: #${winner}. Utbetaling ${payout} USD.` : `Vinner: #${winner}.`,
      icon: "gambling",
      priority: 2
    })

    return res.json({ win, payout, winner })
  } catch (error: any) {
    return res.status(400).json({ message: error.message || "Kunne ikke spille" })
  }
})

router.post("/lotto", requireAuth, requireNotJailed, requireAlive, antiBot(0), async (req, res) => {
  const schema = z.object({ stake: z.coerce.number().int().min(0).max(5_000_000) })
  const { stake } = schema.parse(req.body)

  try {
    await enforceLimits(req.user!.id, stake)
    const roll = Math.random()
    const win = roll < 0.08
    const payout = win ? stake * 8 : 0

    const game = await prisma.gamblingGame.findFirst({ where: { type: "lotto" } })

    await prisma.gamblingBet.create({
      data: {
        userId: req.user!.id,
        gameId: game?.id || (await prisma.gamblingGame.findFirst())!.id,
        stake,
        payout,
        status: win ? "win" : "lose",
        result: {
          create: { outcome: win ? "win" : "lose", detail: { roll } }
        }
      }
    })

    await applyBetResult(req.user!.id, stake, payout)

    await createNotification({
      userId: req.user!.id,
      type: "gambling",
      category: "gambling",
      title: win ? "Lotto gevinst" : "Lotto tap",
      body: win ? `Du traff! Utbetaling ${payout} USD.` : "Ingen fulltreffer i dag.",
      icon: "gambling",
      priority: 2
    })

    return res.json({ win, payout })
  } catch (error: any) {
    return res.status(400).json({ message: error.message || "Kunne ikke spille" })
  }
})

router.get("/leaderboard", requireAuth, async (_req, res) => {
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7)
  const bets = await prisma.gamblingBet.findMany({
    where: { createdAt: { gte: since } },
    include: { user: { select: { email: true, profile: true } } }
  })

  const scores = new Map<string, { name: string; score: number }>()
  for (const bet of bets) {
    const key = bet.userId
    const name = bet.user.profile?.displayName || bet.user.email
    const current = scores.get(key) || { name, score: 0 }
    current.score += bet.payout - bet.stake
    scores.set(key, current)
  }

  const entries = Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)

  return res.json({ entries })
})

export default router

