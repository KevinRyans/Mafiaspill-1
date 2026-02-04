import { ReactNode, useEffect, useMemo, useState } from "react"
import { NavLink, useNavigate, useLocation } from "react-router-dom"
import { clearSession } from "../lib/auth"
import api from "../lib/api"
import Icon from "./Icon"
import Topbar from "./Topbar"
import { useSession } from "../hooks/useSession"
import Countdown from "./shared/Countdown"
import { formatNumber, formatUsd } from "../utils/format"
import { getHeatClass, getHeatLabel } from "../utils/heat"

export default function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, cooldowns } = useSession()
  const [miniFeed, setMiniFeed] = useState<string[]>([])
  const downUntil = profile?.downUntil ? new Date(profile.downUntil).getTime() : null
  const isDown = downUntil ? downUntil > Date.now() : false
  const travelEndTime = cooldowns?.travelEndsAt || cooldowns?.travelCooldownEndsAt || null

  useEffect(() => {
    api.get("/world/feed").then((res) => {
      setMiniFeed(res.data.headlines?.slice(0, 3) || [])
    })
  }, [])

  const navGroups = useMemo(
    () => [
      {
        title: "Handlinger",
        items: [
          { to: "/", label: "Hovedkvarter", icon: "spark" },
          {
            to: "/missions",
            label: "Oppdrag",
            icon: "sword",
            endTime: cooldowns?.missionEndsAt,
            hasCooldown: true
          },
          { to: "/crime", label: "Kriminalitet", icon: "warning", endTime: cooldowns?.crimeEndsAt, hasCooldown: true },
          { to: "/car-theft", label: "Biltyveri", icon: "car", endTime: cooldowns?.carTheftEndsAt, hasCooldown: true },
          {
            to: "/house-robbery",
            label: "Stjel fra hus",
            icon: "darknet",
            endTime: cooldowns?.houseRobberyEndsAt,
            hasCooldown: true
          },
          {
            to: "/player-robbery",
            label: "Ran spiller",
            icon: "sword",
            endTime: cooldowns?.playerRobberyEndsAt,
            hasCooldown: true
          },
          { to: "/fight-club", label: "Fight club", icon: "badge", endTime: cooldowns?.fightClubEndsAt, hasCooldown: true },
          { to: "/organized", label: "Organisert krim", icon: "crew", endTime: cooldowns?.missionEndsAt, hasCooldown: true }
        ]
      },
      {
        title: "Økonomi",
        items: [
          { to: "/market", label: "Marked", icon: "market" },
          { to: "/bank", label: "Bank", icon: "wallet" },
          { to: "/respect", label: "Respekt", icon: "spark" },
          { to: "/businesses", label: "Firmaer", icon: "wallet" },
          { to: "/garage", label: "Garasje", icon: "car" },
          {
            to: "/gambling",
            label: "Pengespill",
            icon: "gambling",
            endTime: null,
            hasCooldown: false
          },
          { to: "/darknet", label: "Mørkenett", icon: "darknet" }
        ]
      },
      {
        title: "Diverse",
        items: [
          { to: "/passive", label: "Passive", icon: "timer" },
          {
            to: "/travel",
            label: "Reise",
            icon: "travel",
            endTime: travelEndTime,
            hasCooldown: true
          },
          {
            to: "/prison",
            label: "Fengsel",
            icon: "warning",
            endTime: cooldowns?.prisonEndsAt
          },
          { to: "/notifications", label: "Varsler", icon: "signal" }
        ]
      },
      {
        title: "Sosialt",
        items: [
          { to: "/crew", label: "Familie", icon: "crew" },
          { to: "/contacts", label: "Kontakter", icon: "network" }
        ]
      }
    ],
    [
      cooldowns?.missionEndsAt,
      cooldowns?.travelEndsAt,
      cooldowns?.crimeEndsAt,
      cooldowns?.carTheftEndsAt,
      cooldowns?.houseRobberyEndsAt,
      cooldowns?.playerRobberyEndsAt,
      cooldowns?.prisonEndsAt,
      cooldowns?.fightClubEndsAt,
      cooldowns?.travelCooldownEndsAt,
      cooldowns?.travelEndsAt
    ]
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
        <Topbar onLogout={logout} profile={profile} />
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
                        `flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition-all duration-150 hover:-translate-y-0.5 ${
                          isActive ? "bg-neon/20 text-neon" : "text-mist/80 hover:text-white"
                        }`
                      }
                    >
                      <Icon name={link.icon as any} className="h-4 w-4" />
                      <span>{link.label}</span>
                      {link.endTime || link.hasCooldown ? (
                        <span className="ml-auto rounded-full bg-neon/20 px-2 py-0.5 text-[10px] text-neon">
                          {link.endTime ? <Countdown endTime={link.endTime} /> : "Klar"}
                        </span>
                      ) : null}
                    </NavLink>
                  ))}
                </nav>
              </div>
            ))}
          </aside>

          <main className="min-h-[70vh]">
            <div key={location.pathname} className="animate-fade-up motion-reduce:animate-none">
              {children}
            </div>
          </main>

          <aside className="glass rounded-3xl p-4 shadow-card">
            <div className="text-xs uppercase tracking-[0.3em] text-mist/60">Meny</div>
            <div className="mt-3 space-y-3 text-xs text-mist/70">
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
                  <span className="flex items-center gap-2"><Icon name="travel" />Sted</span>
                  <span>{profile?.location || "Oslo"}</span>
                </div>
                <div className="mt-2 text-[11px] text-mist/60">Heat i byen</div>
                <span className={`mt-1 inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${getHeatClass(profile?.cityHeat ?? 0)}`}>
                  {getHeatLabel(profile?.cityHeat ?? 0)}
                </span>
              </div>
              <div className="rounded-xl bg-coal/70 p-3">
                <div className="flex items-center justify-between text-white">
                  <span className="flex items-center gap-2"><Icon name="badge" />Liv</span>
                  <span>{profile?.health ?? 100}%</span>
                </div>
              </div>
              <div className="rounded-xl bg-coal/70 p-3">
                <div className="flex items-center justify-between text-white">
                  <span className="flex items-center gap-2"><Icon name="shield" />Forsvar</span>
                  <span>{formatNumber(profile?.defense ?? 0)}</span>
                </div>
              </div>
              <div className="rounded-xl bg-coal/70 p-3">
                <div className="flex items-center justify-between text-white">
                  <span className="flex items-center gap-2"><Icon name="crew" />Familie</span>
                  <span>{profile?.familyName || "Ingen"}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-white/10 bg-coal/60 p-3 text-xs text-mist/60">
              {isDown ? (
                <span>
                  Du er satt ut av spill i <Countdown endTime={downUntil} />. Bygg opp forsvar før du går ut igjen.
                </span>
              ) : (
                <span>Hva nå: Hold forsvar oppe og velg neste handling.</span>
              )}
            </div>
            <div className="mt-4 rounded-xl bg-coal/60 p-3 text-xs text-mist/60">
              <div className="text-white">Siste hendelser</div>
              <ul className="mt-2 space-y-1">
                {miniFeed.length ? miniFeed.map((item, index) => <li key={index}>- {item}</li>) : <li>Ingen nye signaler.</li>}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
