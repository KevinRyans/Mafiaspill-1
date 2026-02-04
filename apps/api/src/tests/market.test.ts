import { describe, expect, it } from "vitest"
import { calculateMarketPrice } from "@mafiaspill/shared"

describe("market pricing", () => {
  it("responds to demand", () => {
    const low = calculateMarketPrice({ basePrice: 100, supply: 10, demand: 2, eventImpact: 1, complianceRisk: 0 })
    const high = calculateMarketPrice({ basePrice: 100, supply: 2, demand: 10, eventImpact: 1, complianceRisk: 0 })
    expect(high.price).toBeGreaterThan(low.price)
  })
})
