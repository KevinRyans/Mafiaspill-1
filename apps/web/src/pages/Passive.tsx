import { useEffect, useState } from "react"
import AppShell from "../components/AppShell"
import PageHeader from "../components/PageHeader"
import Icon from "../components/Icon"
import api from "../lib/api"
import { useToasts } from "../components/ToastProvider"
import Countdown from "../components/shared/Countdown"
import ResultAlert from "../components/shared/ResultAlert"
import banner from "../assets/banner-events.svg"
import { formatUsd } from "../utils/format"

export default function Passive() {
  const [actions, setActions] = useState<any[]>([])
  const [runs, setRuns] = useState<any[]>([])
  const [result, setResult] = useState<{ tone: "success" | "error"; text: string } | null>(null)
  const { push } = useToasts()

  const load = async () => {
    const response = await api.get("/passive/actions")
    setActions(response.data.actions)
    setRuns(response.data.runs)
  }

  useEffect(() => {
    load()
  }, [])

  const start = async (actionId: string) => {
    try {
      await api.post("/passive/start", { actionId })
      push({ title: "Passiv handling startet", body: "Du kan hente belønning senere.", tone: "info" })
      setResult({ tone: "success", text: "Passiv handling er i gang." })
      await load()
    } catch (err: any) {
      setResult({ tone: "error", text: err.response?.data?.message || "Kunne ikke starte" })
      push({ title: "Kunne ikke starte", body: err.response?.data?.message, tone: "warning" })
    }
  }

  const claim = async (runId: string) => {
    try {
      await api.post("/passive/claim", { runId })
      push({ title: "Belønning hentet", body: "Inntekten er lagt til.", tone: "success" })
      setResult({ tone: "success", text: "Belønning hentet." })
      await load()
    } catch (err: any) {
      setResult({ tone: "error", text: err.response?.data?.message || "Kunne ikke hente" })
      push({ title: "Kunne ikke hente", body: err.response?.data?.message, tone: "warning" })
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Passive handlinger"
        subtitle="Langsiktig progresjon"
        description="Start en passiv handling, vent på nedtellingen og hent belønningen når den er klar."
        banner={banner}
      />
      {result ? <ResultAlert tone={result.tone} title="Status" message={result.text} /> : null}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl p-4 shadow-card">
          <h3 className="text-lg font-semibold text-white">Aktive løp</h3>
          <div className="mt-3 space-y-2">
            {runs.map((run) => (
              <div key={run.id} className="rounded-xl bg-coal/70 p-3 text-sm text-mist/70">
                <div className="flex items-center gap-2 text-white">
                  <Icon name="timer" />
                  <span>{run.action?.name || "Passiv løp"}</span>
                  <span className="ml-auto text-xs text-neon">
                    <Countdown endTime={run.endsAt} />
                  </span>
                </div>
                <div className="mt-1 text-xs text-mist/50">
                  Status: {run.status === "ready" ? "Klar" : "Aktiv"}
                </div>
                <button
                  onClick={() => claim(run.id)}
                  className="mt-3 rounded-xl bg-neon/20 px-3 py-1 text-xs text-neon"
                  disabled={run.status !== "ready"}
                >
                  Hent belønning
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="glass rounded-2xl p-4 shadow-card">
          <h3 className="text-lg font-semibold text-white">Tilgjengelige handlinger</h3>
          <div className="mt-3 space-y-2">
            {actions.map((action) => (
              <div key={action.id} className="rounded-xl bg-coal/70 p-3 text-sm text-mist/70">
                <div className="flex items-center gap-2 text-white">
                  <Icon name="timer" />
                  <span>{action.name}</span>
                  <span className="ml-auto text-xs text-mist/50">{action.durationMinutes} min</span>
                </div>
                <p className="mt-1 text-xs text-mist/60">{action.description}</p>
                <p className="mt-1 text-xs text-mist/50">
                  Belønning: +{formatUsd(action.baseRewardFiat)} / +{action.baseRewardToken} token
                </p>
                <button
                  onClick={() => start(action.id)}
                  className="mt-3 rounded-xl bg-signal/20 px-3 py-1 text-xs text-signal"
                >
                  Start
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
