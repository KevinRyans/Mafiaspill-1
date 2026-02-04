import crypto from "node:crypto"

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

export function createRandomToken(size = 32): string {
  return crypto.randomBytes(size).toString("hex")
}

export function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) {
    return false
  }
  return crypto.timingSafeEqual(aBuf, bBuf)
}
