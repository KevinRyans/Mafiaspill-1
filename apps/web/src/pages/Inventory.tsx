import AppShell from "../components/AppShell"
import PageHeader from "../components/PageHeader"
import { useSession } from "../hooks/useSession"
import banner from "../assets/banner-inventory.svg"

export default function Inventory() {
  const { inventory, loading } = useSession()

  return (
    <AppShell>
      <PageHeader title="Inventar" subtitle="Utstyr og samlinger" description="Samle gjenstander og hold oversikt på beholdningen." banner={banner} />
      
      {loading ? <p className="text-mist/70">Laster...</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {inventory.map((entry: any) => (
          <div key={entry.id} className="glass rounded-2xl p-4 shadow-card">
            <h3 className="text-lg font-semibold text-white">{entry.item.name}</h3>
            <p className="text-sm text-mist/70">{entry.item.description}</p>
            <div className="mt-3 text-xs text-mist/60">Antall: {entry.quantity}</div>
          </div>
        ))}
      </div>
    </AppShell>
  )
}

