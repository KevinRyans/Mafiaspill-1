import { useEffect, useState } from "react"
import AppShell from "../components/AppShell"
import PageHeader from "../components/PageHeader"
import Icon from "../components/Icon"
import api from "../lib/api"
import banner from "../assets/banner-gambling.svg"
import { useToasts } from "../components/ToastProvider"
import ResultAlert from "../components/shared/ResultAlert"
import { formatUsd } from "../utils/format"

const tabs = [
  { id: "coin", label: "Kast mynt" },
  { id: "blackjack", label: "Blackjack" },
  { id: "race", label: "Hesteløp" },
  { id: "lotto", label: "Lotto" }
]

export default function Gambling() {
  const [games, setGames] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [stake, setStake] = useState(100000)
  const [pick, setPick] = useState(1)
  const [tab, setTab] = useState("coin")
  const [result, setResult] = useState<{ tone: "success" | "error"; text: string } | null>(null)
  const { push } = useToasts()

  const load = async () => {
    const res = await api.get("/gambling/games")
    const lb = await api.get("/gambling/leaderboard")
    setGames(res.data.games)
    setLeaderboard(lb.data.entries)
  }

  useEffect(() => {
    load()
  }, [])

  const currentGame = games.find((game) => game.type === tab)

  useEffect(() => {
    if (currentGame) {
      setStake((prev) => {
        const max = currentGame.maxBet ?? prev
        return Math.min(Math.max(prev, 0), max)
      })
    }
  }, [tab, currentGame])

  const play = async (endpoint: string, payload: any) => {
    try {
      const res = await api.post(endpoint, payload)
      setResult({
        tone: res.data.win ? "success" : "error",
        text: res.data.win ? `Utbetaling ${formatUsd(res.data.payout)}.` : "Ikke denne gangen."
      })
      window.dispatchEvent(new Event("mafiaspill:session"))
      push({
        title: res.data.win ? "Gevinst" : "Tap",
        body: res.data.win ? `Utbetaling ${formatUsd(res.data.payout)}.` : "Ikke denne gangen.",
        tone: res.data.win ? "success" : "warning"
      })
      await load()
    } catch (err: any) {
      setResult({ tone: "error", text: err.response?.data?.message || "Kunne ikke spille" })
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Pengespill"
        subtitle="Odds og toppliste"
        description="Spill når du vil – ingen global nedkjøling."
        banner={banner}
      />
      {result ? <ResultAlert tone={result.tone} title="Resultat" message={result.text} /> : null}

      <div className="mt-4 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass rounded-2xl p-4 shadow-card">
          <div className="flex flex-wrap items-center gap-2">
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

          <div className="mt-4 rounded-2xl bg-coal/60 p-4">
            <div className="flex items-center gap-2 text-sm text-white">
              <Icon name="gambling" /> Innsats
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={0}
                max={currentGame?.maxBet ?? undefined}
                className="rounded-xl bg-coal/70 px-3 py-2 text-sm text-white"
                value={stake}
                onChange={(e) => setStake(Math.max(0, Number(e.target.value)))}
              />
              {tab === "race" ? (
                <select
                  className="rounded-xl bg-coal/70 px-3 py-2 text-sm text-white"
                  value={pick}
                  onChange={(e) => setPick(Number(e.target.value))}
                >
                  <option value={1}>Hest #1</option>
                  <option value={2}>Hest #2</option>
                  <option value={3}>Hest #3</option>
                  <option value={4}>Hest #4</option>
                </select>
              ) : null}
              {tab === "coin" ? (
                <button onClick={() => play("/gambling/coinflip", { stake })} className="rounded-xl bg-neon/20 px-3 py-2 text-sm text-neon">
                  Kast mynt
                </button>
              ) : null}
              {tab === "blackjack" ? (
                <button onClick={() => play("/gambling/blackjack", { stake })} className="rounded-xl bg-neon/20 px-3 py-2 text-sm text-neon">
                  Spill blackjack
                </button>
              ) : null}
              {tab === "race" ? (
                <button onClick={() => play("/gambling/race", { stake, pick })} className="rounded-xl bg-neon/20 px-3 py-2 text-sm text-neon">
                  Sett inn
                </button>
              ) : null}
              {tab === "lotto" ? (
                <button onClick={() => play("/gambling/lotto", { stake })} className="rounded-xl bg-neon/20 px-3 py-2 text-sm text-neon">
                  Lever kupong
                </button>
              ) : null}
            </div>

            <div className="mt-3 text-xs text-mist/70">
              {games.map((game) => (
                <div key={game.id} className="rounded-xl bg-coal/70 p-2">
                  {game.name} | maks {formatUsd(game.maxBet)}
                </div>
              ))}
            </div>
          </div>

        </div>

        <div className="glass rounded-2xl p-4 shadow-card">
          <h3 className="text-lg font-semibold text-white">Toppliste</h3>
          <div className="mt-3 space-y-2 text-xs text-mist/70">
            {leaderboard.length === 0 ? <div>Ingen resultater enda.</div> : null}
            {leaderboard.map((entry: any, index: number) => (
              <div key={index} className="rounded-xl bg-coal/70 p-2">
                {entry.name} - {formatUsd(entry.score)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
