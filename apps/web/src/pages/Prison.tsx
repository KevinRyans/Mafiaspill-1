import { useEffect, useState } from "react"
import AppShell from "../components/AppShell"
import PageHeader from "../components/PageHeader"
import api from "../lib/api"
import banner from "../assets/banner-prison.svg"
import Countdown from "../components/shared/Countdown"
import PrimaryButton from "../components/shared/PrimaryButton"
import ResultAlert from "../components/shared/ResultAlert"
import { useToasts } from "../components/ToastProvider"

export default function Prison() {
  const [inmates, setInmates] = useState<any[]>([])
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null)
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null)
  const { push } = useToasts()

  const load = async () => {
    const response = await api.get("/prison/inmates")
    setInmates(response.data.inmates || [])
    setCooldownEndsAt(response.data.breakCooldownEndsAt || null)
  }

  useEffect(() => {
    load()
  }, [])

  const tryBreak = async (inmateId: string) => {
    setMessage(null)
    try {
      const response = await api.post("/prison/break", { inmateId })
      window.dispatchEvent(new Event("mafiaspill:session"))
      if (response.data.success) {
        setMessage({ tone: "success", text: "Fengselsbrudd vellykket." })
        push({ title: "Fengselsbrudd", body: "Du frigjorde en innsatt.", tone: "success" })
      } else {
        setMessage({ tone: "error", text: "Fengselsbrudd feilet." })
        push({ title: "Fengselsbrudd", body: "Du ble tatt under forsøket.", tone: "warning" })
      }
      void load()
    } catch (err: any) {
      setMessage({ tone: "error", text: err.response?.data?.message || "Kunne ikke prøve" })
      push({ title: "Fengsel", body: err.response?.data?.message || "Kunne ikke prøve", tone: "warning" })
      if (err.response?.data?.nextAvailableAt) {
        setCooldownEndsAt(err.response.data.nextAvailableAt)
      }
    }
  }

  const isCooldown = cooldownEndsAt ? cooldownEndsAt > Date.now() : false

  return (
    <AppShell>
      <PageHeader
        title="Fengsel"
        subtitle="Innsatte og brudd"
        description="Se hvem som sitter inne og forsøk å bryte dem ut. Høyt heat gir lavere sjanse."
        banner={banner}
      />

      {cooldownEndsAt ? (
        <div className="mb-4 rounded-2xl border border-white/10 bg-coal/60 p-3 text-xs text-mist/60">
          Nedkjøling for fengselsbrudd: <Countdown endTime={cooldownEndsAt} />
        </div>
      ) : null}

      {message ? <ResultAlert tone={message.tone} title="Resultat" message={message.text} /> : null}

      <div className="mt-4 rounded-2xl border border-white/10 bg-coal/60 p-4">
        <div className="text-sm font-semibold text-white">Innsatte</div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs text-mist/70">
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-mist/50">
                <th className="py-2">Navn</th>
                <th className="py-2">By</th>
                <th className="py-2">Heat</th>
                <th className="py-2">Årsak</th>
                <th className="py-2">Tid igjen</th>
                <th className="py-2">Handling</th>
              </tr>
            </thead>
            <tbody>
              {inmates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-mist/50">
                    Ingen innsatte akkurat nå.
                  </td>
                </tr>
              ) : (
                inmates.map((inmate) => (
                  <tr key={inmate.id} className="border-b border-white/5">
                    <td className="py-2 text-white">{inmate.name}</td>
                    <td className="py-2">{inmate.city}</td>
                    <td className="py-2">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                          inmate.heat >= 70
                            ? "bg-ember/20 text-ember"
                            : inmate.heat >= 40
                            ? "bg-gold/20 text-gold"
                            : "bg-neon/20 text-neon"
                        }`}
                      >
                        {inmate.heat}
                      </span>
                    </td>
                    <td className="py-2">{inmate.reason}</td>
                    <td className="py-2">
                      <Countdown endTime={inmate.jailedUntil} />
                    </td>
                    <td className="py-2">
                      <PrimaryButton disabled={isCooldown} onClick={() => tryBreak(inmate.id)}>
                        Bryt ut
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

