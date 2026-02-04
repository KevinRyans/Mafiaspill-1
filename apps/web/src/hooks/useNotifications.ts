import { useCallback, useEffect, useState } from "react"
import api from "../lib/api"
import { getSocket } from "../lib/socket"

export type NotificationItem = {
  id: string
  title: string
  body: string
  category: string
  icon?: string
  createdAt: string
  readAt?: string | null
}

export function useNotifications() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unread, setUnread] = useState(0)

  const load = useCallback(async () => {
    const [listRes, countRes] = await Promise.all([
      api.get("/notifications"),
      api.get("/notifications/unread")
    ])
    setItems(listRes.data.notifications)
    setUnread(countRes.data.count)
  }, [])

  const markRead = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return
      await api.post("/notifications/read", { ids })
      await load()
    },
    [load]
  )

  useEffect(() => {
    load()
    const socket = getSocket()
    socket.on("notification:new", () => {
      load()
    })
    return () => {
      socket.off("notification:new")
    }
  }, [load])

  return { items, unread, reload: load, markRead }
}
