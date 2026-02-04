import { useEffect, useState } from "react"
import AppShell from "../components/AppShell"
import PageHeader from "../components/PageHeader"
import api from "../lib/api"
import banner from "../assets/banner-garage.svg"
import { formatUsd } from "../utils/format"

export default function Garage() {
  const [cars, setCars] = useState<any[]>([])

  const load = async () => {
    const res = await api.get("/garage")
    setCars(res.data.cars || [])
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <AppShell>
      <PageHeader
        title="Garasje"
        subtitle="Samling og status"
        description="Biler du har skaffet via biltyveri. Noen oppdrag krever spesifikke modeller."
        banner={banner}
      />

      <div className="mt-4 rounded-2xl border border-white/10 bg-coal/60 p-4">
        <div className="text-sm font-semibold text-white">Dine biler</div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs text-mist/70">
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-mist/50">
                <th className="py-2">Bil</th>
                <th className="py-2">Klasse</th>
                <th className="py-2">Raritet</th>
                <th className="py-2">Verdi</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {cars.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-mist/50">
                    Garasjen er tom. Prøv biltyveri for å skaffe biler.
                  </td>
                </tr>
              ) : (
                cars.map((car) => (
                  <tr key={car.id} className="border-b border-white/5">
                    <td className="py-2 text-white">
                      {car.carModel?.make} {car.carModel?.model}
                    </td>
                    <td className="py-2">{car.carModel?.class}</td>
                    <td className="py-2">{car.carModel?.rarity}</td>
                    <td className="py-2">{formatUsd(car.carModel?.baseValue)}</td>
                    <td className="py-2">{car.status === "owned" ? "Eid" : car.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  )
}
