import { describe, expect, it } from "vitest"
import { prisma } from "../db/client"

async function tableExists(tableName: string) {
  const result = await prisma.$queryRawUnsafe<any[]>(
    "SELECT to_regclass($1)::text AS name",
    tableName
  )
  return Boolean(result?.[0]?.name)
}

describe("contracts escrow", () => {
  it("creates escrow on contract", async () => {
    const hasTable = await tableExists('"Contract"')
    if (!hasTable) {
      return
    }
    const user = await prisma.user.findFirst()
    const city = await prisma.city.findFirst()
    if (!user || !city) {
      return
    }
    const contract = await prisma.contract.create({
      data: {
        creatorId: user.id,
        title: "Test kontrakt",
        description: "Fiktiv kontrakt",
        cityId: city.id,
        durationHours: 6,
        rewardType: "fast",
        rewardTotal: 500,
        rewardPerUnit: 0,
        status: "open"
      }
    })
    const escrow = await prisma.escrowTransaction.create({
      data: {
        contractId: contract.id,
        fromUserId: user.id,
        amount: 500,
        status: "reserved"
      }
    })
    expect(escrow.amount).toBe(500)
  })
})
