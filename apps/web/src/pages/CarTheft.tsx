import { useEffect, useState } from "react"
import AppShell from "../components/AppShell"
import PageHeader from "../components/PageHeader"
import banner from "../assets/banner-ops.svg"
import api from "../lib/api"
import Countdown from "../components/shared/Countdown"
import ResultAlert from "../components/shared/ResultAlert"
import { useToasts } from "../components/ToastProvider"
import { Link } from "react-router-dom"

export default function CarTheft() {
  const [actions, setActions] = useState<any[]>([])
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null)
  const [garageCount, setGarageCount] = useState(0)
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null)
  const { push } = useToasts()

  const load = async () => {
    const res = await api.get("/car-theft/actions")
    setActions(res.data.actions || [])
    setCooldownEndsAt(res.data.cooldownEndsAt || null)
    setGarageCount(res.data.garageCount || 0)
  }

  useEffect(() => {
    load()
  }, [])

  const run = async (actionId: string) => {
    setMessage(null)
    try {
      const res = await api.post("/car-theft/steal", { actionId })
      window.dispatchEvent(new Event("mafiaspill:session"))
      if (res.data.success && res.data.car?.carModel) {
        const car = res.data.car.carModel
        setMessage({ tone: "success", text: `Du skaffet ${car.make} ${car.model}.` })
        push({ title: "Biltyveri", body: `Ny bil i garasjen: ${car.make} ${car.model}`, tone: "success" })
      } else {
        setMessage({ tone: "error", text: "Biltyveri feilet. Du ble oppdaget." })
        push({ title: "Biltyveri feilet", body: "Ingen bil denne gangen.", tone: "warning" })
      }
      if (res.data.cooldownEndsAt) {
        setCooldownEndsAt(res.data.cooldownEndsAt)
      } else {
        setCooldownEndsAt(Date.now() + 90 * 1000)
      }
      void load()
    } catch (err: any) {
      setMessage({ tone: "error", text: err.response?.data?.message || "Kunne ikke stjele bil" })
      if (err.response?.data?.nextAvailableAt) {
        setCooldownEndsAt(err.response.data.nextAvailableAt)
      }
    }
  }

  const isCooldown = cooldownEndsAt ? cooldownEndsAt > Date.now() : false

  return (
    <AppShell>
      <PageHeader
        title="Biltyveri"
        subtitle="Jakt på biler"
        description="Suksess gir en bil i garasjen. Ingen kontantbelønning vises på forhånd."
        banner={banner}
      />

      {cooldownEndsAt ? (
        <div className="mb-4 rounded-2xl border border-white/10 bg-coal/60 p-3 text-xs text-mist/60">
          Nedkjøling: <Countdown endTime={cooldownEndsAt} />
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-coal/60 p-3 text-xs text-mist/60">
        <span>Garasje: {garageCount} biler</span>
        <Link to="/garage" className="text-neon hover:underline">
          Åpne garasje
        </Link>
      </div>

      {message ? <ResultAlert tone={message.tone} title="Resultat" message={message.text} /> : null}

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <div className="grid grid-cols-[1.6fr_0.4fr_0.6fr] bg-coal/70 px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-mist/60">
          <span>Handling</span>
          <span>Sjanse</span>
          <span>Status</span>
        </div>
        <div className="divide-y divide-white/5">
          {actions.map((action) => (
            <div key={action.id} className="grid grid-cols-[1.6fr_0.4fr_0.6fr] items-center px-3 py-3 text-sm text-mist/70">
              <div className="text-white">{action.label}</div>
              <div>{action.chance}%</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => run(action.id)}
                  disabled={isCooldown}
                  className="rounded-lg bg-neon/20 px-2 py-1 text-[11px] text-neon transition-all duration-150 hover:-translate-y-0.5 hover:bg-neon/30 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Stjel
                </button>
                {isCooldown ? <Countdown endTime={cooldownEndsAt} className="text-[11px]" /> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
