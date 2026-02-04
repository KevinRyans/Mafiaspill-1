import { useEffect, useState } from "react"
import AppShell from "../components/AppShell"
import PageHeader from "../components/PageHeader"
import Icon from "../components/Icon"
import api from "../lib/api"
import { useToasts } from "../components/ToastProvider"

export default function Profile() {
  const [profile, setProfile] = useState<any>(null)
  const [Merker, setMerker] = useState<any[]>([])
  const [form, setForm] = useState({ title: "", playstyle: "", reputationTag: "", Historikk: "", specialization: "" })
  const { push } = useToasts()

  const load = async () => {
    const response = await api.get("/profile/me")
    setProfile(response.data.profile)
    setMerker(response.data.Merker || [])
    setForm({
      title: response.data.profile.title || "",
      playstyle: response.data.profile.playstyle || "",
      reputationTag: response.data.profile.reputationTag || "",
      Historikk: response.data.profile.Historikk || "",
      specialization: response.data.profile.specialization || ""
    })
  }

  useEffect(() => {
    load()
  }, [])

  const save = async () => {
    await api.patch("/profile/me", form)
    push({ title: "Profil oppdatert", body: "Identiteten din er lagret.", tone: "success" })
    await load()
  }

  if (!profile) {
    return <div className="p-6 text-mist/70">Laster...</div>
  }

  return (
    <AppShell>
      <PageHeader title="Profil" subtitle="Identitet og rykte" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-2xl p-4 shadow-card">
          <h3 className="text-lg font-semibold text-white">Din identitet</h3>
          <div className="mt-3 space-y-2 text-sm text-mist/70">
            <div className="flex items-center gap-2 text-white">
              <Icon name="badge" />
              <span>{profile.displayName}</span>
              <span className="ml-auto text-xs text-mist/50">{profile.title}</span>
            </div>
            <div className="text-xs">Spillestil: {profile.playstyle}</div>
            <div className="text-xs">Rykte: {profile.reputationTag}</div>
            <div className="text-xs">Spesialisering: {profile.specialization}</div>
          </div>
          <div className="mt-4 grid gap-2 text-xs">
            <input
              className="rounded-xl bg-coal/70 px-3 py-2 text-xs text-white"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Tittel"
            />
            <input
              className="rounded-xl bg-coal/70 px-3 py-2 text-xs text-white"
              value={form.playstyle}
              onChange={(e) => setForm((prev) => ({ ...prev, playstyle: e.target.value }))}
              placeholder="Spillestil"
            />
            <input
              className="rounded-xl bg-coal/70 px-3 py-2 text-xs text-white"
              value={form.reputationTag}
              onChange={(e) => setForm((prev) => ({ ...prev, reputationTag: e.target.value }))}
              placeholder="Rykte"
            />
            <input
              className="rounded-xl bg-coal/70 px-3 py-2 text-xs text-white"
              value={form.specialization}
              onChange={(e) => setForm((prev) => ({ ...prev, specialization: e.target.value }))}
              placeholder="Spesialisering"
            />
            <textarea
              className="rounded-xl bg-coal/70 px-3 py-2 text-xs text-white"
              value={form.Historikk}
              onChange={(e) => setForm((prev) => ({ ...prev, Historikk: e.target.value }))}
              placeholder="Historikk"
            />
            <button onClick={save} className="rounded-xl bg-neon/20 px-3 py-2 text-xs text-neon">
              Lagre
            </button>
          </div>
        </div>

        <div className="glass rounded-2xl p-4 shadow-card">
          <h3 className="text-lg font-semibold text-white">Merker</h3>
          <div className="mt-3 space-y-2">
            {Merker.map((entry) => (
              <div key={entry.id} className="rounded-xl bg-coal/70 p-3 text-xs text-mist/70">
                <div className="flex items-center gap-2 text-white">
                  <Icon name={(entry.achievement.icon as any) || "badge"} />
                  <span>{entry.achievement.name}</span>
                  <span className="ml-auto text-xs text-mist/50">+{entry.achievement.points}</span>
                </div>
                <div className="mt-1 text-xs text-mist/60">{entry.achievement.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
