import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'

const fcfa = (n) => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`
const dayLabel = (d) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
const STATUS = {
  commandee: 'Commandée',
  en_preparation: 'En préparation',
  prete: 'Prête',
  recuperee: 'Récupérée',
  annulee: 'Annulée',
}

export default function ClientMenu() {
  const { profile, refreshProfile } = useAuth()
  const [menu, setMenu] = useState({})
  const [day, setDay] = useState(null)
  const [cart, setCart] = useState({})
  const [orders, setOrders] = useState([])
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)

  const loadMenu = useCallback(async () => {
    const today = new Date().toLocaleDateString('sv-SE')
    const { data } = await supabase
      .from('menu_days')
      .select('day, dishes(*)')
      .gte('day', today)
      .order('day')
    const grouped = {}
    for (const row of data || []) {
      if (!row.dishes || !row.dishes.available) continue
      if (!grouped[row.day]) grouped[row.day] = []
      grouped[row.day].push(row.dishes)
    }
    setMenu(grouped)
    setDay((d) => d || Object.keys(grouped)[0] || null)
  }, [])

  const loadOrders = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('id, number, status, total, pickup_day, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
    setOrders(data || [])
  }, [])

  useEffect(() => {
    loadMenu()
    loadOrders()
  }, [loadMenu, loadOrders])

  const selectDay = (d) => {
    setDay(d)
    setCart({})
  }
  const add = (dish) =>
    setCart((c) => ({
      ...c,
      [dish.id]: { dish, qty: (c[dish.id]?.qty || 0) + 1 },
    }))
  const remove = (dish) =>
    setCart((c) => {
      const q = (c[dish.id]?.qty || 0) - 1
      const next = { ...c }
      if (q <= 0) delete next[dish.id]
      else next[dish.id] = { dish, qty: q }
      return next
    })

  const lines = Object.values(cart)
  const total = lines.reduce((s, l) => s + l.dish.price * l.qty, 0)

  async function order() {
    setBusy(true)
    setMessage(null)
    const items = lines.map((l) => ({ type: 'dish', id: l.dish.id, qty: l.qty }))
    const { error } = await supabase.rpc('place_order', {
      p_items: items,
      p_pickup: day,
    })
    if (error) setMessage({ type: 'error', text: error.message })
    else {
      setCart({})
      setMessage({ type: 'ok', text: 'Commande envoyée !' })
      await Promise.all([refreshProfile(), loadOrders()])
    }
    setBusy(false)
  }

  async function topUp(amount) {
    setBusy(true)
    setMessage(null)
    const { error } = await supabase.rpc('recharge', { p_amount: amount })
    if (error) setMessage({ type: 'error', text: error.message })
    else await refreshProfile()
    setBusy(false)
  }

  const dishes = (day && menu[day]) || []

  return (
    <div>
      <Header />
      <main style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ marginBottom: 4 }}>Solde : {fcfa(profile?.balance)}</h2>
          <span>Recharger (simulation Mobile Money) : </span>
          {[1000, 2000, 5000].map((a) => (
            <button key={a} disabled={busy} onClick={() => topUp(a)} style={{ marginRight: 8 }}>
              + {a.toLocaleString('fr-FR')}
            </button>
          ))}
        </section>

        {message && (
          <p style={{ color: message.type === 'error' ? '#b00020' : '#2e7d32' }}>
            {message.text}
          </p>
        )}

        <h2>Menu de la semaine</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {Object.keys(menu).map((d) => (
            <button
              key={d}
              onClick={() => selectDay(d)}
              style={{ fontWeight: d === day ? 700 : 400 }}
            >
              {dayLabel(d)}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {dishes.map((dish) => (
            <div key={dish.id} style={{ border: '1px solid #e5e0d8', borderRadius: 12, padding: 12 }}>
              <strong>{dish.name}</strong>
              <div style={{ color: '#666', fontSize: 14 }}>
                {dish.ready_to_go ? 'Prêt à emporter' : 'Préparé sur place'}
              </div>
              <div style={{ margin: '6px 0' }}>{fcfa(dish.price)}</div>
              <button onClick={() => remove(dish)}>-</button>{' '}
              <span>{cart[dish.id]?.qty || 0}</span>{' '}
              <button onClick={() => add(dish)}>+</button>
            </div>
          ))}
        </div>

        <section style={{ marginTop: 24 }}>
          <h3>Ma commande ({day ? dayLabel(day) : ''})</h3>
          {lines.length === 0 && <p>Panier vide.</p>}
          {lines.map((l) => (
            <div key={l.dish.id}>
              {l.qty} × {l.dish.name} — {fcfa(l.dish.price * l.qty)}
            </div>
          ))}
          {lines.length > 0 && (
            <p>
              <strong>Total : {fcfa(total)}</strong>{' '}
              <button disabled={busy} onClick={order}>
                Commander
              </button>
            </p>
          )}
        </section>

        <section style={{ marginTop: 24 }}>
          <h3>Historique</h3>
          {orders.length === 0 && <p>Aucune commande pour l'instant.</p>}
          {orders.map((o) => (
            <div key={o.id}>
              #{o.number} · {dayLabel(o.pickup_day)} · {fcfa(o.total)} · {STATUS[o.status]}
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}
