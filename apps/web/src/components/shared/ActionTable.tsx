import Countdown from "./Countdown"

export type ActionRow = {
  id: string
  name: string
  chance: number
  risk: string
  reward: string
  endTime?: number | string | Date | null
  disabled?: boolean
}

export default function ActionTable({
  rows,
  onAction,
  actionLabel = "Utfør",
  showRisk = true,
  showReward = true
}: {
  rows: ActionRow[]
  onAction: (rowId: string) => void
  actionLabel?: string
  showRisk?: boolean
  showReward?: boolean
}) {
  const gridTemplate =
    showRisk && showReward
      ? "grid-cols-[1.4fr_0.6fr_0.7fr_0.7fr_0.6fr]"
      : showRisk && !showReward
      ? "grid-cols-[1.5fr_0.7fr_0.7fr_0.6fr]"
      : !showRisk && showReward
      ? "grid-cols-[1.5fr_0.7fr_0.7fr_0.6fr]"
      : "grid-cols-[1.7fr_0.8fr_0.6fr]"
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <div className={`grid ${gridTemplate} bg-coal/70 px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-mist/60`}>
        <span>Handling</span>
        <span>Sjanse</span>
        {showRisk ? <span>Risiko/Heat</span> : null}
        {showReward ? <span>Belønning</span> : null}
        <span>Status</span>
      </div>
      <div className="divide-y divide-white/5">
        {rows.map((row) => (
          <div key={row.id} className={`grid ${gridTemplate} items-center px-3 py-3 text-sm text-mist/70`}>
            <div className="text-white">{row.name}</div>
            <div>{row.chance}%</div>
            {showRisk ? <div>{row.risk}</div> : null}
            {showReward ? <div>{row.reward}</div> : null}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onAction(row.id)}
                disabled={row.disabled}
                className="rounded-lg bg-neon/20 px-2 py-1 text-[11px] text-neon transition-all duration-150 hover:-translate-y-0.5 hover:bg-neon/30 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-40"
              >
                {actionLabel}
              </button>
              {row.endTime ? <Countdown endTime={row.endTime} className="text-[11px]" /> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
