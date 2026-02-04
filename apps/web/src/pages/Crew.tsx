import { FormEvent, useEffect, useState } from "react"
import AppShell from "../components/AppShell"
import PageHeader from "../components/PageHeader"
import api from "../lib/api"
import { getSocket } from "../lib/socket"
import banner from "../assets/banner-crew.svg"
import { formatUsd } from "../utils/format"

export default function Crew() {
  const [crew, setCrew] = useState<any>(null)
  const [membership, setMembership] = useState<any>(null)
  const [crews, setCrews] = useState<any[]>([])
  const [message, setMessage] = useState("")
  const [chat, setChat] = useState<any[]>([])
  const [chatInput, setChatInput] = useState("")
  const [createName, setCreateName] = useState("")
  const [createDesc, setCreateDesc] = useState("")
  const [depositFiat, setDepositFiat] = useState(0)
  const [depositToken, setDepositToken] = useState(0)
  const [withdrawFiat, setWithdrawFiat] = useState(0)
  const [withdrawToken, setWithdrawToken] = useState(0)

  const load = async () => {
    const response = await api.get("/crew")
    if (response.data.crew) {
      setCrew(response.data.crew)
      setMembership(response.data.membership)
      const chatResponse = await api.get("/crew/chat")
      setChat(chatResponse.data.messages)
    } else {
      setCrews(response.data.crews)
    }
  }

  useEffect(() => {
    load()
    const socket = getSocket()
    socket.on("crew:chat", (msg: any) => {
      setChat((prev) => [msg, ...prev].slice(0, 50))
    })
    socket.on("crew:bank:update", (payload: any) => {
      setCrew((prev: any) => ({ ...prev, bankFiat: payload.bankFiat, bankToken: payload.bankToken }))
    })
    return () => {
      socket.off("crew:chat")
      socket.off("crew:bank:update")
    }
  }, [])

  const joinCrew = async (crewId: string) => {
    await api.post(`/crew/join/${crewId}`)
    await load()
  }

  const createCrew = async (event: FormEvent) => {
    event.preventDefault()
    setMessage("")
    await api.post("/crew", { name: createName, description: createDesc })
    await load()
  }

  const sendChat = async (event: FormEvent) => {
    event.preventDefault()
    if (!chatInput) return
    await api.post("/crew/chat", { message: chatInput })
    setChatInput("")
  }

  const deposit = async (event: FormEvent) => {
    event.preventDefault()
    setMessage("")
    try {
      await api.post("/crew/bank/deposit", { amountFiat: depositFiat, amountToken: depositToken })
      setMessage("Bidrag sendt til crew-bank.")
      await load()
    } catch (err: any) {
      setMessage(err.response?.data?.message || "Kunne ikke sende bidrag")
    }
  }

  const withdraw = async (event: FormEvent) => {
    event.preventDefault()
    setMessage("")
    try {
      await api.post("/crew/bank/withdraw", { amountFiat: withdrawFiat, amountToken: withdrawToken })
      setMessage("Uttak fullført.")
      await load()
    } catch (err: any) {
      setMessage(err.response?.data?.message || "Kunne ikke ta ut")
    }
  }

  if (!crew) {
    return (
      <AppShell>
        <PageHeader title="Familie" subtitle="Sosialt" description="Bygg allianser, del ressurser og planlegg familie-aktiviteter." banner={banner} />
        
        <form onSubmit={createCrew} className="glass mb-6 rounded-2xl p-4 shadow-card">
          <h3 className="text-lg font-semibold text-white">Opprett crew</h3>
          <div className="mt-3 grid gap-3">
            <input
              className="rounded-xl bg-coal/70 px-3 py-2 text-sm text-white"
              placeholder="Crew-navn"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
            />
            <input
              className="rounded-xl bg-coal/70 px-3 py-2 text-sm text-white"
              placeholder="Beskrivelse"
              value={createDesc}
              onChange={(e) => setCreateDesc(e.target.value)}
            />
          </div>
          <button className="mt-3 rounded-xl bg-neon/20 px-3 py-2 text-sm text-neon">Opprett</button>
        </form>
        <div className="grid gap-4">
          {crews.map((entry) => (
            <div key={entry.id} className="glass rounded-2xl p-4 shadow-card">
              <h3 className="text-lg font-semibold text-white">{entry.name}</h3>
              <p className="text-sm text-mist/70">{entry.description}</p>
              <button
                onClick={() => joinCrew(entry.id)}
                className="mt-3 rounded-xl bg-signal/20 px-4 py-2 text-sm text-signal"
              >
                Bli med
              </button>
            </div>
          ))}
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <PageHeader title={crew.name} subtitle="Familie" description="Hold familie-bank i balanse og chat med laget." banner={banner} />
      
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass rounded-2xl p-4 shadow-card lg:col-span-2">
          <h3 className="text-lg font-semibold text-white">Crew-chat</h3>
          <form onSubmit={sendChat} className="mt-3 flex gap-2">
            <input
              className="flex-1 rounded-xl bg-coal/70 px-3 py-2 text-sm text-white"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Send melding"
            />
            <button className="rounded-xl bg-neon/20 px-3 py-2 text-sm text-neon">Send</button>
          </form>
          <div className="mt-4 space-y-2 text-sm text-mist/70">
            {chat.map((entry) => (
              <div key={entry.id} className="rounded-xl bg-coal/60 p-3">
                <span className="text-neon">{entry.user.email}</span>: {entry.message}
              </div>
            ))}
          </div>
        </div>
        <div className="glass rounded-2xl p-4 shadow-card">
          <h3 className="text-lg font-semibold text-white">Crew-bank</h3>
          <p className="mt-2 text-sm text-mist/70">
            USD: {formatUsd(crew.bankFiat)} | Token: {crew.bankToken}
          </p>
          <p className="mt-2 text-xs text-mist/60">Rang: {membership.rank}</p>
          <form onSubmit={deposit} className="mt-4 grid gap-2 text-xs text-mist/70">
            <div className="flex gap-2">
              <input
                className="w-1/2 rounded-xl bg-coal/70 px-2 py-1 text-xs text-white"
                type="number"
                min={0}
                value={depositFiat}
                onChange={(e) => setDepositFiat(Number(e.target.value))}
                placeholder="USD"
              />
              <input
                className="w-1/2 rounded-xl bg-coal/70 px-2 py-1 text-xs text-white"
                type="number"
                min={0}
                value={depositToken}
                onChange={(e) => setDepositToken(Number(e.target.value))}
                placeholder="Token"
              />
            </div>
            <button className="rounded-xl bg-neon/20 px-3 py-2 text-xs text-neon">Bidra</button>
          </form>
          <form onSubmit={withdraw} className="mt-3 grid gap-2 text-xs text-mist/70">
            <div className="flex gap-2">
              <input
                className="w-1/2 rounded-xl bg-coal/70 px-2 py-1 text-xs text-white"
                type="number"
                min={0}
                value={withdrawFiat}
                onChange={(e) => setWithdrawFiat(Number(e.target.value))}
                placeholder="USD"
              />
              <input
                className="w-1/2 rounded-xl bg-coal/70 px-2 py-1 text-xs text-white"
                type="number"
                min={0}
                value={withdrawToken}
                onChange={(e) => setWithdrawToken(Number(e.target.value))}
                placeholder="Token"
              />
            </div>
            <button className="rounded-xl bg-ember/20 px-3 py-2 text-xs text-ember">Ta ut</button>
          </form>
          {message ? <p className="mt-2 text-xs text-neon">{message}</p> : null}
        </div>
      </div>
    </AppShell>
  )
}

