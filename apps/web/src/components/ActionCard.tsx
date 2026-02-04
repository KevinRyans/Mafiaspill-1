import Icon from "./Icon"

type ActionCardProps = {
  title: string
  body: string
  action: string
  onClick?: () => void
  icon?: "spark" | "market" | "crew" | "signal" | "warning"
}

export default function ActionCard({ title, body, action, onClick, icon = "spark" }: ActionCardProps) {
  return (
    <div className="glass rounded-2xl p-4 shadow-card">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
        <Icon name={icon as any} />
        {title}
      </h3>
      <p className="mt-2 text-sm text-mist/70">{body}</p>
      <button
        onClick={onClick}
        className="mt-4 rounded-xl bg-neon/20 px-4 py-2 text-sm font-semibold text-neon transition-all duration-150 hover:-translate-y-0.5 hover:bg-neon/30 hover:shadow-glow"
      >
        {action}
      </button>
    </div>
  )
}
