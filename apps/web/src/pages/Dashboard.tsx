import { useEffect, useState } from "react"
import api from "../lib/api"
import AppShell from "../components/AppShell"
import PageHeader from "../components/PageHeader"
import StatCard from "../components/StatCard"
import ActionCard from "../components/ActionCard"
import Icon from "../components/Icon"
import { useSession } from "../hooks/useSession"
import banner from "../assets/banner-events.svg"
import Countdown from "../components/shared/Countdown"
import { formatNumber, formatUsd } from "../utils/format"

export default function Dashboard() {
  const { profile, inventory, loading, reload, contacts } = useSession()
  const [feed, setFeed] = useState<string[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [challenges, setChallenges] = useState<any>({ daily: [], weekly: [] })
  const downUntil = profile?.downUntil ? new Date(profile.downUntil).getTime() : null

  useEffect(() => {
    api.get("/world/feed").then((res) => {
      setFeed(res.data.headlines)
      setEvents(res.data.events)
    })
    api.get("/missions/challenges").then((res) => setChallenges(res.data))
  }, [])

  if (loading || !profile) {
    return <div className="p-6 text-mist/70">Laster...</div>
  }

  return (
    <AppShell>
      <PageHeader
        title={`Velkommen, ${profile.displayName}`}
        subtitle="Kontrollrom"
        description="Hold liv og forsvar oppe, og velg neste handling."
        banner={banner}
      />
      {downUntil && downUntil > Date.now() ? (
        <div className="mb-4 rounded-2xl border border-ember/40 bg-ember/10 p-3 text-xs text-ember">
          Du er satt ut av spill i <Countdown endTime={downUntil} />. Kjøp livvakter før du går på oppdrag igjen.
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard label="Respekt" value={formatNumber(profile.respect)} tone="gold" hint="Poeng" icon="spark" />
        <StatCard label="Liv" value={`${profile.health}%`} tone="signal" hint="Overlevelse" icon="badge" />
        <StatCard label="Forsvar" value={formatNumber(profile.defense)} tone="neon" hint="Livvakter" icon="shield" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="glass rounded-2xl p-5 shadow-card lg:col-span-2">
          <h3 className="text-lg font-semibold text-white">Nyhetsfeed</h3>
          <div className="mt-3 space-y-3 text-sm text-mist/70">
            {feed.map((item, index) => (
              <div key={index} className="flex items-center gap-2 rounded-xl bg-coal/60 p-3">
                <Icon name="signal" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs text-mist/50">Aktive events: {events.length}</div>
        </div>
        <div className="flex flex-col gap-4">
          <ActionCard
            title="Hva nå?"
            body="Velg kriminalitet, biltyveri eller oppdrag for rask progresjon."
            action="Se kriminalitet"
            icon="spark"
            onClick={() => (window.location.href = "/crime")}
          />
          <div className="glass rounded-2xl p-4 shadow-card">
            <h4 className="text-sm font-semibold text-white">Dagens oppdrag</h4>
            <ul className="mt-3 space-y-2 text-xs text-mist/70">
              {challenges.daily.map((task: any) => (
                <li key={task.id} className="rounded-lg bg-coal/70 p-2">
                  {task.text} (+{formatUsd(task.reward)})
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-2xl p-5 shadow-card">
          <h3 className="text-lg font-semibold text-white">Inventar</h3>
          <div className="mt-3 grid gap-3">
            {inventory.slice(0, 4).map((item: any) => (
              <div key={item.id} className="rounded-xl bg-coal/60 p-3 text-sm text-mist/70">
                {item.item.name} x{item.quantity}
              </div>
            ))}
          </div>
        </div>
        <div className="glass rounded-2xl p-5 shadow-card">
          <h3 className="text-lg font-semibold text-white">Crew og kontakter</h3>
          <p className="mt-2 text-sm text-mist/70">
            Kontakter: {contacts ?? 0} | Familie gir bonus og sosialt spill.
          </p>
          <button
            onClick={() => (window.location.href = "/contacts")}
            className="mt-4 rounded-xl bg-signal/20 px-4 py-2 text-sm font-semibold text-signal"
          >
            Gå til kontakter
          </button>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/10 bg-coal/60 p-4 text-xs text-mist/60">
        <span>Forsvar: {formatNumber(profile.defense)} | Energi: {profile.energy}</span>
        <button onClick={reload} className="text-neon">Oppdater stats</button>
      </div>
    </AppShell>
  )
}
