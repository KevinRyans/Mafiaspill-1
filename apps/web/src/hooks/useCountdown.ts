import { useEffect, useMemo, useState } from "react"
import { formatDuration } from "../utils/time"

export function useCountdown(endTime?: number | string | Date | null) {
  const target = useMemo(() => {
    if (!endTime) return null
    if (endTime instanceof Date) return endTime.getTime()
    if (typeof endTime === "string") {
      const parsed = Date.parse(endTime)
      return Number.isNaN(parsed) ? null : parsed
    }
    return endTime
  }, [endTime])

  const [remainingMs, setRemainingMs] = useState(() => (target ? target - Date.now() : 0))

  useEffect(() => {
    if (!target) {
      setRemainingMs(0)
      return
    }

    const tick = () => {
      setRemainingMs(target - Date.now())
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [target])

  const isDone = remainingMs <= 0
  const formatted = formatDuration(remainingMs)

  return { remainingMs, formatted, isDone }
}
