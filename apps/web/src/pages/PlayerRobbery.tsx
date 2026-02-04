import { useEffect, useState } from "react"
import AppShell from "../components/AppShell"
import PageHeader from "../components/PageHeader"
import api from "../lib/api"
import { useToasts } from "../components/ToastProvider"
import banner from "../assets/banner-ops.svg"
import ResultAlert from "../components/shared/ResultAlert"
import PrimaryButton from "../components/shared/PrimaryButton"
import Countdown from "../components/shared/Countdown"
import { formatNumber } from "../utils/format"

export default function PlayerRobbery() {
  const [targets, setTargets] = useState<any[]>([])
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null)
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null)
  const { push } = useToasts()

  const load = async () => {
    const res = await api.get("/player-robbery/targets")
    setTargets(res.data.targets || [])
    setCooldownEndsAt(res.data.cooldownEndsAt || null)
  }

  useEffect(() => {
    load()
  }, [])

  const attack = async (targetId: string) => {
    setMessage(null)
    try {
      const res = await api.post("/player-robbery/run", { targetId })
      window.dispatchEvent(new Event("mafiaspill:session"))
      if (res.data.success) {
        setMessage({ tone: "success", text: `Du ranet ${res.data.reward} USD.` })
        push({ title: "Ran spiller", body: `Suksess! +${res.data.reward} USD.`, tone: "success" })
      } else {
        setMessage({ tone: "error", text: "Ranforsøket feilet. Målet var forberedt." })
        push({ title: "Ran spiller", body: "Ranforsøket feilet.", tone: "warning" })
      }
      if (res.data.cooldownEndsAt) {
        setCooldownEndsAt(res.data.cooldownEndsAt)
      } else {
        setCooldownEndsAt(Date.now() + 3 * 60 * 1000)
      }
      void load()
    } catch (err: any) {
      const text = err.response?.data?.message || "Kunne ikke starte ran"
      setMessage({ tone: "error", text })
      push({ title: "Ran spiller", body: text, tone: "warning" })
      if (err.response?.data?.nextAvailableAt) {
        setCooldownEndsAt(err.response.data.nextAvailableAt)
      }
    }
  }

  const isCooldown = cooldownEndsAt ? cooldownEndsAt > Date.now() : false

  return (
    <AppShell>
      <PageHeader
        title="Ran spiller"
        subtitle="Spiller mot spiller"
        description="Velg et mål i din by. Heat påvirker sjansen din."
        banner={banner}
      />

      {isCooldown ? (
        <div className="mb-4 rounded-2xl border border-white/10 bg-coal/60 p-3 text-xs text-mist/60">
          Nedkjøling: <Countdown endTime={cooldownEndsAt} />
        </div>
      ) : null}

      {message ? <ResultAlert tone={message.tone} title="Resultat" message={message.text} /> : null}

      <div className="mt-4 rounded-2xl border border-white/10 bg-coal/60 p-4">
        <div className="text-sm font-semibold text-white">Mulige mål</div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs text-mist/70">
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-mist/50">
                <th className="py-2">Navn</th>
                <th className="py-2">By</th>
                <th className="py-2">Forsvar</th>
                <th className="py-2">Sjanse</th>
                <th className="py-2">Handling</th>
              </tr>
            </thead>
            <tbody>
              {targets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-mist/50">
                    Ingen mål tilgjengelig akkurat nå.
                  </td>
                </tr>
              ) : (
                targets.map((target) => (
                  <tr key={target.id} className="border-b border-white/5">
                    <td className="py-2 text-white">{target.name}</td>
                    <td className="py-2">{target.city}</td>
                    <td className="py-2">{formatNumber(target.defense)}</td>
                    <td className="py-2">{target.chance}%</td>
                    <td className="py-2">
                      <PrimaryButton disabled={isCooldown} onClick={() => attack(target.id)}>
                        Ran
                      </PrimaryButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  )
}
