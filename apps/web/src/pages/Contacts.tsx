import { useEffect, useState } from "react"
import AppShell from "../components/AppShell"
import PageHeader from "../components/PageHeader"
import Icon from "../components/Icon"
import api from "../lib/api"
import { useToasts } from "../components/ToastProvider"
import banner from "../assets/banner-contacts.svg"

export default function Contacts() {
  const [catalog, setCatalog] = useState<any[]>([])
  const [relations, setRelations] = useState<any[]>([])
  const { push } = useToasts()

  const load = async () => {
    const response = await api.get("/contacts")
    setCatalog(response.data.contacts)
    setRelations(response.data.relations)
  }

  useEffect(() => {
    load()
  }, [])

  const link = async (contactId: string) => {
    await api.post("/contacts/link", { contactId })
    push({ title: "Kontakt opprettet", body: "Nye handlinger kan dukke opp.", tone: "success" })
    await load()
  }

  const boost = async (contactId: string) => {
    await api.post("/contacts/boost", { contactId, trust: 5 })
    push({ title: "Relasjon styrket", body: "Tillit og lojalitet øker.", tone: "info" })
    await load()
  }

  const abuse = async (contactId: string) => {
    await api.post("/contacts/abuse", { contactId })
    push({ title: "Kontakt presset", body: "Lojalitet faller. Risiko for svik.", tone: "warning" })
    await load()
  }

  return (
    <AppShell>
      <PageHeader title="Kontakter" subtitle="Nettverk og relasjoner" description="Bygg tillit og åpne nye fordeler." banner={banner} />
      
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-2xl p-4 shadow-card">
          <h3 className="text-lg font-semibold text-white">Dine kontakter</h3>
          <div className="mt-3 space-y-3">
            {relations.map((relation) => (
              <div key={relation.id} className="rounded-xl bg-coal/70 p-3 text-sm text-mist/70">
                <div className="flex items-center gap-2 text-white">
                  <Icon name={(relation.contact.icon as any) || "network"} />
                  <span>{relation.contact.name}</span>
                  <span className="ml-auto text-xs text-mist/50">{relation.contact.contactType}</span>
                </div>
                <div className="mt-2 text-xs">Tillit: {relation.trust} | Lojalitet: {relation.loyalty}</div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => boost(relation.contactId)}
                    className="rounded-xl bg-neon/20 px-3 py-1 text-xs text-neon"
                  >
                    Styrk
                  </button>
                  <button
                    onClick={() => abuse(relation.contactId)}
                    className="rounded-xl bg-ember/20 px-3 py-1 text-xs text-ember"
                  >
                    Press
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-4 shadow-card">
          <h3 className="text-lg font-semibold text-white">Kontaktkatalog</h3>
          <div className="mt-3 space-y-3">
            {catalog.map((contact) => (
              <div key={contact.id} className="rounded-xl bg-coal/70 p-3 text-sm text-mist/70">
                <div className="flex items-center gap-2 text-white">
                  <Icon name={(contact.icon as any) || "network"} />
                  <span>{contact.name}</span>
                  <span className="ml-auto text-xs text-mist/50">{contact.contactType}</span>
                </div>
                {contact.city ? (
                  <div className="mt-1 text-xs text-mist/50">By: {contact.city.name}</div>
                ) : null}
                <p className="mt-1 text-xs text-mist/60">{contact.description}</p>
                <button
                  onClick={() => link(contact.id)}
                  className="mt-3 rounded-xl bg-signal/20 px-3 py-1 text-xs text-signal"
                >
                  Opprett kontakt
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}

