import { prisma } from "../db/client"
import { emitToUser } from "../socket/hub"

export async function createNotification(params: {
  userId: string
  type: string
  category?: string
  title: string
  body: string
  icon?: string
  priority?: number
  hidden?: boolean
  revealAt?: Date | null
}) {
  const record = await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      category: params.category ?? "system",
      title: params.title,
      body: params.body,
      icon: params.icon,
      priority: params.priority ?? 1,
      hidden: params.hidden ?? false,
      revealAt: params.revealAt ?? null
    }
  })

  if (!record.hidden) {
    emitToUser(params.userId, "notification:new", record)
  }

  return record
}

export async function revealNotificationsForUser(userId: string) {
  const now = new Date()
  const hidden = await prisma.notification.findMany({
    where: {
      userId,
      hidden: true,
      revealAt: { lte: now }
    }
  })

  if (hidden.length) {
    await prisma.notification.updateMany({
      where: { id: { in: hidden.map((item) => item.id) } },
      data: { hidden: false }
    })

    hidden.forEach((item) => emitToUser(userId, "notification:new", { ...item, hidden: false }))
  }
}
