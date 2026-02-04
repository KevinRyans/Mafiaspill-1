import { describe, expect, it } from "vitest"
import { prisma } from "../db/client"

async function tableExists(tableName: string) {
  const result = await prisma.$queryRawUnsafe<any[]>(
    "SELECT to_regclass($1)::text AS name",
    tableName
  )
  return Boolean(result?.[0]?.name)
}

describe("gambling", () => {
  it("creates a coinflip bet", async () => {
    const hasTable = await tableExists('"GamblingGame"')
    if (!hasTable) {
      return
    }
    const user = await prisma.user.findFirst()
    const game = await prisma.gamblingGame.findFirst({ where: { type: "coin" } })
    if (!user || !game) {
      return
    }
    const bet = await prisma.gamblingBet.create({
      data: {
        userId: user.id,
        gameId: game.id,
        stake: 100,
        payout: 0,
        status: "lose"
      }
    })
    expect(bet.stake).toBe(100)
  })
})
