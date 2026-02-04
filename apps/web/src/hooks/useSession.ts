import { useCallback, useEffect, useState } from "react"
import api from "../lib/api"

export type SessionState = {
  profile: any | null
  inventory: any[]
  contacts?: number
  cooldowns?: {
    missionEndsAt?: number | null
    travelEndsAt?: number | null
    travelCooldownEndsAt?: number | null
    crimeEndsAt?: number | null
    carTheftEndsAt?: number | null
    houseRobberyEndsAt?: number | null
    playerRobberyEndsAt?: number | null
    prisonEndsAt?: number | null
    fightClubEndsAt?: number | null
  }
  loading: boolean
}

export function useSession() {
  const [state, setState] = useState<SessionState>({
    profile: null,
    inventory: [],
    cooldowns: {},
    loading: true
  })

  const load = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true }))
      const response = await api.get("/profile/me")
      setState({
        profile: response.data.profile,
        inventory: response.data.inventory,
        contacts: response.data.contacts ?? 0,
        cooldowns: response.data.cooldowns || {},
        loading: false
      })
    } catch (err) {
      setState((prev) => ({ ...prev, loading: false }))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const handler = () => {
      load()
    }
    window.addEventListener("mafiaspill:session", handler)
    return () => window.removeEventListener("mafiaspill:session", handler)
  }, [load])

  return { ...state, reload: load }
}
