import { Router } from "express"
import { z } from "zod"
import { prisma } from "../db/client"
import { requireAuth, requireRole, requireAdminIp } from "../middleware/auth"
import { logAdminAction } from "../services/adminAudit"

const router = Router()

router.use(requireAuth, requireRole(["admin", "mod", "support"]), requireAdminIp)

router.get("/users", async (req, res) => {
  const users = await prisma.user.findMany({
    include: { profile: true },
    orderBy: { createdAt: "desc" },
    take: 100
  })
  return res.json({ users })
})

router.patch("/users/:userId", async (req, res) => {
  const schema = z.object({
    role: z.enum(["player", "support", "mod", "admin"]).optional(),
    fiatBalance: z.coerce.number().int().optional(),
    tokenBalance: z.coerce.number().int().optional(),
    risk: z.coerce.number().int().optional()
  })
  const data = schema.parse(req.body)
  const { userId } = req.params

  if (data.role) {
    await prisma.user.update({ where: { id: userId }, data: { role: data.role } })
  }

  if (data.fiatBalance !== undefined || data.tokenBalance !== undefined || data.risk !== undefined) {
    await prisma.profile.update({
      where: { userId },
      data: {
        fiatBalance: data.fiatBalance,
        tokenBalance: data.tokenBalance,
        risk: data.risk
      }
    })
  }

  await logAdminAction({
    adminId: req.user!.id,
    action: "user.update",
    targetType: "user",
    targetId: userId,
    metadata: data,
    ip: req.ip
  })

  return res.json({ success: true })
})

router.post("/ban", async (req, res) => {
  const schema = z.object({
    userId: z.string().uuid(),
    type: z.enum(["ban", "mute"]),
    reason: z.string().min(3),
    expiresAt: z.string().optional()
  })
  const data = schema.parse(req.body)

  const ban = await prisma.banMute.create({
    data: {
      userId: data.userId,
      type: data.type,
      reason: data.reason,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      createdBy: req.user!.id
    }
  })

  await logAdminAction({
    adminId: req.user!.id,
    action: "user.ban",
    targetType: "user",
    targetId: data.userId,
    metadata: data,
    ip: req.ip
  })

  return res.json({ ban })
})

router.get("/disputes", async (_req, res) => {
  const disputes = await prisma.dispute.findMany({ orderBy: { createdAt: "desc" } })
  return res.json({ disputes })
})

router.patch("/disputes/:id", async (req, res) => {
  const schema = z.object({ status: z.enum(["open", "resolved", "rejected"]) })
  const data = schema.parse(req.body)
  const { id } = req.params
  const dispute = await prisma.dispute.update({ where: { id }, data })

  await logAdminAction({
    adminId: req.user!.id,
    action: "dispute.update",
    targetType: "dispute",
    targetId: id,
    metadata: data,
    ip: req.ip
  })

  return res.json({ dispute })
})

router.post("/items/spawn", async (req, res) => {
  const schema = z.object({ userId: z.string().uuid(), itemId: z.string().uuid(), quantity: z.coerce.number().int().min(1) })
  const data = schema.parse(req.body)

  const inventory = await prisma.inventory.findUnique({ where: { userId: data.userId } })
  if (!inventory) {
    return res.status(404).json({ message: "Inventory missing" })
  }

  const instance = await prisma.itemInstance.create({
    data: {
      itemId: data.itemId,
      inventoryId: inventory.id,
      ownerId: data.userId,
      quantity: data.quantity,
      provenanceScore: 65
    }
  })

  await logAdminAction({
    adminId: req.user!.id,
    action: "item.spawn",
    targetType: "user",
    targetId: data.userId,
    metadata: data,
    ip: req.ip
  })

  return res.json({ instance })
})

router.post("/world-events", async (req, res) => {
  const schema = z.object({
    title: z.string().min(3),
    description: z.string().min(10),
    effectType: z.string().min(3),
    impactValue: z.coerce.number().min(0.1),
    startsAt: z.string(),
    endsAt: z.string()
  })
  const data = schema.parse(req.body)

  const event = await prisma.worldEvent.create({
    data: {
      title: data.title,
      description: data.description,
      effectType: data.effectType,
      impactValue: data.impactValue,
      startsAt: new Date(data.startsAt),
      endsAt: new Date(data.endsAt),
      active: true
    }
  })

  await logAdminAction({
    adminId: req.user!.id,
    action: "world.create",
    targetType: "world_event",
    targetId: event.id,
    metadata: data,
    ip: req.ip
  })

  return res.json({ event })
})

router.post("/schedule", async (req, res) => {
  const schema = z.object({
    name: z.string().min(3),
    payload: z.any().optional(),
    runAt: z.string()
  })
  const data = schema.parse(req.body)

  const job = await prisma.scheduledJob.create({
    data: {
      name: data.name,
      payload: data.payload,
      runAt: new Date(data.runAt)
    }
  })

  await logAdminAction({
    adminId: req.user!.id,
    action: "job.schedule",
    targetType: "scheduled_job",
    targetId: job.id,
    metadata: data,
    ip: req.ip
  })

  return res.json({ job })
})

router.get("/audit", async (req, res) => {
  const logs = await prisma.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100
  })
  return res.json({ logs })
})

router.get("/crews", async (req, res) => {
  const crews = await prisma.crew.findMany({
    include: { members: true }
  })
  return res.json({ crews })
})

router.get("/world-state", async (_req, res) => {
  const cities = await prisma.city.findMany({ orderBy: { name: "asc" } })
  return res.json({ cities })
})

router.patch("/world-state/:cityId", async (req, res) => {
  const schema = z.object({
    controlLevel: z.coerce.number().int().min(0).max(100).optional(),
    politicalPressure: z.coerce.number().int().min(0).max(100).optional(),
    economicHeat: z.coerce.number().int().min(0).max(100).optional(),
    riskIndex: z.coerce.number().int().min(0).max(100).optional()
  })
  const data = schema.parse(req.body)
  const { cityId } = req.params

  const city = await prisma.city.update({
    where: { id: cityId },
    data
  })

  await logAdminAction({
    adminId: req.user!.id,
    action: "world.update",
    targetType: "city",
    targetId: cityId,
    metadata: data,
    ip: req.ip
  })

  return res.json({ city })
})

export default router
