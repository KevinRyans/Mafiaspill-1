import { prisma } from "../db/client"

export async function createBankTransaction({
  userId,
  counterpartyId,
  direction,
  amount,
  note
}: {
  userId: string
  counterpartyId?: string | null
  direction: string
  amount: number
  note?: string
}) {
  return prisma.bankTransaction.create({
    data: {
      userId,
      counterpartyId: counterpartyId ?? null,
      direction,
      amount,
      note
    }
  })
}

export async function getBankLogs(userId: string, take = 20) {
  return prisma.bankTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      counterparty: { select: { email: true, profile: true } }
    }
  })
}
