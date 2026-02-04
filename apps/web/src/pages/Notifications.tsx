import { useState } from "react"
import AppShell from "../components/AppShell"
import PageHeader from "../components/PageHeader"
import Icon from "../components/Icon"
import { useNotifications } from "../hooks/useNotifications"

const categories = [
  { id: "all", label: "Alle" },
  { id: "system", label: "System" },
  { id: "market", label: "Marked" },
  { id: "crew", label: "Crew" },
  { id: "kontrakter", label: "Kontrakter" },
  { id: "gambling", label: "Pengespill" },
  { id: "sikkerhet", label: "Sikkerhet/Heat" }
]

export default function Notifications() {
  const { items, markRead } = useNotifications()
  const [active, setActive] = useState("all")

  const unreadIds = items.filter((item) => !item.readAt).map((item) => item.id)
  const filtered = active === "all" ? items : items.filter((item) => item.category === active)

  return (
    <AppShell>
      <PageHeader title="Varsler" subtitle="Feedback og hendelser" />
      <div className="mb-4 flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setActive(category.id)}
            className={`rounded-full border border-white/10 px-3 py-1 text-xs ${active === category.id ? "bg-neon/30 text-white" : "text-mist/70"}`}
          >
            {category.label}
          </button>
        ))}
      </div>
      <button
        onClick={() => markRead(unreadIds)}
        className="mb-4 rounded-xl bg-neon/20 px-3 py-2 text-xs text-neon"
      >
        Marker alle som lest
      </button>
      <div className="grid gap-3">
        {filtered.map((item) => (
          <div key={item.id} className="glass rounded-2xl p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-coal/70 p-2 text-neon">
                <Icon name={(item.icon as any) || "signal"} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-white">{item.title}</div>
                <div className="text-xs text-mist/70">{item.body}</div>
              </div>
              {!item.readAt ? <span className="text-xs text-ember">NY</span> : null}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  )
}
