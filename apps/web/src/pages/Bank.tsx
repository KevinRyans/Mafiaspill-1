import { useEffect, useState } from "react"
import AppShell from "../components/AppShell"
import PageHeader from "../components/PageHeader"
import api from "../lib/api"
import banner from "../assets/banner-market.svg"
import PrimaryButton from "../components/shared/PrimaryButton"
import ResultAlert from "../components/shared/ResultAlert"
import { useToasts } from "../components/ToastProvider"
import { formatUsd } from "../utils/format"

export default function Bank() {
  const [cash, setCash] = useState(0)
  const [bank, setBank] = useState<any>(null)
  const [amount, setAmount] = useState(5000000)
  const [useAll, setUseAll] = useState(false)
  const [recipient, setRecipient] = useState("")
  const [transferAmount, setTransferAmount] = useState(10000000)
  const [logs, setLogs] = useState<any[]>([])
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null)
  const { push } = useToasts()

  const load = async () => {
    const res = await api.get("/bank")
    setCash(res.data.cash || 0)
    setBank(res.data.bank)
    setLogs(res.data.logs || [])
  }

  useEffect(() => {
    load()
  }, [])

  const deposit = async () => {
    setMessage(null)
    const amountToUse = useAll ? cash : amount
    try {
      await api.post("/bank/deposit", { amount: amountToUse })
      window.dispatchEvent(new Event("mafiaspill:session"))
      push({ title: "Innskudd", body: "USD satt inn i bank.", tone: "success" })
      void load()
    } catch (err: any) {
      setMessage({ tone: "error", text: err.response?.data?.message || "Kunne ikke sette inn" })
    }
  }

  const withdraw = async () => {
    setMessage(null)
    const amountToUse = useAll ? bank?.balance ?? 0 : amount
    try {
      await api.post("/bank/withdraw", { amount: amountToUse })
      window.dispatchEvent(new Event("mafiaspill:session"))
      push({ title: "Uttak", body: "USD hentet ut av bank.", tone: "success" })
      void load()
    } catch (err: any) {
      setMessage({ tone: "error", text: err.response?.data?.message || "Kunne ikke ta ut" })
    }
  }

  const transfer = async () => {
    setMessage(null)
    try {
      await api.post("/bank/transfer", { recipient, amount: transferAmount })
      window.dispatchEvent(new Event("mafiaspill:session"))
      push({ title: "Overføring", body: "USD sendt.", tone: "success" })
      setRecipient("")
      void load()
    } catch (err: any) {
      setMessage({ tone: "error", text: err.response?.data?.message || "Kunne ikke overføre" })
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Bank"
        subtitle="Innskudd, uttak og overføring"
        description="Sikre midlene dine og flytt USD mellom konti."
        banner={banner}
      />

      {message ? <ResultAlert tone={message.tone} title="Bank" message={message.text} /> : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-2xl p-4 shadow-card">
          <div className="text-xs text-mist/60">Kontanter</div>
          <div className="mt-1 text-2xl font-semibold text-white">{formatUsd(cash)}</div>
        </div>
        <div className="glass rounded-2xl p-4 shadow-card">
          <div className="text-xs text-mist/60">Bank</div>
          <div className="mt-1 text-2xl font-semibold text-white">{formatUsd(bank?.balance ?? 0)}</div>
        </div>
        <div className="glass rounded-2xl p-4 shadow-card">
          <div className="text-xs text-mist/60">Rente</div>
          <div className="mt-1 text-2xl font-semibold text-white">{Math.round((bank?.rate ?? 0.01) * 100)}%</div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="glass rounded-2xl p-4 shadow-card">
          <div className="text-sm font-semibold text-white">Innskudd / Uttak</div>
          <div className="mt-3 grid gap-3 text-xs text-mist/70">
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full rounded-xl bg-coal/70 px-3 py-2 text-sm text-white"
              placeholder="Beløp"
            />
            <label className="flex items-center gap-2 text-xs text-mist/60">
              <input type="checkbox" checked={useAll} onChange={(e) => setUseAll(e.target.checked)} />
              Hele beløpet
            </label>
            <div className="flex gap-2">
              <PrimaryButton onClick={deposit}>Sett inn</PrimaryButton>
              <PrimaryButton onClick={withdraw}>Ta ut</PrimaryButton>
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-4 shadow-card">
          <div className="text-sm font-semibold text-white">Overføring</div>
          <div className="mt-3 space-y-2 text-xs text-mist/70">
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full rounded-xl bg-coal/70 px-3 py-2 text-sm text-white"
              placeholder="E-post eller visningsnavn"
            />
            <input
              type="number"
              min={1}
              value={transferAmount}
              onChange={(e) => setTransferAmount(Number(e.target.value))}
              className="w-full rounded-xl bg-coal/70 px-3 py-2 text-sm text-white"
              placeholder="Beløp"
            />
            <PrimaryButton onClick={transfer}>Overfør</PrimaryButton>
          </div>
        </div>
      </div>

      <div className="mt-4 glass rounded-2xl p-4 shadow-card">
        <div className="text-sm font-semibold text-white">Banklogg</div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs text-mist/70">
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-mist/50">
                <th className="py-2">Fra / Til</th>
                <th className="py-2">Beløp</th>
                <th className="py-2">Type</th>
                <th className="py-2">Tidspunkt</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-mist/50">
                    Ingen transaksjoner ennå.
                  </td>
                </tr>
              ) : (
                logs.map((entry) => {
                  const counterparty = entry.counterparty?.profile?.displayName || entry.counterparty?.email || "-"
                  const label =
                    entry.direction === "deposit"
                      ? "Innskudd"
                      : entry.direction === "withdraw"
                      ? "Uttak"
                      : entry.direction === "transfer_in"
                      ? "Inn"
                      : "Ut"
                  const fromTo =
                    entry.direction === "transfer_in"
                      ? `Fra ${counterparty}`
                      : entry.direction === "transfer_out"
                      ? `Til ${counterparty}`
                      : "-"
                  return (
                    <tr key={entry.id} className="border-b border-white/5">
                      <td className="py-2 text-white">{fromTo}</td>
                      <td className="py-2">{formatUsd(entry.amount)}</td>
                      <td className="py-2">{label}</td>
                      <td className="py-2">{new Date(entry.createdAt).toLocaleString("nb-NO")}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  )
}
