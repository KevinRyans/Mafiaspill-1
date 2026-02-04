import Icon from "./Icon"

type StatCardProps = {
  label: string
  value: string | number
  hint?: string
  tone?: "neon" | "gold" | "signal" | "ember"
  icon?: "spark" | "warning" | "signal" | "wallet" | "badge" | "shield"
}

export default function StatCard({ label, value, hint, tone = "neon", icon = "spark" }: StatCardProps) {
  const toneClass = {
    neon: "text-neon",
    gold: "text-gold",
    signal: "text-signal",
    ember: "text-ember"
  }[tone]

  return (
    <div className="glass rounded-2xl p-4 shadow-card">
      <p className="text-xs uppercase tracking-[0.2em] text-mist/60">{label}</p>
      <p className={`mt-2 flex items-center gap-2 text-2xl font-semibold ${toneClass}`}>
        <Icon name={icon as any} />
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-mist/60">{hint}</p> : null}
    </div>
  )
}
