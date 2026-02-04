import { Router } from "express"
import { z } from "zod"
import { prisma } from "../db/client"
import { requireAuth } from "../middleware/auth"
import { requireNotJailed } from "../middleware/prison"
import { requireAlive } from "../middleware/alive"
import { antiBot } from "../middleware/antiBot"
import { calculateMarketPrice } from "@mafiaspill/shared"
import { createNotification } from "../services/notifications"
import { unlockAchievement } from "../services/achievements"

const router = Router()

async function performTransaction({
  listing,
  buyerId,
  quantity
}: {
  listing: any
  buyerId: string
  quantity: number
}) {
  const buyerProfile = await prisma.profile.findUnique({ where: { userId: buyerId } })
  if (!buyerProfile) {
    throw new Error("Profil mangler")
  }

  const totalPrice = listing.price * quantity
  const tax = Math.round(totalPrice * 0.05)
  const totalCost = totalPrice + tax

  if (listing.currency === "fiat" && buyerProfile.fiatBalance < totalCost) {
    throw new Error("Ikke nok USD")
  }
  if (listing.currency === "token" && buyerProfile.tokenBalance < totalCost) {
    throw new Error("Ikke nok token")
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedListing = await tx.marketListing.update({
      where: { id: listing.id },
      data: {
        quantity: listing.quantity - quantity,
        status: listing.quantity - quantity <= 0 ? "sold" : "active"
      }
    })

    await tx.marketTransaction.create({
      data: {
        listingId: listing.id,
        buyerId,
        sellerId: listing.sellerId,
        price: listing.price,
        quantity,
        currency: listing.currency,
        taxPaid: tax
      }
    })

    const buyerUpdate: any = {
      fiatBalance: buyerProfile.fiatBalance,
      tokenBalance: buyerProfile.tokenBalance
    }

    if (listing.currency === "fiat") {
      buyerUpdate.fiatBalance = buyerProfile.fiatBalance - totalCost
    } else {
      buyerUpdate.tokenBalance = buyerProfile.tokenBalance - totalCost
    }

    await tx.profile.update({ where: { userId: buyerId }, data: buyerUpdate })

    const sellerProfile = await tx.profile.findUnique({ where: { userId: listing.sellerId } })
    if (sellerProfile) {
      const sellerUpdate: any = {
        fiatBalance: sellerProfile.fiatBalance,
        tokenBalance: sellerProfile.tokenBalance
      }
      if (listing.currency === "fiat") {
        sellerUpdate.fiatBalance = sellerProfile.fiatBalance + totalPrice
      } else {
        sellerUpdate.tokenBalance = sellerProfile.tokenBalance + totalPrice
      }
      await tx.profile.update({ where: { userId: listing.sellerId }, data: sellerUpdate })
    }

    const buyerInventory = await tx.inventory.findUnique({ where: { userId: buyerId } })
    if (buyerInventory) {
      const existing = await tx.itemInstance.findFirst({
        where: { inventoryId: buyerInventory.id, itemId: listing.itemId }
      })
      if (existing) {
        await tx.itemInstance.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + quantity }
        })
      } else {
        await tx.itemInstance.create({
          data: {
            itemId: listing.itemId,
            inventoryId: buyerInventory.id,
            ownerId: buyerId,
            quantity,
            provenanceScore: listing.item.provenanceBase
          }
        })
      }
    }

    return updatedListing
  })

  await createNotification({
    userId: buyerId,
    type: "market",
    category: "market",
    title: "Kjøp fullført",
    body: `${listing.item.name} er kjøpt. Total kostnad ${totalCost} ${
      listing.currency === "fiat" ? "USD" : "token"
    }.`,
    icon: "market",
    priority: 1
  })

  await createNotification({
    userId: listing.sellerId,
    type: "market",
    category: "market",
    title: "Salg fullført",
    body: `${listing.item.name} ble solgt. Inntekt ${totalPrice} ${listing.currency === "fiat" ? "USD" : "token"}.`,
    icon: "wallet",
    priority: 1
  })

  const trades = await prisma.marketTransaction.count({ where: { buyerId } })
  if (trades >= 3) {
    await unlockAchievement(buyerId, "market-maker")
  }

  return result
}

router.get("/listings", requireAuth, async (_req, res) => {
  const listings = await prisma.marketListing.findMany({
    where: { status: "active" },
    include: { item: true }
  })
  return res.json({ listings })
})

router.get("/orders", requireAuth, async (req, res) => {
  const orders = await prisma.marketOrder.findMany({
    where: { userId: req.user!.id },
    include: { item: true },
    orderBy: { createdAt: "desc" }
  })
  return res.json({ orders })
})

