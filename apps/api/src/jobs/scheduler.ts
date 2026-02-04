import cron from "node-cron"
import { prisma } from "../db/client"
import { createNotification } from "../services/notifications"

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

export function startScheduler() {
  cron.schedule("*/1 * * * *", async () => {
    const now = new Date()

    await prisma.worldEvent.updateMany({
      where: { startsAt: { lte: now }, endsAt: { gt: now } },
      data: { active: true }
    })

    await prisma.worldEvent.updateMany({
      where: { endsAt: { lte: now } },
      data: { active: false }
    })

    const dueJobs = await prisma.scheduledJob.findMany({
      where: { runAt: { lte: now }, status: "pending" }
    })

    for (const job of dueJobs) {
      if (job.name === "broadcast" && job.payload) {
        const payload = job.payload as any
        if (payload.userId) {
          await prisma.notification.create({
            data: {
              userId: payload.userId,
              type: "system",
              category: "system",
              title: payload.title || "System melding",
              body: payload.body || ""
            }
          })
        }
      }

      await prisma.scheduledJob.update({
        where: { id: job.id },
        data: { status: "done", lastRunAt: now }
      })
    }

    const cities = await prisma.city.findMany()
    for (const city of cities) {
      const delta = Math.floor(Math.random() * 5) - 2
      await prisma.city.update({
        where: { id: city.id },
        data: {
          controlLevel: clamp(city.controlLevel + delta),
          politicalPressure: clamp(city.politicalPressure + delta),
          economicHeat: clamp(city.economicHeat + (delta * -1)),
          riskIndex: clamp(city.riskIndex + Math.floor(delta / 2))
        }
      })
    }

    const heatRows = await prisma.cityHeat.findMany()
    for (const row of heatRows) {
      if (now.getTime() - row.updatedAt.getTime() < 10 * 60 * 1000) {
        continue
      }
      const delta = Math.floor(Math.random() * 9) - 4
      await prisma.cityHeat.update({
        where: { id: row.id },
        data: { heat: clamp(row.heat + delta) }
      })
    }

    const duePrisoners = await prisma.prisonInmate.findMany({
      where: { jailedUntil: { lte: now } }
    })

    for (const inmate of duePrisoners) {
      await prisma.prisonInmate.delete({ where: { id: inmate.id } })
      await createNotification({
        userId: inmate.userId,
        type: "prison",
        category: "sikkerhet",
        title: "Du er fri",
        body: "Fengselstiden er over. Hold lav profil en stund.",
        icon: "check",
        priority: 2
      })
    }

    const dueTravels = await prisma.travelQueue.findMany({
      where: { arriveAt: { lte: now } }
    })

    for (const travel of dueTravels) {
      await prisma.$transaction(async (tx) => {
        await tx.userLocation.upsert({
          where: { userId: travel.userId },
          update: { cityId: travel.toCityId },
          create: { userId: travel.userId, cityId: travel.toCityId }
        })

        await tx.travelLog.create({
          data: {
            userId: travel.userId,
            fromCityId: travel.fromCityId,
            toCityId: travel.toCityId,
            cost: 120,
            riskDelta: 2
          }
        })

        await tx.travelQueue.delete({ where: { userId: travel.userId } })
      })

      await createNotification({
        userId: travel.userId,
        type: "travel",
        category: "system",
        title: "Reise fullført",
        body: "Du er fremme og kan handle i ny by.",
        icon: "travel",
        priority: 2
      })
    }

    const downedPlayers = await prisma.profile.findMany({
      where: { downUntil: { lte: now } }
    })

    for (const player of downedPlayers) {
      await prisma.profile.update({
        where: { id: player.id },
        data: { downUntil: null }
      })

      await createNotification({
        userId: player.userId,
        type: "system",
        category: "sikkerhet",
        title: "Tilbake i spill",
        body: "Du kan igjen utføre handlinger. Vurder å kjøpe forsvar.",
        icon: "check",
        priority: 2
      })
    }
  })
}
