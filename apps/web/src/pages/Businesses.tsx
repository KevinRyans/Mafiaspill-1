import { useEffect, useState } from "react"
import AppShell from "../components/AppShell"
import PageHeader from "../components/PageHeader"
import api from "../lib/api"
import { useToasts } from "../components/ToastProvider"
import banner from "../assets/banner-market.svg"
import PrimaryButton from "../components/shared/PrimaryButton"
import ResultAlert from "../components/shared/ResultAlert"
import { formatUsd } from "../utils/format"

export default function Businesses() {
  const [businesses, setBusinesses] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [name, setName] = useState("")
  const [cityId, setCityId] = useState("")
  const [type, setType] = useState<"firma" | "blackjack" | "lotto">("firma")
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null)
  const { push } = useToasts()

  const typeOptions = [
    { value: "firma", label: "Firma", cost: 50_000_000 },
    { value: "blackjack", label: "Blackjack-eier", cost: 350_000_000 },
    { value: "lotto", label: "Lotto-operatør", cost: 500_000_000 }
  ]

  const load = async () => {
    const res = await api.get("/business")
    const citiesRes = await api.get("/travel/cities")
    setBusinesses(res.data.businesses || [])
    setCities(citiesRes.data.cities || [])
    if (!cityId && citiesRes.data.cities?.length) {
      setCityId(citiesRes.data.cities[0].id)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const create = async () => {
    setMessage(null)
    try {
      await api.post("/business/create", { name, cityId, type })
      setName("")
      push({ title: "Firma opprettet", body: "Firmaet er i drift.", tone: "success" })
      await load()
    } catch (err: any) {
      setMessage({ tone: "error", text: err.response?.data?.message || "Kunne ikke opprette firma" })
    }
  }

  const collect = async (businessId: string) => {
    setMessage(null)
    try {
      const res = await api.post("/business/collect", { businessId })
      push({ title: "Inntekt hentet", body: `+${formatUsd(res.data.income)}`, tone: "success" })
      await load()
    } catch (err: any) {
      setMessage({ tone: "error", text: err.response?.data?.message || "Kunne ikke hente inntekt" })
    }
  }

  const upgrade = async (businessId: string) => {
    setMessage(null)
    try {
      await api.post("/business/upgrade", { businessId })
      push({ title: "Firma oppgradert", body: "Nytt nivå aktivert.", tone: "success" })
      await load()
    } catch (err: any) {
      setMessage({ tone: "error", text: err.response?.data?.message || "Kunne ikke oppgradere" })
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Firmaer"
        subtitle="Bygg opp bedrifter"
        description="Start firmaer, oppgrader og hent inntekt."
        banner={banner}
      />

      {message ? <ResultAlert tone={message.tone} title="Firmaer" message={message.text} /> : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="glass rounded-2xl p-4 shadow-card">
          <div className="text-sm font-semibold text-white">Opprett firma</div>
          <div className="mt-3 space-y-2 text-xs text-mist/70">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl bg-coal/70 px-3 py-2 text-sm text-white"
              placeholder="Firmanavn"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "firma" | "blackjack" | "lotto")}
              className="w-full rounded-xl bg-coal/70 px-3 py-2 text-sm text-white"
            >
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({formatUsd(option.cost)})
                </option>
              ))}
            </select>
            <select
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
              className="w-full rounded-xl bg-coal/70 px-3 py-2 text-sm text-white"
            >
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
            <PrimaryButton onClick={create}>
              Start {typeOptions.find((option) => option.value === type)?.label || "firma"}
            </PrimaryButton>
          </div>
        </div>

        <div className="glass rounded-2xl p-4 shadow-card">
          <div className="text-sm font-semibold text-white">Dine firmaer</div>
          <div className="mt-3 grid gap-3">
            {businesses.length === 0 ? (
              <div className="rounded-xl bg-coal/70 p-3 text-xs text-mist/60">Ingen firmaer ennå.</div>
            ) : (
              businesses.map((biz) => (
                <div key={biz.id} className="rounded-xl border border-white/10 bg-coal/70 p-3 text-xs text-mist/70">
                  <div className="flex items-center justify-between text-white">
                    <span>{biz.name}</span>
                    <span>
                      {biz.type === "blackjack" ? "Blackjack" : biz.type === "lotto" ? "Lotto" : "Firma"} · Nivå {biz.level}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-mist/60">By: {biz.city?.name || "Ukjent"}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-night/60 px-2 py-1 text-[11px] text-mist/70">
                      Klar inntekt: {formatUsd(biz.claimable)}
                    </span>
                    <PrimaryButton onClick={() => collect(biz.id)}>Hent</PrimaryButton>
                    <PrimaryButton onClick={() => upgrade(biz.id)}>Oppgrader</PrimaryButton>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
