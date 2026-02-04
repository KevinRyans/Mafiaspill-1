import { io, Socket } from "socket.io-client"
import { getAccessToken } from "./auth"

let socket: Socket | null = null

export function getSocket() {
  if (!socket) {
    socket = io(import.meta.env.VITE_WS_URL, {
      auth: { token: getAccessToken() }
    })
  }
  return socket
}

export function resetSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
