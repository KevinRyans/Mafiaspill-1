import { prisma } from "../db/client"
import { createNotification } from "./notifications"

export async function unlockAchievement(userId: string, code: string) {
  const achievement = await prisma.achievement.findUnique({ where: { code } })
  if (!achievement) {
    return null
  }

  const existing = await prisma.userAchievement.findUnique({
    where: { userId_achievementId: { userId, achievementId: achievement.id } }
  })

  if (existing) {
    return existing
  }

  const unlocked = await prisma.userAchievement.create({
    data: {
      userId,
      achievementId: achievement.id
    }
  })

  await createNotification({
    userId,
    type: "achievement",
    category: "progress",
    title: `Achievement: ${achievement.name}`,
    body: achievement.description,
    icon: achievement.icon || "badge",
    priority: 2
  })

  return unlocked
}
