import { Server } from "socket.io"
import { isAllowedOrigin } from "../config/env"
import { verifyAccessToken } from "../utils/jwt"
import { prisma } from "../db/client"
import { setSocket } from "./hub"

export function initSocket(server: any) {
  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) return callback(null, true)
        return callback(new Error("Not allowed by CORS"))
      },
      credentials: true
    }
  })

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) {
      return next(new Error("Missing token"))
    }
    try {
      const payload = verifyAccessToken(token)
      socket.data.userId = payload.sub
      return next()
    } catch (err) {
      return next(new Error("Invalid token"))
    }
  })

  io.on("connection", async (socket) => {
    const userId = socket.data.userId as string
    socket.join(`user:${userId}`)

    const membership = await prisma.crewMember.findFirst({ where: { userId } })
    if (membership) {
      socket.join(`crew:${membership.crewId}`)
    }

    socket.on("ping", () => {
      socket.emit("pong", { ts: Date.now() })
    })
  })

  setSocket(io)

  return io
}
