import { useEffect, useMemo, useState } from "react"
import AppShell from "../components/AppShell"
import PageHeader from "../components/PageHeader"
import api from "../lib/api"
import { useToasts } from "../components/ToastProvider"
import { formatUsd } from "../utils/format"
import banner from "../assets/banner-respect.svg"
import PrimaryButton from "../components/shared/PrimaryButton"
import ResultAlert from "../components/shared/ResultAlert"

export default function Respect() {
  const [data, setData] = useState<any>(null)
  const [benefits, setBenefits] = useState<any[]>([])
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null)
  const { push } = useToasts()

  const load = async () => {
    const [respectRes, benefitsRes] = await Promise.all([api.get("/respect"), api.get("/benefits")])
    setData(respectRes.data)
    setBenefits(benefitsRes.data.benefits || [])
  }

  useEffect(() => {
    load()
  }, [])

  const buy = async (upgradeId: string) => {
    setMessage(null)
    try {
      await api.post("/respect/purchase", { upgradeId })
      push({ title: "Respekt brukt", body: "Oppgraderingen er aktiv.", tone: "success" })
      await load()
    } catch (err: any) {
      const text = err.response?.data?.message || "Kunne ikke kjøpe"
      setMessage({ tone: "error", text })
      push({ title: "Kjøp feilet", body: text, tone: "warning" })
    }
  }

  const buyBenefit = async (benefitId: string, currency?: "fiat" | "token") => {
    setMessage(null)
    try {
      await api.post("/benefits/buy", { benefitId, currency })
      push({ title: "Fordel aktivert", body: "Effekten er lagt til profilen din.", tone: "success" })
      await load()
    } catch (err: any) {
      const text = err.response?.data?.message || "Kunne ikke kjøpe fordel"
      setMessage({ tone: "error", text })
      push({ title: "Kjøp feilet", body: text, tone: "warning" })
    }
  }

  const benefitRows = useMemo(
    () =>
      benefits.map((benefit) => {
        const tag =
          benefit.type === "respect"
            ? "Respekt"
            : benefit.type === "compliance"
            ? "Compliance"
            : benefit.type === "defense"
            ? "Forsvar"
            : "Liv"
        const tone =
          benefit.type === "respect"
            ? "bg-neon/20 text-neon"
            : benefit.type === "compliance"
            ? "bg-gold/20 text-gold"
            : benefit.type === "defense"
            ? "bg-ember/20 text-ember"
            : "bg-blue/20 text-blue-200"
        return { ...benefit, tag, tone }
      }),
    [benefits]
  )

  return (
    <AppShell>
      <PageHeader
        title="Respekt"
        subtitle="Poeng og fordeler"
        description="Kjøp respekt, compliance og livvakter – og lås opp permanente fordeler."
        banner={banner}
      />

      {message ? <ResultAlert tone={message.tone} title="Respekt" message={message.text} /> : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4">
          <div className="glass rounded-2xl p-4 shadow-card">
            <div className="text-xs text-mist/60">Tilgjengelig respekt</div>
            <div className="mt-1 text-3xl font-semibold text-white">{data?.respect ?? 0}</div>
            <div className="mt-4 rounded-xl border border-white/10 bg-coal/70 p-3 text-xs text-mist/70">
              <div className="flex items-center justify-between text-white">
                <span>Respektnivå</span>
                <span>{data?.level?.name ?? "Normal"}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-night/70">
                <div
                  className="h-2 rounded-full bg-neon"
                  style={{ width: `${Math.round((data?.level?.progress ?? 0) * 100)}%` }}
                />
              </div>
              <div className="mt-2 text-[11px] text-mist/60">Neste nivå: {data?.level?.nextAt ?? "Maks"}</div>
            </div>
          </div>

          <div className="glass rounded-2xl p-4 shadow-card">
            <div className="text-sm font-semibold text-white">Respektmarked</div>
            <div className="mt-3 grid gap-3">
              {benefitRows.length === 0 ? (
                <div className="rounded-xl bg-coal/70 p-3 text-xs text-mist/60">Ingen tilbud akkurat nå.</div>
              ) : (
                benefitRows.map((benefit) => (
                  <div key={benefit.id} className="rounded-xl border border-white/10 bg-coal/70 p-3 text-xs text-mist/70">
                    <div className="flex items-center justify-between text-white">
                      <span className="text-sm font-semibold">{benefit.name}</span>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${benefit.tone}`}>
                        {benefit.tag}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-mist/60">{benefit.description}</div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-[11px] text-mist/60">
                        {benefit.costFiat ? `${formatUsd(benefit.costFiat)}` : ""}
                        {benefit.costFiat && benefit.costToken ? " / " : ""}
                        {benefit.costToken ? `${benefit.costToken} token` : ""}
                      </div>
                      {benefit.costFiat ? (
                        <PrimaryButton onClick={() => buyBenefit(benefit.id, "fiat")}>Kjøp</PrimaryButton>
                      ) : (
                        <PrimaryButton onClick={() => buyBenefit(benefit.id, "token")}>Kjøp</PrimaryButton>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-4 shadow-card">
          <div className="text-sm font-semibold text-white">Fordeler</div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {data?.upgrades?.map((upgrade: any) => {
              const locked = upgrade.levelRequired > (data?.level?.levelIndex ?? 0)
              return (
                <div key={upgrade.id} className="rounded-xl border border-white/10 bg-coal/70 p-3 text-xs text-mist/70">
                  <div className="text-sm font-semibold text-white">{upgrade.name}</div>
                  <div className="mt-1 text-[11px] text-mist/60">{upgrade.description}</div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="rounded-full bg-night/60 px-2 py-1 text-[11px] text-mist/70">
                      {upgrade.cost} respekt
                    </span>
                    {upgrade.owned ? (
                      <span className="text-[11px] text-neon">Aktiv</span>
                    ) : locked ? (
                      <span className="text-[11px] text-mist/50">Låst</span>
                    ) : (
                      <PrimaryButton onClick={() => buy(upgrade.id)}>Kjøp</PrimaryButton>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
