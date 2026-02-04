import { useEffect, useState } from "react"
import AppShell from "../components/AppShell"
import PageHeader from "../components/PageHeader"
import Icon from "../components/Icon"
import api from "../lib/api"
import banner from "../assets/banner-events.svg"

export default function World() {
  const [cities, setCities] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])

  useEffect(() => {
    api.get("/world/state").then((res) => {
      setCities(res.data.cities)
      setEvents(res.data.events)
    })
  }, [])

  return (
    <AppShell>
      <PageHeader title="Verdensstatus" subtitle="Byer og trykk" description="Heat skaper risiko. Følg med på byenes stemning." banner={banner} />
      
      <div className="grid gap-4 lg:grid-cols-3">
        {cities.map((city) => (
          <div key={city.id} className="glass rounded-2xl p-4 shadow-card">
            <div className="flex items-center gap-2 text-white">
              <Icon name="signal" />
              <h3 className="text-lg font-semibold">{city.name}</h3>
            </div>
            <div className="mt-3 space-y-2 text-xs text-mist/70">
              <div>Kontroll: {city.controlLevel}</div>
              <div>Politisk trykk: {city.politicalPressure}</div>
              <div>Økonomisk temperatur: {city.economicHeat}</div>
              <div>Risikoindeks: {city.riskIndex}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 glass rounded-2xl p-4 shadow-card">
        <h3 className="text-lg font-semibold text-white">Globale events</h3>
        <div className="mt-3 space-y-2 text-sm text-mist/70">
          {events.map((event) => (
            <div key={event.id} className="rounded-xl bg-coal/70 p-3">
              <div className="flex items-center gap-2 text-white">
                <Icon name="warning" />
                <span>{event.title}</span>
              </div>
              <p className="mt-1 text-xs text-mist/60">{event.description}</p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}

