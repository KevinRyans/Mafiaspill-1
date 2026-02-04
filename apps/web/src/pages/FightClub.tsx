import { useEffect, useMemo, useState } from "react"
import AppShell from "../components/AppShell"
import PageHeader from "../components/PageHeader"
import banner from "../assets/banner-ops.svg"
import api from "../lib/api"
import ResultAlert from "../components/shared/ResultAlert"
import Countdown from "../components/shared/Countdown"
import PrimaryButton from "../components/shared/PrimaryButton"
import { useToasts } from "../components/ToastProvider"
import { formatNumber, formatUsd } from "../utils/format"

const trainingOptions = [
  { id: "kort", label: "Kort økt", minutes: 2.5, ratingGain: "2-4", styleGain: "1-2", baseCost: 2_000_000 },
  { id: "normal", label: "Normal økt", minutes: 7, ratingGain: "5-8", styleGain: "2-4", baseCost: 6_000_000 },
  { id: "lang", label: "Lang økt", minutes: 15, ratingGain: "10-14", styleGain: "4-6", baseCost: 12_000_000 }
]

const styles = [
  { id: "judo", label: "Judo", field: "judoStrength" },
  { id: "jujutsu", label: "Jujutsu", field: "jujutsuStrength" },
  { id: "karate", label: "Karate", field: "karateStrength" },
  { id: "taekwondo", label: "Taekwondo", field: "taekwondoStrength" }
]

export default function FightClub() {
  const [profile, setProfile] = useState<any>(null)
  const [gym, setGym] = useState(false)
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null)
  const { push } = useToasts()

  const load = async () => {
    const res = await api.get("/fight-club/status")
    setProfile(res.data.profile)
  }

  useEffect(() => {
    load()
  }, [])

  const setStyle = async (style: string) => {
    try {
      const res = await api.post("/fight-club/style", { style })
      setProfile(res.data.profile)
      push({ title: "Fight Club", body: `Stil valgt: ${style}.`, tone: "success" })
    } catch (err: any) {
      const text = err.response?.data?.message || "Kunne ikke velge stil"
      setMessage({ tone: "error", text })
    }
  }

  const train = async (type: string) => {
    setMessage(null)
    try {
      const res = await api.post("/fight-club/train", { type, gym })
      setProfile(res.data.profile)
      window.dispatchEvent(new Event("mafiaspill:session"))
      push({ title: "Fight Club", body: "Trening startet.", tone: "info" })
    } catch (err: any) {
      const text = err.response?.data?.message || "Kunne ikke starte trening"
      setMessage({ tone: "error", text })
      if (err.response?.data?.nextAvailableAt) {
        setProfile((prev: any) => ({ ...prev, trainingEndsAt: new Date(err.response.data.nextAvailableAt) }))
      }
    }
  }

  const activeStyle = styles.find((style) => style.id === profile?.style)
  const trainingEndsAt = profile?.trainingEndsAt ? new Date(profile.trainingEndsAt).getTime() : null
  const isTraining = trainingEndsAt ? trainingEndsAt > Date.now() : false

  const strengthValue = useMemo(() => {
    if (!profile || !activeStyle) return 0
    return profile[activeStyle.field] ?? 0
  }, [profile, activeStyle])

  return (
    <AppShell>
      <PageHeader
        title="Fight Club"
        subtitle="Trening og rang"
        description="Velg kampsport-stil, tren og bygg rating. Treningssenter gir boost mot ekstra kostnad."
        banner={banner}
      />

      {message ? <ResultAlert tone={message.tone} title="Resultat" message={message.text} /> : null}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-white/10 bg-coal/60 p-4">
          <div className="text-sm font-semibold text-white">Status</div>
          <div className="mt-3 grid gap-3 text-xs text-mist/70">
            <div className="flex items-center justify-between rounded-xl bg-night/60 px-3 py-2">
              <span>Rating</span>
              <span className="text-white">{formatNumber(profile?.rating)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-night/60 px-3 py-2">
              <span>Stil</span>
              <span className="text-white">{activeStyle?.label || "-"}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-night/60 px-3 py-2">
              <span>Styrke</span>
              <span className="text-white">{formatNumber(strengthValue)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-night/60 px-3 py-2">
              <span>Liga</span>
              <span className="text-white">{profile?.league || "Rookie"}</span>
            </div>
            {isTraining ? (
              <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[11px] text-mist/60">
                Trening pågår: <Countdown endTime={trainingEndsAt} />
              </div>
            ) : null}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-coal/60 p-4">
          <div className="text-sm font-semibold text-white">Velg stil</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            {styles.map((style) => (
              <button
                key={style.id}
                onClick={() => setStyle(style.id)}
                className={`rounded-xl border px-3 py-2 text-left transition-all ${
                  profile?.style === style.id
                    ? "border-neon/40 bg-neon/10 text-neon"
                    : "border-white/10 bg-night/50 text-mist/70 hover:border-white/30"
                }`}
              >
                <div className="text-white">{style.label}</div>
                <div className="text-[10px] text-mist/60">Stilpoeng: {formatNumber(profile?.[style.field])}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-coal/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold text-white">Treningsøkter</div>
          <label className="flex items-center gap-2 text-xs text-mist/60">
            <input
              type="checkbox"
              checked={gym}
              onChange={(event) => setGym(event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-night/60"
            />
            Treningssenter (boost +25%, kost +50%)
          </label>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs text-mist/70">
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-mist/50">
                <th className="py-2">Økt</th>
                <th className="py-2">Tid</th>
                <th className="py-2">Rating</th>
                <th className="py-2">Styrke</th>
                <th className="py-2">Kost</th>
                <th className="py-2">Handling</th>
              </tr>
            </thead>
            <tbody>
              {trainingOptions.map((option) => {
                const cost = gym ? Math.round(option.baseCost * 1.5) : option.baseCost
                return (
                  <tr key={option.id} className="border-b border-white/5">
                    <td className="py-2 text-white">{option.label}</td>
                    <td className="py-2">{option.minutes} min</td>
                    <td className="py-2">+{option.ratingGain}</td>
                    <td className="py-2">+{option.styleGain}</td>
                    <td className="py-2">{formatUsd(cost)}</td>
                    <td className="py-2">
                      <PrimaryButton disabled={isTraining} onClick={() => train(option.id)}>
                        Tren
                      </PrimaryButton>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  )
}
