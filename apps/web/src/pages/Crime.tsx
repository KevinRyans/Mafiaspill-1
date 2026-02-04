import { useEffect, useState } from "react"
import AppShell from "../components/AppShell"
import PageHeader from "../components/PageHeader"
import banner from "../assets/banner-ops.svg"
import api from "../lib/api"
import Countdown from "../components/shared/Countdown"
import ResultAlert from "../components/shared/ResultAlert"
import { useToasts } from "../components/ToastProvider"

export default function Crime() {
  const [actions, setActions] = useState<any[]>([])
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null)
  const [level, setLevel] = useState<any>(null)
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null)
  const { push } = useToasts()

  const load = async () => {
    const res = await api.get("/crime/actions")
    setActions(res.data.actions || [])
    setCooldownEndsAt(res.data.cooldownEndsAt || null)
    setLevel(res.data.level || null)
  }

  useEffect(() => {
    load()
  }, [])

  const isCooldown = cooldownEndsAt ? cooldownEndsAt > Date.now() : false

  const run = async (actionId: string) => {
    setMessage(null)
    try {
      const res = await api.post("/crime/run", { actionId })
      window.dispatchEvent(new Event("mafiaspill:session"))
      if (res.data.success) {
        setMessage({ tone: "success", text: `Du fikk ${res.data.reward} USD.` })
        push({ title: "Kriminalitet", body: `Suksess! +${res.data.reward} USD.`, tone: "success" })
      } else {
        setMessage({ tone: "error", text: "Du feilet. Vær forsiktig med heat i byen." })
        push({ title: "Kriminalitet feilet", body: "Ingen gevinst denne gangen.", tone: "warning" })
      }
      if (res.data.cooldownEndsAt) {
        setCooldownEndsAt(res.data.cooldownEndsAt)
      } else {
        setCooldownEndsAt(Date.now() + 60 * 1000)
      }
      void load()
    } catch (err: any) {
      setMessage({ tone: "error", text: err.response?.data?.message || "Kunne ikke utføre" })
      if (err.response?.data?.nextAvailableAt) {
        setCooldownEndsAt(err.response.data.nextAvailableAt)
      }
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Kriminalitet"
        subtitle="Småkrim for raske penger"
        description="Velg én handling. Bare sjansen vises – belønningen er skjult."
        banner={banner}
      />

      {cooldownEndsAt ? (
        <div className="mb-4 rounded-2xl border border-white/10 bg-coal/60 p-3 text-xs text-mist/60">
          Nedkjøling: <Countdown endTime={cooldownEndsAt} />
        </div>
      ) : null}

      {level ? (
        <div className="mb-4 rounded-2xl border border-white/10 bg-coal/60 p-3 text-xs text-mist/60">
          <div className="text-white">Krim-rank: {level.name}</div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-night/60">
            <div className="h-full bg-neon" style={{ width: `${Math.round((level.progress || 0) * 100)}%` }} />
          </div>
        </div>
      ) : null}

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
                  Utfør
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
