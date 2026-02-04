import { FormEvent, useEffect, useState } from "react"
import AppShell from "../components/AppShell"
import PageHeader from "../components/PageHeader"
import api from "../lib/api"
import Icon from "../components/Icon"
import { useToasts } from "../components/ToastProvider"
import banner from "../assets/banner-market.svg"
import { formatUsd } from "../utils/format"

export default function Market() {
  const [listings, setListings] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [message, setMessage] = useState("")
  const [instanceId, setInstanceId] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [price, setPrice] = useState(10000000)
  const [currency, setCurrency] = useState<"fiat" | "token">("fiat")
  const [orderItemId, setOrderItemId] = useState("")
  const [orderQuantity, setOrderQuantity] = useState(1)
  const [orderMaxPrice, setOrderMaxPrice] = useState(12000000)
  const [orderCurrency, setOrderCurrency] = useState<"fiat" | "token">("fiat")
  const { push } = useToasts()

  const load = async () => {
    const response = await api.get("/market/listings")
    const profile = await api.get("/profile/me")
    const orderRes = await api.get("/market/orders")
    setListings(response.data.listings)
    setInventory(profile.data.inventory)
    setOrders(orderRes.data.orders)
    if (!instanceId && profile.data.inventory?.length) {
      setInstanceId(profile.data.inventory[0].id)
    }
    if (!orderItemId && profile.data.inventory?.length) {
      setOrderItemId(profile.data.inventory[0].item.id)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const buy = async (listingId: string) => {
    setMessage("")
    try {
      await api.post(`/market/buy/${listingId}`, { quantity: 1 })
      window.dispatchEvent(new Event("mafiaspill:session"))
      setMessage("Kjøpt! Inventar oppdatert.")
      push({ title: "Marked", body: "Kjøp registrert.", tone: "success" })
      await load()
    } catch (err: any) {
      setMessage(err.response?.data?.message || "Kunne ikke kjøpe")
      push({ title: "Kjøp feilet", body: err.response?.data?.message, tone: "warning" })
    }
  }

  const createListing = async (event: FormEvent) => {
    event.preventDefault()
    setMessage("")
    if (!instanceId) {
      setMessage("Ingen items tilgjengelig for salg.")
      return
    }
    try {
      await api.post("/market/listings", { itemInstanceId: instanceId, quantity, price, currency })
      window.dispatchEvent(new Event("mafiaspill:session"))
      setMessage("Listing opprettet.")
      push({ title: "Listing opprettet", body: "Varer er lagt ut i markedet.", tone: "info" })
      await load()
    } catch (err: any) {
      setMessage(err.response?.data?.message || "Kunne ikke opprette listing")
      push({ title: "Listing feilet", body: err.response?.data?.message, tone: "warning" })
    }
  }

  const createOrder = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await api.post("/market/orders", {
        itemId: orderItemId,
        maxPrice: orderMaxPrice,
        quantity: orderQuantity,
        currency: orderCurrency
      })
      window.dispatchEvent(new Event("mafiaspill:session"))
      push({ title: "Kjøpsønske lagt inn", body: "Du får varsel når det matches.", tone: "info" })
      await load()
    } catch (err: any) {
      push({ title: "Kjøpsønske feilet", body: err.response?.data?.message, tone: "warning" })
    }
  }

  return (
    <AppShell>
      <PageHeader title="Marked" subtitle="Auksjon og trading" description="Kjøp, selg og legg inn kjøpsønsker." banner={banner} />
      
      {message ? <div className="mb-4 text-sm text-neon">{message}</div> : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={createListing} className="glass rounded-2xl p-4 shadow-card">
          <h3 className="text-lg font-semibold text-white">Selg item</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <select
              className="rounded-xl bg-coal/70 px-3 py-2 text-sm text-white"
              value={instanceId}
              onChange={(e) => setInstanceId(e.target.value)}
            >
              {inventory.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.item.name} (x{entry.quantity})
                </option>
              ))}
            </select>
            <input
              className="rounded-xl bg-coal/70 px-3 py-2 text-sm text-white"
              type="number"
              min={1}
              max={10}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              placeholder="Antall"
            />
            <input
              className="rounded-xl bg-coal/70 px-3 py-2 text-sm text-white"
              type="number"
              min={1}
              max={200000000}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              placeholder="Pris"
            />
            <select
              className="rounded-xl bg-coal/70 px-3 py-2 text-sm text-white"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as "fiat" | "token")}
            >
              <option value="fiat">USD</option>
              <option value="token">Token</option>
            </select>
          </div>
          <button className="mt-3 rounded-xl bg-neon/20 px-3 py-2 text-sm text-neon">Legg ut</button>
        </form>

        <form onSubmit={createOrder} className="glass rounded-2xl p-4 shadow-card">
          <h3 className="text-lg font-semibold text-white">Kjøpsønske</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <select
              className="rounded-xl bg-coal/70 px-3 py-2 text-sm text-white"
              value={orderItemId}
              onChange={(e) => setOrderItemId(e.target.value)}
            >
              {inventory.map((entry) => (
                <option key={entry.item.id} value={entry.item.id}>
                  {entry.item.name}
                </option>
              ))}
            </select>
            <input
              className="rounded-xl bg-coal/70 px-3 py-2 text-sm text-white"
              type="number"
              min={1}
              max={10}
              value={orderQuantity}
              onChange={(e) => setOrderQuantity(Number(e.target.value))}
              placeholder="Antall"
            />
            <input
              className="rounded-xl bg-coal/70 px-3 py-2 text-sm text-white"
              type="number"
              min={1}
              max={200000000}
              value={orderMaxPrice}
              onChange={(e) => setOrderMaxPrice(Number(e.target.value))}
              placeholder="Makspris"
            />
            <select
              className="rounded-xl bg-coal/70 px-3 py-2 text-sm text-white"
              value={orderCurrency}
              onChange={(e) => setOrderCurrency(e.target.value as "fiat" | "token")}
            >
              <option value="fiat">USD</option>
              <option value="token">Token</option>
            </select>
          </div>
          <button className="mt-3 rounded-xl bg-signal/20 px-3 py-2 text-sm text-signal">Legg inn</button>
          <div className="mt-3 text-xs text-mist/60">
            Kjøpsønsker matches automatisk når noen legger ut vare til riktig pris.
          </div>
        </form>
      </div>

      <div className="mt-6 grid gap-4">
        {listings.map((listing) => (
          <div key={listing.id} className="glass rounded-2xl p-4 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                  <Icon name="market" />
                  {listing.item.name}
                </h3>
                <p className="text-sm text-mist/70">{listing.item.description}</p>
              </div>
              <div className="text-sm text-neon">
                {listing.currency === "fiat" ? formatUsd(listing.price) : `${listing.price} token`}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-mist/60">
              <span>Antall: {listing.quantity}</span>
              <button
                onClick={() => buy(listing.id)}
                className="rounded-xl bg-neon/20 px-3 py-2 text-xs text-neon"
              >
                Kjøp
              </button>
            </div>
          </div>
        ))}
      </div>

      {orders.length ? (
        <div className="mt-6 glass rounded-2xl p-4 shadow-card">
          <h3 className="text-lg font-semibold text-white">Aktive kjøpsønsker</h3>
          <div className="mt-3 space-y-2 text-xs text-mist/70">
            {orders.map((order) => (
              <div key={order.id} className="rounded-xl bg-coal/70 p-2">
                {order.item.name} | {order.quantity} stk | maks{" "}
                {order.currency === "fiat" ? formatUsd(order.maxPrice) : `${order.maxPrice} token`}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </AppShell>
  )
}

