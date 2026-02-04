import { useEffect, useRef, useState } from "react"
import { Bell, Mail, Search, User } from "lucide-react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"
import Icon from "./Icon"
import { useNotifications } from "../hooks/useNotifications"

export default function Topbar({
  onLogout,
  profile
}: {
  onLogout: () => void
  profile?: { displayName?: string } | null
}) {
  const { unread } = useNotifications()
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open || !buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    setPosition({ top: rect.bottom + 8, left: rect.right - 176 })
  }, [open])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }
    if (open) {
      window.addEventListener("keydown", handler)
    }
    return () => window.removeEventListener("keydown", handler)
  }, [open])

  return (
    <div className="flex items-center justify-between rounded-2xl bg-coal/70 px-4 py-3 shadow-card">
      <div className="flex items-center gap-4">
        <div className="text-lg font-semibold text-white">Krystall: Kontrollrom</div>
        <div className="hidden items-center gap-2 rounded-xl bg-night/60 px-3 py-2 text-xs text-mist/70 md:flex">
          <Search className="h-4 w-4" />
          <input className="bg-transparent text-xs outline-none" placeholder="Søk spillere, marked, crew..." />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/notifications")} className="relative">
          <Bell className="h-5 w-5 text-mist/70" />
          {unread > 0 ? (
            <span className="absolute -right-1 -top-1 rounded-full bg-ember px-1 text-[10px] text-white">
              {unread}
            </span>
          ) : null}
        </button>
        <div className="relative">
          <Mail className="h-5 w-5 text-mist/70" />
          <span className="absolute -right-1 -top-1 rounded-full bg-signal px-1 text-[10px] text-white">2</span>
        </div>
        <button
          ref={buttonRef}
          onClick={() => setOpen((prev) => !prev)}
          className="flex items-center gap-2 rounded-xl bg-night/60 px-3 py-2 text-xs text-white"
        >
          <User className="h-4 w-4" />
          {profile?.displayName || "Profil"}
        </button>
      </div>
      {open
        ? createPortal(
            <div className="fixed inset-0 z-[9999]">
              <button
                onClick={() => setOpen(false)}
                className="absolute inset-0 cursor-default bg-black/30"
                aria-label="Lukk meny"
              />
              <div
                style={{ top: position.top, left: position.left }}
                className="absolute w-44 rounded-xl border border-white/10 bg-coal/95 p-2 text-xs text-mist/70 shadow-card"
              >
                <button
                  onClick={() => navigate("/profile")}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 hover:bg-coal/60"
                >
                  <Icon name="badge" /> Vis profil
                </button>
                <button
                  onClick={() => navigate("/profile")}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 hover:bg-coal/60"
                >
                  <Icon name="spark" /> Rediger profil
                </button>
                <button className="flex w-full items-center gap-2 rounded-lg px-2 py-2 hover:bg-coal/60">
                  <Icon name="shield" /> Innstillinger
                </button>
                <button
                  onClick={onLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-ember hover:bg-coal/60"
                >
                  <Icon name="warning" /> Logg ut
                </button>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  )
}
