import { describe, expect, it } from "vitest"
import { parseDuration } from "../utils/duration"
import { createRandomToken, hashToken } from "../utils/security"

describe("auth helpers", () => {
  it("parses duration", () => {
    expect(parseDuration("15m")).toBe(900000)
    expect(parseDuration("2h")).toBe(7200000)
  })

  it("hashes tokens deterministically", () => {
    const token = "sample-token"
    expect(hashToken(token)).toBe(hashToken(token))
  })

  it("creates random tokens", () => {
    const token = createRandomToken(16)
    expect(token.length).toBeGreaterThan(10)
  })
})
