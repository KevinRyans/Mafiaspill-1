import Icon from "../Icon"

export default function ResultAlert({
  tone,
  title,
  message
}: {
  tone: "success" | "error" | "info"
  title: string
  message: string
}) {
  const toneClass =
    tone === "success"
      ? "border-neon/40 bg-neon/10 text-neon"
      : tone === "error"
      ? "border-ember/40 bg-ember/10 text-ember"
      : "border-signal/40 bg-signal/10 text-signal"

  const iconName = tone === "success" ? "check" : tone === "error" ? "warning" : "signal"

  return (
    <div className={`rounded-2xl border p-3 text-xs ${toneClass}`}>
      <div className="flex items-center gap-2 text-white">
        <Icon name={iconName as any} />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="mt-1 text-xs text-mist/70">{message}</div>
    </div>
  )
}
