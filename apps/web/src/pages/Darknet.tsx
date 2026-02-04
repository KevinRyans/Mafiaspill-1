import { useEffect, useState } from "react"
import AppShell from "../components/AppShell"
import PageHeader from "../components/PageHeader"
import Icon from "../components/Icon"
import api from "../lib/api"
import banner from "../assets/banner-darknet.svg"
import { useToasts } from "../components/ToastProvider"
import { formatUsd } from "../utils/format"

const tabs = [
  { id: "market", label: "Marked" },
  { id: "contracts", label: "Kontrakter" },
  { id: "escrow", label: "Sikker betaling" },
  { id: "reputation", label: "Rykte" }
]

export default function Darknet() {
  const [contracts, setContracts] = useState<any[]>([])
  const [escrow, setEscrow] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [listings, setListings] = useState<any[]>([])
  const [tab, setTab] = useState("contracts")
  const [form, setForm] = useState({
    title: "",
    description: "",
    cityId: "",
    rewardTotal: 50000000,
    rewardType: "fast",
    rewardPerUnit: 5000000
  })
  const [units, setUnits] = useState(1)
  const [disputeText, setDisputeText] = useState("")
  const { push } = useToasts()

  const load = async () => {
    const res = await api.get("/darknet/contracts")
    const travel = await api.get("/travel/cities")
    const esc = await api.get("/darknet/escrow")
    const market = await api.get("/market/listings")
    setContracts(res.data.contracts)
    setCities(travel.data.cities)
    setEscrow(esc.data.escrow)
    setListings(market.data.listings)
    if (!form.cityId && travel.data.cities?.length) {
      setForm((prev) => ({ ...prev, cityId: travel.data.cities[0].id }))
    }
  }

  useEffect(() => {
    load()
  }, [])

  const create = async () => {
    await api.post("/darknet/contracts", {
      title: form.title,
      description: form.description,
      cityId: form.cityId,
      durationHours: 24,
      rewardType: form.rewardType,
      rewardTotal: form.rewardTotal,
      rewardPerUnit: form.rewardPerUnit
    })
    push({ title: "Kontrakt opprettet", body: "Sikker betaling er reservert.", tone: "success" })
    await load()
  }

  const accept = async (contractId: string) => {
    await api.post(`/darknet/contracts/${contractId}/accept`)
    push({ title: "Kontrakt tatt", body: "Progresjon starter.", tone: "info" })
    await load()
  }

  const progress = async (contractId: string) => {
    await api.post(`/darknet/contracts/${contractId}/progress`, { units })
    push({ title: "Progresjon sendt", body: `+${units} handlinger`, tone: "success" })
    await load()
  }

  const claim = async (contractId: string) => {
    await api.post(`/darknet/contracts/${contractId}/claim`)
    push({ title: "Sikker betaling utbetalt", body: "Midler er overført.", tone: "success" })
    await load()
  }

  const openDispute = async (contractId: string) => {
    if (!disputeText) return
    await api.post("/darknet/disputes", { contractId, reason: disputeText })
    push({ title: "Tvist opprettet", body: "Kontrollrommet vurderer saken.", tone: "warning" })
    setDisputeText("")
  }

  return (
    <AppShell>
      <PageHeader title="Mørkenett" subtitle="Kontrakter, sikker betaling og rykte" description="Opprett kontrakter, sikre betalinger og hold rykteprofilen ren." banner={banner} />
      

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`rounded-full px-3 py-1 text-xs ${tab === item.id ? "bg-neon/30 text-white" : "bg-coal/70 text-mist/70"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "market" ? (
        <div className="grid gap-3">
          {listings.slice(0, 6).map((listing) => (
            <div key={listing.id} className="glass rounded-2xl p-4 shadow-card">
              <div className="flex items-center justify-between text-sm text-white">
                <span className="flex items-center gap-2"><Icon name="darknet" /> {listing.item.name}</span>
                <span className="text-neon">
                  {listing.currency === "fiat" ? formatUsd(listing.price) : `${listing.price} token`}
                </span>
              </div>
              <div className="mt-2 text-xs text-mist/60">Spesialtilbud via mørkenett-marked.</div>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "contracts" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="glass rounded-2xl p-4 shadow-card">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Icon name="darknet" /> Ny kontrakt
            </h3>
            <div className="mt-3 grid gap-2 text-xs">
              <input
                className="rounded-xl bg-coal/70 px-3 py-2 text-xs text-white"
                placeholder="Tittel"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              />
              <input
                className="rounded-xl bg-coal/70 px-3 py-2 text-xs text-white"
                placeholder="Beskrivelse"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
              <select
                className="rounded-xl bg-coal/70 px-3 py-2 text-xs text-white"
                value={form.cityId}
                onChange={(e) => setForm((prev) => ({ ...prev, cityId: e.target.value }))}
              >
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>{city.name}</option>
                ))}
              </select>
              <div className="grid gap-2 md:grid-cols-2">
                <input
                  className="rounded-xl bg-coal/70 px-3 py-2 text-xs text-white"
                  type="number"
                  value={form.rewardTotal}
                  onChange={(e) => setForm((prev) => ({ ...prev, rewardTotal: Number(e.target.value) }))}
                />
                <select
                  className="rounded-xl bg-coal/70 px-3 py-2 text-xs text-white"
                  value={form.rewardType}
                  onChange={(e) => setForm((prev) => ({ ...prev, rewardType: e.target.value }))}
                >
                  <option value="fast">Fast sum</option>
                  <option value="per_unit">Per handling</option>
                </select>
                {form.rewardType === "per_unit" ? (
                  <input
                    className="rounded-xl bg-coal/70 px-3 py-2 text-xs text-white"
                    type="number"
                    value={form.rewardPerUnit}
                    onChange={(e) => setForm((prev) => ({ ...prev, rewardPerUnit: Number(e.target.value) }))}
                  />
                ) : null}
              </div>
              <button onClick={create} className="rounded-xl bg-neon/20 px-3 py-2 text-xs text-neon">
                Opprett kontrakt
              </button>
            </div>
          </div>
          <div className="glass rounded-2xl p-4 shadow-card">
            <h3 className="text-lg font-semibold text-white">Kontrakter</h3>
            <div className="mt-3 space-y-2 text-xs text-mist/70">
              {contracts.map((contract) => (
                <div key={contract.id} className="rounded-xl bg-coal/70 p-3">
                  <div className="flex items-center gap-2 text-white">
                    <Icon name="signal" />
                    <span>{contract.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-mist/60">{contract.description}</p>
                  <div className="mt-2 text-[11px] text-mist/50">
                    By: {contract.city?.name} | Belønning: {contract.rewardType === "per_unit"
                      ? `${formatUsd(contract.rewardPerUnit)} per handling`
                      : formatUsd(contract.rewardTotal)}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => accept(contract.id)}
                      className="rounded-xl bg-signal/20 px-3 py-1 text-xs text-signal"
                    >
                      Ta kontrakt
                    </button>
                    <button
                      onClick={() => progress(contract.id)}
                      className="rounded-xl bg-neon/20 px-3 py-1 text-xs text-neon"
                    >
                      Send progresjon
                    </button>
                    <button
                      onClick={() => claim(contract.id)}
                      className="rounded-xl bg-emerald-500/20 px-3 py-1 text-xs text-emerald-300"
                    >
                      Hent betaling
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      className="rounded-xl bg-coal/70 px-2 py-1 text-[11px] text-white"
                      type="number"
                      min={1}
                      max={5}
                      value={units}
                      onChange={(e) => setUnits(Number(e.target.value))}
                    />
                    <input
                      className="flex-1 rounded-xl bg-coal/70 px-2 py-1 text-[11px] text-white"
                      placeholder="Åpne tvist (valgfritt)"
                      value={disputeText}
                      onChange={(e) => setDisputeText(e.target.value)}
                    />
                    <button
                      onClick={() => openDispute(contract.id)}
                      className="rounded-xl bg-ember/20 px-2 py-1 text-[11px] text-ember"
                    >
                      Tvist
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {tab === "escrow" ? (
        <div className="grid gap-3">
          {escrow.map((entry) => (
            <div key={entry.id} className="glass rounded-2xl p-4 shadow-card text-xs text-mist/70">
              <div className="flex items-center justify-between text-white">
                <span>Sikker betaling {entry.status}</span>
                <span>{entry.amount}</span>
              </div>
              <div className="mt-1 text-[11px] text-mist/50">Kontrakt: {entry.contractId}</div>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "reputation" ? (
        <div className="glass rounded-2xl p-4 shadow-card text-xs text-mist/70">
          <div className="flex items-center gap-2 text-white">
            <Icon name="badge" />
            Rykte bygges gjennom kontrakter og oppgjør.
          </div>
          <p className="mt-2 text-mist/60">Etter hvert kan du gi vurdering til utførere og oppdragsgivere.</p>
        </div>
      ) : null}
    </AppShell>
  )
}

