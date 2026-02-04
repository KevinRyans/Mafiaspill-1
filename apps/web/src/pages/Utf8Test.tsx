import AppShell from "../components/AppShell"
import PageHeader from "../components/PageHeader"
import banner from "../assets/banner-events.svg"

export default function Utf8Test() {
  return (
    <AppShell>
      <PageHeader
        title="UTF-8 Test"
        subtitle="ÆØÅ-sjekk"
        description="Denne siden bekrefter at norske tegn rendres riktig."
        banner={banner}
      />
      <div className="mt-4 rounded-2xl border border-white/10 bg-coal/60 p-4 text-sm text-white">
        Teststreng: ÆØÅæøå
      </div>
    </AppShell>
  )
}
