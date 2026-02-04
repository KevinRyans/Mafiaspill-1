import { useEffect, useMemo, useState } from "react"
import AppShell from "../components/AppShell"
import PageHeader from "../components/PageHeader"
import api from "../lib/api"
import ActionTable from "../components/shared/ActionTable"
import ResultAlert from "../components/shared/ResultAlert"
import Countdown from "../components/shared/Countdown"
import { useToasts } from "../components/ToastProvider"
import { useSession } from "../hooks/useSession"
import { formatUsd } from "../utils/format"

export default function ActionCategory({
  category,
  title,
  subtitle,
  description,
  banner,
  actionLabel,
  showRisk = true,
  showReward = true
}: {
  category: string
  title: string
  subtitle: string
  description: string
  banner?: string
  actionLabel: string
  showRisk?: boolean
  showReward?: boolean
}) {
  const [missions, setMissions] = useState<any[]>([])
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null)
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null)
  const [heat, setHeat] = useState(0)
  const { push } = useToasts()
  const { profile } = useSession()
  const downUntil = profile?.downUntil ? new Date(profile.downUntil).getTime() : null
  const isDown = downUntil ? downUntil > Date.now() : false

  const load = async () => {
    const response = await api.get(`/missions?category=${category}`)
    setMissions(response.data.missions)
    setCooldownEndsAt(response.data.cooldownEndsAt)
    setHeat(response.data.heat || 0)
  }

  useEffect(() => {
    load()
  }, [category])

  const runMission = async (missionId: string, optionId: string) => {
    setMessage(null)
    try {
      const response = await api.post("/missions/run", {
        missionId,
        optionId
      })
      setMessage({ tone: "success", text: `Handling utført: ${response.data.missionRun.status}` })
      push({ title: "Handling utført", body: "Sjekk status og belønning.", tone: "success" })
      window.dispatchEvent(new Event("mafiaspill:session"))
      if (response.data.cooldownEndsAt) {
        setCooldownEndsAt(response.data.cooldownEndsAt)
      }
      void load()
    } catch (err: any) {
      setMessage({ tone: "error", text: err.response?.data?.message || "Kunne ikke utføre handling" })
      push({ title: "Handling feilet", body: err.response?.data?.message || "Kunne ikke utføre", tone: "warning" })
      if (err.response?.data?.nextAvailableAt) {
        setCooldownEndsAt(err.response.data.nextAvailableAt)
      }
    }
  }

  const rows = useMemo(() => {
    const now = Date.now()
    return missions.flatMap((mission) => {
      const baseRisk = mission.baseRisk + Math.round(heat / 10)
      return mission.options.map((option: any) => {
        const risk = baseRisk + option.riskDelta
        const chance = Math.max(5, Math.min(95, 100 - risk))
        const reward = Math.round(mission.baseReward * option.rewardMultiplier)
        return {
          id: `${mission.id}:${option.id}`,
          name: `${mission.name} – ${option.label}`,
          chance,
          risk: `Heat +${Math.round(heat / 10)} / Risiko ${risk}`,
          reward: `~${formatUsd(reward)}`,
          endTime: cooldownEndsAt && cooldownEndsAt > now ? cooldownEndsAt : null,
          disabled: Boolean(cooldownEndsAt && cooldownEndsAt > now) || isDown
        }
      })
    })
  }, [missions, cooldownEndsAt, heat, isDown])

  return (
    <AppShell>
      <PageHeader title={title} subtitle={subtitle} description={description} banner={banner} />
      {cooldownEndsAt ? (
        <div className="mb-4 rounded-2xl border border-white/10 bg-coal/60 p-3 text-xs text-mist/60">
          Nedkjøling: <Countdown endTime={cooldownEndsAt} />
        </div>
      ) : null}
      {message ? <ResultAlert tone={message.tone} title="Resultat" message={message.text} /> : null}
      {isDown ? (
        <ResultAlert
          tone="error"
          title="Ute av spill"
          message="Du er satt ut av spill midlertidig. Bygg opp forsvar for å komme tilbake."
        />
      ) : null}
      <div className="mt-4">
        <ActionTable
          rows={rows}
          actionLabel={actionLabel}
          showRisk={showRisk}
          showReward={showReward}
          onAction={(rowId) => {
            const [missionId, optionId] = rowId.split(":")
            runMission(missionId, optionId)
          }}
        />
      </div>
    </AppShell>
  )
}
