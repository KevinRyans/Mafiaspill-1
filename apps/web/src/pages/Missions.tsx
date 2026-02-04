import { useEffect, useMemo, useState } from "react"
import AppShell from "../components/AppShell"
import PageHeader from "../components/PageHeader"
import banner from "../assets/banner-missions.svg"
import api from "../lib/api"
import ResultAlert from "../components/shared/ResultAlert"
import Countdown from "../components/shared/Countdown"
import PrimaryButton from "../components/shared/PrimaryButton"
import { useToasts } from "../components/ToastProvider"
import { formatUsd } from "../utils/format"

export default function Missions() {
  const [missions, setMissions] = useState<any[]>([])
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null)
  const [heat, setHeat] = useState(0)
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null)
  const { push } = useToasts()

  const load = async () => {
    const res = await api.get("/missions")
    setMissions(res.data.missions || [])
    setCooldownEndsAt(res.data.cooldownEndsAt || null)
    setHeat(res.data.heat || 0)
  }

  useEffect(() => {
    load()
  }, [])

  const runMission = async (missionId: string, optionId: string) => {
    setMessage(null)
    try {
      const res = await api.post("/missions/run", { missionId, optionId })
      const reward = res.data.missionRun?.rewardFiat || 0
      const status = res.data.missionRun?.status === "success"
      setMessage({
        tone: status ? "success" : "error",
        text: status ? `Oppdrag fullført. +${reward} USD.` : "Oppdrag feilet. Vær mer forsiktig."
      })
      push({ title: "Oppdrag", body: status ? "Oppdrag fullført." : "Oppdrag feilet.", tone: status ? "success" : "warning" })
      window.dispatchEvent(new Event("mafiaspill:session"))
      if (res.data.cooldownEndsAt) {
        setCooldownEndsAt(res.data.cooldownEndsAt)
      }
      void load()
    } catch (err: any) {
      const text = err.response?.data?.message || "Kunne ikke utføre oppdrag"
      setMessage({ tone: "error", text })
      if (err.response?.data?.nextAvailableAt) {
        setCooldownEndsAt(err.response.data.nextAvailableAt)
      }
    }
  }

  const isCooldown = cooldownEndsAt ? cooldownEndsAt > Date.now() : false

  const rows = useMemo(() => {
    return missions.map((mission) => {
      const baseRisk = mission.baseRisk + Math.round(heat / 10)
      const requiredCar = mission.requiredCar
      const hasRequiredCar = mission.hasRequiredCar ?? true
      return {
        mission,
        requiredCar,
        hasRequiredCar,
        options: (mission.options || []).map((option: any) => {
          const risk = baseRisk + option.riskDelta
          const chance = Math.max(5, Math.min(95, 100 - risk))
          const reward = Math.round(mission.baseReward * option.rewardMultiplier)
          return {
            id: `${mission.id}:${option.id}`,
            optionId: option.id,
            label: option.label,
            chance,
            risk,
            reward
          }
        })
      }
    })
  }, [missions, heat])

  return (
    <AppShell>
      <PageHeader
        title="Oppdrag"
        subtitle="Strategiske ruter"
        description="Velg en rute, vurder risiko og kontroller heat i byen. Noen oppdrag krever bil i garasjen."
        banner={banner}
      />

      {isCooldown ? (
        <div className="mb-4 rounded-2xl border border-white/10 bg-coal/60 p-3 text-xs text-mist/60">
          Nedkjøling: <Countdown endTime={cooldownEndsAt} />
        </div>
      ) : null}

      {message ? <ResultAlert tone={message.tone} title="Resultat" message={message.text} /> : null}

      <div className="mt-4 grid gap-4">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-coal/60 p-4 text-sm text-mist/60">
            Ingen oppdrag tilgjengelig akkurat nå.
          </div>
        ) : null}
        {rows.map((entry) => (
          <div key={entry.mission.id} className="rounded-2xl border border-white/10 bg-coal/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-white">{entry.mission.name}</div>
                <div className="text-xs text-mist/60">{entry.mission.description}</div>
              </div>
              {entry.requiredCar ? (
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                    entry.hasRequiredCar ? "bg-neon/20 text-neon" : "bg-ember/20 text-ember"
                  }`}
                >
                  Krever bil: {entry.requiredCar.make} {entry.requiredCar.model}
                  {entry.hasRequiredCar ? " (klar)" : " (mangler)"}
                </span>
              ) : null}
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs text-mist/70">
                <thead>
                  <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-mist/50">
                    <th className="py-2">Valg</th>
                    <th className="py-2">Sjanse</th>
                    <th className="py-2">Risiko</th>
                    <th className="py-2">Belønning</th>
                    <th className="py-2">Handling</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.options.map((option: any) => (
                    <tr key={option.id} className="border-b border-white/5">
                      <td className="py-2 text-white">{option.label}</td>
                      <td className="py-2">{option.chance}%</td>
                      <td className="py-2">Heat +{Math.round(heat / 10)} / {option.risk}</td>
                      <td className="py-2">~{formatUsd(option.reward)}</td>
                      <td className="py-2">
                        <PrimaryButton
                          disabled={isCooldown || !entry.hasRequiredCar}
                          onClick={() => runMission(entry.mission.id, option.optionId)}
                        >
                          Utfør
                        </PrimaryButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  )
}
