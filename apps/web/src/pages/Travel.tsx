import { useEffect, useState } from "react"
import AppShell from "../components/AppShell"
import PageHeader from "../components/PageHeader"
import Icon from "../components/Icon"
import api from "../lib/api"
import banner from "../assets/banner-travel.svg"
import { useToasts } from "../components/ToastProvider"
import Countdown from "../components/shared/Countdown"
import ResultAlert from "../components/shared/ResultAlert"
import { formatUsd } from "../utils/format"
import { getHeatClass, getHeatLabel } from "../utils/heat"

export default function Travel() {
  const [cities, setCities] = useState<any[]>([])
  const [current, setCurrent] = useState<any>(null)
  const [queue, setQueue] = useState<any>(null)
  const [price, setPrice] = useState(0)
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null)
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null)
  const { push } = useToasts()

  const load = async () => {
    const res = await api.get("/travel/cities")
    setCities(res.data.cities)
    setCurrent(res.data.location)
    setQueue(res.data.queue)
    setPrice(res.data.price || 0)
    setCooldownEndsAt(res.data.cooldownEndsAt || null)
  }

  useEffect(() => {
    load()
  }, [])

  const travel = async (cityId: string) => {
    setMessage(null)
    try {
      const res = await api.post("/travel/start", { toCityId: cityId })
      window.dispatchEvent(new Event("mafiaspill:session"))
      if (res.data.cooldownEndsAt) {
        setCooldownEndsAt(res.data.cooldownEndsAt)
      }
      if (res.data.arriveAt) {
        const city = cities.find((entry) => entry.id === cityId)
        setQueue({ toCity: city ? { name: city.name } : null, arriveAt: res.data.arriveAt })
      }
      push({ title: "Reise startet", body: "Du er på vei.", tone: "info" })
      void load()
    } catch (err: any) {
      setMessage({ tone: "error", text: err.response?.data?.message || "Kunne ikke starte reisen" })
      if (err.response?.data?.nextAvailableAt) {
        setCooldownEndsAt(err.response.data.nextAvailableAt)
      }
    }
  }

  const arrive = async () => {
    try {
      const res = await api.post("/travel/arrive")
      window.dispatchEvent(new Event("mafiaspill:session"))
      if (res.data.cooldownEndsAt) {
        setCooldownEndsAt(res.data.cooldownEndsAt)
      }
      setQueue(null)
      push({ title: "Ankomst", body: "Du er fremme.", tone: "success" })
      void load()
    } catch (err: any) {
      setMessage({ tone: "error", text: err.response?.data?.message || "Ikke fremme enda" })
    }
  }

  const isCooldown = cooldownEndsAt ? cooldownEndsAt > Date.now() : false

  return (
    <AppShell>
      <PageHeader
        title="Reise"
        subtitle="Byer og risiko"
        description="Heat i byen påvirker risiko og sjanser. Reise har 1 time nedkjøling og prisen øker sakte over tid."
        banner={banner}
      />
      {message ? <ResultAlert tone={message.tone} title="Reise" message={message.text} /> : null}
      {isCooldown ? (
        <div className="mb-4 rounded-2xl border border-white/10 bg-coal/60 p-3 text-xs text-mist/60">
          Reise nedkjøling: <Countdown endTime={cooldownEndsAt} />
        </div>
      ) : null}
      <div className="glass mb-4 rounded-2xl p-4 shadow-card text-sm text-mist/70">
        <div className="flex items-center gap-2 text-white">
          <Icon name="travel" />
          <span>Sted: {current?.city?.name || "Ukjent"}</span>
        </div>
        {queue ? (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span>
              Reiser til {queue.toCity?.name} · <Countdown endTime={queue.arriveAt} />
            </span>
            <button onClick={arrive} className="rounded-xl bg-neon/20 px-3 py-1 text-xs text-neon">
              Sjekk ankomst
            </button>
          </div>
        ) : null}
      </div>
      <div className="grid gap-3">
        {cities.map((city) => (
          <div key={city.id} className="glass rounded-2xl p-4 shadow-card">
            <div className="flex items-center justify-between text-sm text-white">
              <span>{city.name}</span>
              <button
                disabled={Boolean(queue) || isCooldown}
                onClick={() => travel(city.id)}
                className="rounded-xl bg-signal/20 px-3 py-1 text-xs text-signal disabled:opacity-40"
              >
                Reis
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-mist/60">
              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${getHeatClass(city.heat?.heat || 0)}`}>
                Heat: {getHeatLabel(city.heat?.heat || 0)}
              </span>
              <span>Pris: {formatUsd(price)}</span>
              <span>Politi-trykk: {city.state?.policePressure}</span>
              <span>Markedsstemning: {city.state?.marketMood}</span>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  )
}
