import { ReactNode, useEffect, useMemo, useState } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import { clearSession } from "../lib/auth"
import api from "../lib/api"
import Icon from "./Icon"
import Topbar from "./Topbar"
import { useSession } from "../hooks/useSession"
import { formatNumber, formatUsd } from "../utils/format"

export default function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const { profile } = useSession()
  const [suggestion] = useState("Bygg energi og ta et oppdrag.")
  const [miniFeed, setMiniFeed] = useState<string[]>([])

  useEffect(() => {
    api.get("/world/feed").then((res) => {
      setMiniFeed(res.data.headlines?.slice(0, 3) || [])
    })
  }, [])

  const navGroups = useMemo(
    () => [
      {
        title: "Kontroll",
        items: [
          { to: "/", label: "Oversikt", icon: "spark", status: profile?.energy > 10 ? "Klar" : "Venter" },
          { to: "/missions", label: "Oppdrag", icon: "sword", status: profile?.energy > 12 ? "Klar" : "Nedkjøling" },
          { to: "/passive", label: "Passive", icon: "timer", status: "Aktiv" },
          { to: "/travel", label: "Reise", icon: "travel" }
        ]
      },
      {
        title: "Økonomi",
        items: [
          { to: "/market", label: "Marked", icon: "market", status: "Klar" },
          { to: "/gambling", label: "Pengespill", icon: "gambling", status: "Klar" },
          { to: "/darknet", label: "Mørkenett", icon: "darknet" }
        ]
      },
      {
        title: "Sosialt",
        items: [
          { to: "/crew", label: "Crew", icon: "crew" },
          { to: "/contacts", label: "Kontakter", icon: "network" },
          { to: "/notifications", label: "Varsler", icon: "signal" }
        ]
      }
    ],
    [profile?.energy]
  )

  const logout = async () => {
    try {
      await api.post("/auth/logout")
    } catch (err) {
      // ignore
    }
    clearSession()
    navigate("/login")
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4">
        <Topbar onLogout={logout} />
        <div className="grid gap-4 lg:grid-cols-[240px_1fr_300px]">
          <aside className="glass card-grid rounded-3xl p-4 shadow-card">
            <div className="mb-4 text-xs uppercase tracking-[0.3em] text-neon/70">Kontrollpanel</div>
            {navGroups.map((group) => (
              <div key={group.title} className="mb-4">
                <div className="mb-2 text-[10px] uppercase text-mist/50">{group.title}</div>
                <nav className="flex flex-col gap-1">
                  {group.items.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className={({ isActive }) =>
                        `flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition ${
                          isActive ? "bg-neon/20 text-neon" : "text-mist/80 hover:text-white"
                        }`
                      }
                    >
                      <Icon name={link.icon as any} className="h-4 w-4" />
                      <span>{link.label}</span>
                      {link.status ? (
                        <span className="ml-auto rounded-full bg-neon/20 px-2 py-0.5 text-[10px] text-neon">
                          {link.status}
                        </span>
                      ) : null}
                    </NavLink>
                  ))}
                </nav>
              </div>
            ))}
          </aside>

          <main className="min-h-[70vh]">{children}</main>

          <aside className="glass rounded-3xl p-4 shadow-card">
            <div className="text-xs uppercase tracking-[0.3em] text-mist/60">Status</div>
            <div className="mt-3 space-y-3 text-xs text-mist/70">
              <div className="rounded-xl bg-coal/70 p-3">
                <div className="flex items-center justify-between text-white">
                  <span className="flex items-center gap-2"><Icon name="travel" />Sted</span>
                  <span>{profile?.location || "Oslo"}</span>
                </div>
              </div>
              <div className="rounded-xl bg-coal/70 p-3">
                <div className="flex items-center justify-between text-white">
                  <span className="flex items-center gap-2"><Icon name="wallet" />USD</span>
                  <span>{formatUsd(profile?.fiatBalance)}</span>
                </div>
              </div>
              <div className="rounded-xl bg-coal/70 p-3">
                <div className="flex items-center justify-between text-white">
                  <span className="flex items-center gap-2"><Icon name="wallet" />Token</span>
                  <span>{formatNumber(profile?.tokenBalance ?? 0)}</span>
                </div>
              </div>
              <div className="rounded-xl bg-coal/70 p-3">
                <div className="flex items-center justify-between text-white">
                  <span className="flex items-center gap-2"><Icon name="timer" />Energi</span>
                  <span>{profile?.energy}</span>
                </div>
              </div>
              <div className="rounded-xl bg-coal/70 p-3">
                <div className="flex items-center justify-between text-white">
                  <span className="flex items-center gap-2"><Icon name="warning" />Heat</span>
                  <span>{profile?.heat}</span>
                </div>
              </div>
              <div className="rounded-xl bg-coal/70 p-3">
                <div className="flex items-center justify-between text-white">
                  <span className="flex items-center gap-2"><Icon name="shield" />Compliance</span>
                  <span>{profile?.compliance}</span>
                </div>
              </div>
              <div className="rounded-xl bg-coal/70 p-3">
                <div className="flex items-center justify-between text-white">
                  <span className="flex items-center gap-2"><Icon name="badge" />Respekt</span>
                  <span>{profile?.respect}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-white/10 bg-coal/60 p-3 text-xs text-mist/60">
              Hva nå: {suggestion}
            </div>
            <div className="mt-4 rounded-xl bg-coal/60 p-3 text-xs text-mist/60">
              <div className="text-white">Mini-feed</div>
              <ul className="mt-2 space-y-1">
                {miniFeed.length ? miniFeed.map((item, index) => <li key={index}>• {item}</li>) : <li>Ingen nye signaler.</li>}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