router.get("/price/:itemId", requireAuth, async (req, res) => {
  const { itemId } = req.params
  const item = await prisma.item.findUnique({ where: { id: itemId } })
  if (!item) {
    return res.status(404).json({ message: "Item ikke funnet" })
  }

  const supply = await prisma.marketListing.count({
    where: { itemId, status: "active" }
  })
  const demand = await prisma.marketTransaction.count({
    where: { listing: { itemId } }
  })
  const activeEvents = await prisma.worldEvent.findMany({
    where: { active: true, effectType: "market" }
  })
  const eventImpact = activeEvents.reduce((acc, ev) => acc * ev.impactValue, 1) || 1

  const priceInfo = calculateMarketPrice({
    basePrice: item.basePrice,
    supply,
    demand,
    eventImpact,
    complianceRisk: 0.2
  })

  return res.json({ item, priceInfo })
})

router.post("/listings", requireAuth, requireNotJailed, requireAlive, antiBot(1200), async (req, res) => {
  const schema = z.object({
    itemInstanceId: z.string().uuid(),
    quantity: z.coerce.number().int().min(1).max(10),
    price: z.coerce.number().int().min(1).max(200_000_000),
    currency: z.enum(["fiat", "token"])
  })
  const { itemInstanceId, quantity, price, currency } = schema.parse(req.body)

  const instance = await prisma.itemInstance.findFirst({
    where: { id: itemInstanceId, ownerId: req.user!.id },
    include: { item: true }
  })
  if (!instance) {
    return res.status(404).json({ message: "Item ikke funnet" })
  }
  if (instance.quantity < quantity) {
    return res.status(400).json({ message: "Ikke nok antall" })
  }

  const listing = await prisma.$transaction(async (tx) => {
    await tx.itemInstance.update({
      where: { id: instance.id },
      data: { quantity: instance.quantity - quantity }
    })

    return tx.marketListing.create({
      data: {
        itemId: instance.itemId,
        sellerId: req.user!.id,
        price,
        currency,
        quantity
      },
      include: { item: true }
    })
  })

  await createNotification({
    userId: req.user!.id,
    type: "market",
    category: "market",
    title: "Listing publisert",
    body: `${listing.item.name} er lagt ut for ${price} ${currency}.`,
    icon: "market"
  })

  const order = await prisma.marketOrder.findFirst({
    where: { itemId: listing.itemId, currency: listing.currency, maxPrice: { gte: listing.price } },
    orderBy: [{ maxPrice: "desc" }, { createdAt: "asc" }],
    include: { item: true }
  })

  if (order) {
    const fillQty = Math.min(order.quantity, listing.quantity)
    try {
      await performTransaction({ listing, buyerId: order.userId, quantity: fillQty })
      const remaining = order.quantity - fillQty
      if (remaining <= 0) {
        await prisma.marketOrder.delete({ where: { id: order.id } })
      } else {
        await prisma.marketOrder.update({ where: { id: order.id }, data: { quantity: remaining } })
      }
    } catch {
      // ignore matching errors
    }
  }

  return res.status(201).json({ listing })
})

router.post("/orders", requireAuth, requireNotJailed, requireAlive, antiBot(1200), async (req, res) => {
  const schema = z.object({
    itemId: z.string().uuid(),
    maxPrice: z.coerce.number().int().min(1).max(200_000_000),
    quantity: z.coerce.number().int().min(1).max(10),
    currency: z.enum(["fiat", "token"])
  })
  const data = schema.parse(req.body)

  const order = await prisma.marketOrder.create({
    data: {
      userId: req.user!.id,
      itemId: data.itemId,
      maxPrice: data.maxPrice,
      quantity: data.quantity,
      currency: data.currency
    },
    include: { item: true }
  })

  await createNotification({
    userId: req.user!.id,
    type: "market",
    category: "market",
    title: "Kjøpsønske registrert",
    body: `${order.item.name} opp til ${order.maxPrice} ${order.currency}.`,
    icon: "market"
  })

  return res.json({ order })
})

router.post("/buy/:listingId", requireAuth, requireNotJailed, requireAlive, antiBot(1200), async (req, res) => {
  const { listingId } = req.params
  const schema = z.object({ quantity: z.coerce.number().int().min(1).max(10) })
  const { quantity } = schema.parse(req.body)

  const listing = await prisma.marketListing.findUnique({
    where: { id: listingId },
    include: { item: true }
  })
  if (!listing || listing.status !== "active") {
    return res.status(404).json({ message: "Listing ikke tilgjengelig" })
  }
  if (listing.quantity < quantity) {
    return res.status(400).json({ message: "Ikke nok antall" })
  }

  try {
    const result = await performTransaction({ listing, buyerId: req.user!.id, quantity })
    return res.json({ listing: result })
  } catch (error: any) {
    return res.status(400).json({ message: error.message || "Kjøp feilet" })
  }
})

export default router
