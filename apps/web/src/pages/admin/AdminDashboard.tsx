import { FormEvent, useEffect, useState } from "react"
import AppShell from "../../components/AppShell"
import PageHeader from "../../components/PageHeader"
import api from "../../lib/api"
import { formatUsd } from "../../utils/format"

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [disputes, setDisputes] = useState<any[]>([])
  const [banUserId, setBanUserId] = useState("")
  const [banReason, setBanReason] = useState("")
  const [message, setMessage] = useState("")
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    effectType: "market",
    impactValue: 1.1,
    startsAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString()
  })

  const load = async () => {
    const userRes = await api.get(`${import.meta.env.VITE_ADMIN_ROUTE}/users`)
    const logRes = await api.get(`${import.meta.env.VITE_ADMIN_ROUTE}/audit`)
    const cityRes = await api.get(`${import.meta.env.VITE_ADMIN_ROUTE}/world-state`)
    const disputeRes = await api.get(`${import.meta.env.VITE_ADMIN_ROUTE}/disputes`)
    setUsers(userRes.data.users)
    setLogs(logRes.data.logs)
    setCities(cityRes.data.cities)
    setDisputes(disputeRes.data.disputes)
  }

  useEffect(() => {
    load()
  }, [])

  const ban = async (event: FormEvent) => {
    event.preventDefault()
    setMessage("")
    await api.post(`${import.meta.env.VITE_ADMIN_ROUTE}/ban`, {
      userId: banUserId,
      type: "ban",
      reason: banReason
    })
    setMessage("Ban registrert")
    await load()
  }

  const updateCity = async (cityId: string, key: string, value: number) => {
    await api.patch(`${import.meta.env.VITE_ADMIN_ROUTE}/world-state/${cityId}`, { [key]: value })
    await load()
  }

  const updateDispute = async (disputeId: string, status: string) => {
    await api.patch(`${import.meta.env.VITE_ADMIN_ROUTE}/disputes/${disputeId}`, { status })
    await load()
  }

  const createEvent = async (event: FormEvent) => {
    event.preventDefault()
    await api.post(`${import.meta.env.VITE_ADMIN_ROUTE}/world-events`, eventForm)
    setMessage("World event utløst")
    await load()
  }

  return (
    <AppShell>
      <PageHeader title="Kontrollrom" subtitle="Skjult admin" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-2xl p-4 shadow-card">
          <h3 className="text-lg font-semibold text-white">Brukerhåndtering</h3>
          <div className="mt-3 space-y-2 text-xs text-mist/70">
            {users.map((user) => (
              <div key={user.id} className="rounded-xl bg-coal/70 p-2">
                {user.email} ({user.role}) - {formatUsd(user.profile?.fiatBalance)}
              </div>
            ))}
          </div>
        </div>
        <div className="glass rounded-2xl p-4 shadow-card">
          <h3 className="text-lg font-semibold text-white">Ban bruker</h3>
          <form onSubmit={ban} className="mt-3 flex flex-col gap-3">
            <input
              className="rounded-xl bg-coal/70 px-3 py-2 text-sm text-white"
              placeholder="Bruker-ID"
              value={banUserId}
              onChange={(e) => setBanUserId(e.target.value)}
            />
            <input
              className="rounded-xl bg-coal/70 px-3 py-2 text-sm text-white"
              placeholder="Årsak"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
            />
            <button className="rounded-xl bg-ember/20 px-3 py-2 text-sm text-ember">Ban</button>
          </form>
          {message ? <p className="mt-2 text-xs text-neon">{message}</p> : null}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-2xl p-4 shadow-card">
          <h3 className="text-lg font-semibold text-white">World-kontroll</h3>
          <div className="mt-3 space-y-3 text-xs text-mist/70">
            {cities.map((city) => (
              <div key={city.id} className="rounded-xl bg-coal/70 p-3">
                <div className="text-sm text-white">{city.name}</div>
                <div className="mt-2 grid gap-2">
                  {(["controlLevel", "politicalPressure", "economicHeat", "riskIndex"] as const).map((key) => (
                    <label key={key} className="flex items-center justify-between gap-2">
                      <span>{key}</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        className="w-20 rounded bg-coal/80 px-2 py-1 text-xs text-white"
                        value={city[key]}
                        onChange={(e) => updateCity(city.id, key, Number(e.target.value))}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="glass rounded-2xl p-4 shadow-card">
          <h3 className="text-lg font-semibold text-white">Utløs world event</h3>
          <form onSubmit={createEvent} className="mt-3 flex flex-col gap-2 text-xs">
            <input
              className="rounded-xl bg-coal/70 px-3 py-2 text-xs text-white"
              placeholder="Tittel"
              value={eventForm.title}
              onChange={(e) => setEventForm((prev) => ({ ...prev, title: e.target.value }))}
            />
            <input
              className="rounded-xl bg-coal/70 px-3 py-2 text-xs text-white"
              placeholder="Beskrivelse"
              value={eventForm.description}
              onChange={(e) => setEventForm((prev) => ({ ...prev, description: e.target.value }))}
            />
            <input
              className="rounded-xl bg-coal/70 px-3 py-2 text-xs text-white"
              placeholder="Effekttype"
              value={eventForm.effectType}
              onChange={(e) => setEventForm((prev) => ({ ...prev, effectType: e.target.value }))}
            />
            <input
              className="rounded-xl bg-coal/70 px-3 py-2 text-xs text-white"
              type="number"
              step="0.1"
              value={eventForm.impactValue}
              onChange={(e) => setEventForm((prev) => ({ ...prev, impactValue: Number(e.target.value) }))}
            />
            <input
              className="rounded-xl bg-coal/70 px-3 py-2 text-xs text-white"
              value={eventForm.startsAt}
              onChange={(e) => setEventForm((prev) => ({ ...prev, startsAt: e.target.value }))}
            />
            <input
              className="rounded-xl bg-coal/70 px-3 py-2 text-xs text-white"
              value={eventForm.endsAt}
              onChange={(e) => setEventForm((prev) => ({ ...prev, endsAt: e.target.value }))}
            />
            <button className="rounded-xl bg-neon/20 px-3 py-2 text-xs text-neon">Utløs</button>
          </form>
        </div>
      </div>

      <div className="mt-6 glass rounded-2xl p-4 shadow-card">
        <h3 className="text-lg font-semibold text-white">Konflikter (tvister)</h3>
        <div className="mt-3 space-y-2 text-xs text-mist/70">
          {disputes.map((dispute) => (
            <div key={dispute.id} className="rounded-xl bg-coal/70 p-3">
              <div className="text-white">{dispute.reason}</div>
              <div className="mt-1 text-[11px] text-mist/50">Status: {dispute.status}</div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => updateDispute(dispute.id, "resolved")}
                  className="rounded-xl bg-neon/20 px-2 py-1 text-[11px] text-neon"
                >
                  Løs
                </button>
                <button
                  onClick={() => updateDispute(dispute.id, "rejected")}
                  className="rounded-xl bg-ember/20 px-2 py-1 text-[11px] text-ember"
                >
                  Avvis
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 glass rounded-2xl p-4 shadow-card">
        <h3 className="text-lg font-semibold text-white">Audit-logg</h3>
        <div className="mt-3 space-y-2 text-xs text-mist/70">
          {logs.map((log) => (
            <div key={log.id} className="rounded-xl bg-coal/70 p-2">
              {log.action} - {log.targetType} - {new Date(log.createdAt).toLocaleString()}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
