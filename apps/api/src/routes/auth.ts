import { Router } from "express"
import bcrypt from "bcryptjs"
import { z } from "zod"
import speakeasy from "speakeasy"
import QRCode from "qrcode"
import { prisma } from "../db/client"
import { env, isProd } from "../config/env"
import { authLimiter } from "../middleware/rateLimit"
import { requireAuth } from "../middleware/auth"
import { requireCsrf } from "../middleware/csrf"
import { createRandomToken, hashToken } from "../utils/security"
import { signAccessToken } from "../utils/jwt"
import { parseDuration } from "../utils/duration"

const router = Router()

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(3).max(32)
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  totp: z.string().optional()
})

function setAuthCookies(res: any, refreshToken: string, csrfToken: string) {
  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/"
  })
  res.cookie("csrf_token", csrfToken, {
    httpOnly: false,
    sameSite: "lax",
    secure: isProd,
    path: "/"
  })
}

async function issueTokens(userId: string, role: string, res: any, userAgent?: string, ip?: string) {
  const accessToken = signAccessToken({ sub: userId, role })
  const refreshToken = createRandomToken(32)
  const tokenHash = hashToken(refreshToken)
  const expiresAt = new Date(Date.now() + parseDuration(env.JWT_REFRESH_EXPIRES_IN))
  const csrfToken = createRandomToken(16)

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      userAgent,
      ip,
      expiresAt
    }
  })

  setAuthCookies(res, refreshToken, csrfToken)

  return { accessToken, csrfToken }
}

router.post("/register", authLimiter, async (req, res) => {
  const { email, password, displayName } = registerSchema.parse(req.body)
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return res.status(409).json({ message: "Email already registered" })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: "player",
      profile: { create: { displayName } },
      inventory: { create: {} }
    },
    select: { id: true, role: true, email: true }
  })

  const verificationToken = createRandomToken(24)
  await prisma.emailVerification.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(verificationToken),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  })

  const { accessToken, csrfToken } = await issueTokens(
    user.id,
    user.role,
    res,
    req.headers["user-agent"],
    req.ip
  )

  return res.status(201).json({
    user,
    accessToken,
    csrfToken,
    verificationToken
  })
})

router.post("/login", authLimiter, async (req, res) => {
  const { email, password, totp } = loginSchema.parse(req.body)
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return res.status(401).json({ message: "Ugyldige innloggingsdetaljer" })
  }
  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return res.status(401).json({ message: "Ugyldige innloggingsdetaljer" })
  }

  if (user.twoFactorEnabled) {
    if (!totp) {
      return res.status(200).json({ requiresTwoFactor: true })
    }
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret || "",
      encoding: "base32",
      token: totp,
      window: 1
    })
    if (!verified) {
      return res.status(401).json({ message: "Ugyldig 2FA-kode" })
    }
  }

  const { accessToken, csrfToken } = await issueTokens(
    user.id,
    user.role,
    res,
    req.headers["user-agent"],
    req.ip
  )

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })

  return res.json({
    user: { id: user.id, email: user.email, role: user.role },
    accessToken,
    csrfToken
  })
})

router.post("/refresh", requireCsrf, async (req, res) => {
  const refreshToken = req.cookies?.refresh_token
  if (!refreshToken) {
    return res.status(401).json({ message: "Mangler refresh-token" })
  }
  const tokenHash = hashToken(refreshToken)
  const stored = await prisma.refreshToken.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() }
    }
  })
  if (!stored) {
    return res.status(401).json({ message: "Refresh token invalid" })
  }

  const user = await prisma.user.findUnique({ where: { id: stored.userId } })
  if (!user) {
    return res.status(401).json({ message: "Bruker ikke funnet" })
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() }
  })

  const { accessToken, csrfToken } = await issueTokens(
    user.id,
    user.role,
    res,
    req.headers["user-agent"],
    req.ip
  )

  return res.json({ accessToken, csrfToken })
})

router.post("/logout", requireCsrf, async (req, res) => {
  const refreshToken = req.cookies?.refresh_token
  if (refreshToken) {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() }
    })
  }
  res.clearCookie("refresh_token")
  res.clearCookie("csrf_token")
  return res.json({ success: true })
})

router.post("/verify-email", async (req, res) => {
  const schema = z.object({ token: z.string().min(10) })
  const { token } = schema.parse(req.body)
  const tokenHash = hashToken(token)
  const record = await prisma.emailVerification.findFirst({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } }
  })
  if (!record) {
    return res.status(400).json({ message: "Token invalid or expired" })
  }

  await prisma.emailVerification.update({
    where: { id: record.id },
    data: { usedAt: new Date() }
  })
  await prisma.user.update({
    where: { id: record.userId },
    data: { emailVerifiedAt: new Date() }
  })

  return res.json({ success: true })
})

router.post("/request-password-reset", authLimiter, async (req, res) => {
  const schema = z.object({ email: z.string().email() })
  const { email } = schema.parse(req.body)
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return res.json({ success: true })
  }

  const token = createRandomToken(24)
  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000)
    }
  })

  return res.json({ success: true, resetToken: token })
})

router.post("/reset-password", async (req, res) => {
  const schema = z.object({ token: z.string().min(10), password: z.string().min(8) })
  const { token, password } = schema.parse(req.body)
  const tokenHash = hashToken(token)
  const record = await prisma.passwordReset.findFirst({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } }
  })
  if (!record) {
    return res.status(400).json({ message: "Token invalid or expired" })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  await prisma.passwordReset.update({ where: { id: record.id }, data: { usedAt: new Date() } })
  await prisma.user.update({ where: { id: record.userId }, data: { passwordHash } })

  return res.json({ success: true })
})

router.post("/2fa/setup", requireAuth, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Ikke autentisert" })
  }
  const secret = speakeasy.generateSecret({ name: `Mafiaspill (${req.user.email})` })
  await prisma.user.update({
    where: { id: req.user.id },
    data: { twoFactorSecret: secret.base32 }
  })

  const qrDataUrl = secret.otpauth_url ? await QRCode.toDataURL(secret.otpauth_url) : null

  return res.json({
    otpauthUrl: secret.otpauth_url,
    manualKey: secret.base32,
    qrDataUrl
  })
})

router.post("/2fa/verify", requireAuth, async (req, res) => {
  const schema = z.object({ token: z.string().min(6) })
  const { token } = schema.parse(req.body)
  const user = await prisma.user.findUnique({ where: { id: req.user?.id } })
  if (!user?.twoFactorSecret) {
    return res.status(400).json({ message: "2FA not initialized" })
  }

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: "base32",
    token,
    window: 1
  })
  if (!verified) {
    return res.status(400).json({ message: "Ugyldig kode" })
  }

  await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } })
  return res.json({ success: true })
})

export default router
