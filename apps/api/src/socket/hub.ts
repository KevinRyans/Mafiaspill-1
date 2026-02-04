import { Server } from "socket.io"

let io: Server | null = null

export function setSocket(server: Server) {
  io = server
}

export function emitToCrew(crewId: string, event: string, payload: unknown) {
  io?.to(`crew:${crewId}`).emit(event, payload)
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload)
}
