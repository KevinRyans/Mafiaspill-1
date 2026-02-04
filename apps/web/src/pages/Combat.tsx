import AppShell from "../components/AppShell"
import PageHeader from "../components/PageHeader"

export default function Combat() {
  return (
    <AppShell>
      <PageHeader
        title="Kamp"
        subtitle="PvP dueller"
        description="Bruk Ran spiller for å starte dueller. Forsvar og livvakter avgjør overlevelse."
      />
      <div className="mt-4 rounded-2xl border border-white/10 bg-coal/60 p-4 text-sm text-mist/70">
        Gå til <span className="text-white">Ran spiller</span> i venstremenyen for å finne mål og starte dueller.
      </div>
    </AppShell>
  )
}
