import { useEffect } from "react"
import { useCountdown } from "../../hooks/useCountdown"

export default function Countdown({
  endTime,
  onDone,
  readyLabel = "Klar",
  className
}: {
  endTime?: number | string | Date | null
  onDone?: () => void
  readyLabel?: string
  className?: string
}) {
  const { formatted, isDone } = useCountdown(endTime)

  useEffect(() => {
    if (isDone && onDone) {
      onDone()
    }
  }, [isDone, onDone])

  return <span className={className}>{isDone ? readyLabel : formatted}</span>
}
