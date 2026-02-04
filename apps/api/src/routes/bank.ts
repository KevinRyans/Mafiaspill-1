import { Router } from "express"
import { z } from "zod"
import { prisma } from "../db/client"
import { requireAuth } from "../middleware/auth"
import { requireAlive } from "../middleware/alive"
import { createNotification } from "../services/notifications"
import { createBankTransaction, getBankLogs } from "../services/bankService"

const router = Router()

router.get("/", requireAuth, async (req, res) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } })
  if (!profile) {
    return res.status(404).json({ message: "Profil ikke funnet" })
  }

  const bank = await prisma.bankAccount.upsert({
    where: { userId: req.user!.id },
    update: {},
    create: { userId: req.user!.id, balance: 0, rate: 0.01 }
  })

  const logs = await getBankLogs(req.user!.id, 20)

  return res.json({
    cash: profile.fiatBalance,
    bank,
    logs
  })
})

router.post("/deposit", requireAuth, requireAlive, async (req, res) => {
  const schema = z.object({ amount: z.coerce.number().int().min(1) })
  const { amount } = schema.parse(req.body)

  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } })
  if (!profile) {
    return res.status(404).json({ message: "Profil ikke funnet" })
  }
  if (profile.fiatBalance < amount) {
    return res.status(400).json({ message: "Ikke nok USD" })
  }

  const bank = await prisma.$transaction(async (tx) => {
    await tx.profile.update({
      where: { userId: req.user!.id },
      data: { fiatBalance: profile.fiatBalance - amount }
    })
    return tx.bankAccount.upsert({
      where: { userId: req.user!.id },
      update: { balance: { increment: amount } },
      create: { userId: req.user!.id, balance: amount, rate: 0.01 }
    })
  })

  await createBankTransaction({
    userId: req.user!.id,
    direction: "deposit",
    amount,
    note: "Innskudd"
  })

  return res.json({ bank })
})

router.post("/withdraw", requireAuth, requireAlive, async (req, res) => {
  const schema = z.object({ amount: z.coerce.number().int().min(1) })
  const { amount } = schema.parse(req.body)

  const bank = await prisma.bankAccount.findUnique({ where: { userId: req.user!.id } })
  if (!bank || bank.balance < amount) {
    return res.status(400).json({ message: "Ikke nok USD i bank" })
  }

  await prisma.$transaction(async (tx) => {
    await tx.bankAccount.update({
      where: { userId: req.user!.id },
      data: { balance: bank.balance - amount }
    })
    await tx.profile.update({
      where: { userId: req.user!.id },
      data: { fiatBalance: { increment: amount } }
    })
  })

  await createBankTransaction({
    userId: req.user!.id,
    direction: "withdraw",
    amount,
    note: "Uttak"
  })

  return res.json({ success: true })
})

router.post("/transfer", requireAuth, requireAlive, async (req, res) => {
  const schema = z.object({
    recipient: z.string().min(3),
    amount: z.coerce.number().int().min(1)
  })
  const { recipient, amount } = schema.parse(req.body)

  const senderBank = await prisma.bankAccount.findUnique({ where: { userId: req.user!.id } })
  if (!senderBank || senderBank.balance < amount) {
    return res.status(400).json({ message: "Ikke nok USD i bank" })
  }

  const recipientUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: recipient },
        { profile: { displayName: recipient } }
      ]
    },
    include: { profile: true }
  })

  if (!recipientUser) {
    return res.status(404).json({ message: "Mottaker ikke funnet" })
  }

  if (recipientUser.id === req.user!.id) {
    return res.status(400).json({ message: "Du kan ikke overføre til deg selv" })
  }

  await prisma.$transaction(async (tx) => {
    await tx.bankAccount.update({
      where: { userId: req.user!.id },
      data: { balance: senderBank.balance - amount }
    })
    await tx.bankAccount.upsert({
      where: { userId: recipientUser.id },
      update: { balance: { increment: amount } },
      create: { userId: recipientUser.id, balance: amount, rate: 0.01 }
    })
  })

  await createBankTransaction({
    userId: req.user!.id,
    counterpartyId: recipientUser.id,
    direction: "transfer_out",
    amount,
    note: "Overføring"
  })

  await createBankTransaction({
    userId: recipientUser.id,
    counterpartyId: req.user!.id,
    direction: "transfer_in",
    amount,
    note: "Overføring"
  })

  await createNotification({
    userId: req.user!.id,
    type: "bank",
    category: "system",
    title: "Overføring sendt",
    body: `Du sendte ${amount} USD til ${recipientUser.profile?.displayName || recipientUser.email}.`,
    icon: "wallet",
    priority: 2
  })

  await createNotification({
    userId: recipientUser.id,
    type: "bank",
    category: "system",
    title: "Overføring mottatt",
    body: `Du mottok ${amount} USD.`,
    icon: "wallet",
    priority: 2
  })

  return res.json({ success: true })
})

export default router
