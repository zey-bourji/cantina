import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import TabBar from '../components/TabBar'
import Checkout from '../components/Checkout'
import Ticket from '../components/Ticket'
import FoodImg from '../components/FoodImg'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { fetchTicket } from '../lib/ticket'
import { fcfa, dateStr } from '../hooks/useOrders'

// Les étapes du plateau et les catégories de plats qui vont dedans
const STEPS = [
  { key: 'entree', label: 'Entrée', cats: ['salade', 'toast', 'entree'] },
  { key: 'plat', label: 'Plat', cats: ['plat_ivoirien', 'sandwich', 'plat'] },
  { key: 'dessert', label: 'Dessert', cats: ['dessert'] },
  { key: 'boisson', label: 'Boisson', cats: ['boisson'] },
  { key: 'sauce', label: 'Sauce', cats: [] },
]
const eff = (d) => Math.round((d.price * (100 - (d.discount_pct || 0))) / 100)
const dayLabel = (d) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })

export default function Plateau() {
  const { profile, refreshProfile } = useAuth()
  const [menu, setMenu] = useState({})
  const [sauces, setSauces] = useState([])
  const [day, setDay] = useState(null)
  const [step, setStep] = useState('plat')
  const [pick, setPick] = useState({ entree: null, plat: null, dessert: null, boisson: null, sauce: [] })
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)
  const [ticket, setTicket] = useState(null)
  const [checkout, setCheckout] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('menu_days').select('day, qty, dishes(*)').gte('day', dateStr(0)).order('day')
    const grouped = {}
    for (const row of data || []) {
      if (!row.dishes || !row.dishes.available || row.qty === 0) continue
      ;(grouped[row.day] ||= []).push({ ...row.dishes, left: row.qty })
    }
    setMenu(grouped)
    setDay((d) => d || Object.keys(grouped)[0] || null)
    const s = await supabase.from('ingredients').select('*').eq('category', 'sauce').order('name')
    setSauces((s.data || []).filter((i) => i.available && i.stock_qty > 0))
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const dishes = ((day && menu[day]) || []).filter((d) => !d.antigaspi)
  const known = STEPS.flatMap((s) => s.cats)
  const optionsFor = (key) => {
    const st = STEPS.find((s) => s.key === key)
    if (key === 'plat') return dishes.filter((d) => st.cats.includes(d.category) || !known.includes(d.category))
    return dishes.filter((d) => st.cats.includes(d.category))
  }

  const chosenDishes = ['entree', 'plat', 'dessert', 'boisson'].map((k) => pick[k]).filter(Boolean)
  const total =
    chosenDishes.reduce((s, d) => s + eff(d), 0) + pick.sauce.reduce((s, i) => s + i.unit_price, 0)
  const count = chosenDishes.length + pick.sauce.length

  const choose = (key, dish) => setPick((p) => ({ ...p, [key]: p[key]?.id === dish.id ? null : dish }))
  const toggleSauce = (s) =>
    setPick((p) => ({
      ...p,
      sauce: p.sauce.some((x) => x.id === s.id) ? p.sauce.filter((x) => x.id !== s.id) : [...p.sauce, s],
    }))
  const selectDay = (d) => {
    setDay(d)
    setPick({ entree: null, plat: null, dessert: null, boisson: null, sauce: [] })
  }

  async function order(method = 'solde') {
    setBusy(true)
    setMessage(null)
    const items = [
      ...chosenDishes.map((d) => ({ type: 'dish', id: d.id, qty: 1 })),
      ...pick.sauce.map((s) => ({ type: 'ingredient', id: s.id, qty: 1 })),
    ]
    const { data, error } = await supabase.rpc('place_order', { p_items: items, p_pickup: day, p_method: method })
    if (error) setMessage(error.message)
    else {
      setPick({ entree: null, plat: null, dessert: null, boisson: null, sauce: [] })
      setCheckout(false)
      await refreshProfile()
      setTicket(await fetchTicket(data))
    }
    setBusy(false)
  }

  const opts = step === 'sauce' ? [] : optionsFor(step)

  return (
    <div>
      <Header />
      {ticket && <Ticket ticket={ticket} onClose={() => setTicket(null)} />}
      <main className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Link to="/menu">← Menu</Link>
          <span className="pill pill-mint">Solde : {fcfa(profile?.balance)}</span>
        </div>
        <h2 style={{ marginTop: 10 }}>Compose ton plateau</h2>
        <p className="muted" style={{ marginTop: -6 }}>Entrée, plat, dessert, boisson, sauce : prends ce que tu veux, passe ce que tu ne veux pas.</p>

        <div className="tabs">
          {Object.keys(menu).map((d) => (
            <button key={d} className={d === day ? 'on' : ''} onClick={() => selectDay(d)}>
              {dayLabel(d)}
            </button>
          ))}
        </div>

        <div className="steps">
          {STEPS.map((s, i) => {
            const done = s.key === 'sauce' ? pick.sauce.length > 0 : !!pick[s.key]
            return (
              <button key={s.key} className={`step ${step === s.key ? 'on' : ''} ${done ? 'done' : ''}`} onClick={() => setStep(s.key)}>
                <span>{done ? '✓' : i + 1}</span>
                {s.label}
              </button>
            )
          })}
        </div>

        {step !== 'sauce' && opts.length === 0 && <p className="muted">Rien de ce type au menu ce jour-là.</p>}
        <div className="opts">
          {opts.map((d) => (
            <button key={d.id} className={`opt ${pick[step]?.id === d.id ? 'on' : ''}`} onClick={() => choose(step, d)}>
              <span className="opt-pic">
                <FoodImg folder="dishes" name={d.name} category={d.category} size={80} />
              </span>
              <strong>{d.name}</strong>
              <small>{fcfa(eff(d))}{d.discount_pct > 0 ? ` (-${d.discount_pct} %)` : ''}</small>
            </button>
          ))}
          {step === 'sauce' &&
            sauces.map((s) => (
              <button key={s.id} className={`opt ${pick.sauce.some((x) => x.id === s.id) ? 'on' : ''}`} onClick={() => toggleSauce(s)}>
                <span className="opt-pic">
                  <FoodImg folder="ingredients" name={s.name} category="sauce" size={80} />
                </span>
                <strong>{s.name}</strong>
                <small>{fcfa(s.unit_price)}</small>
              </button>
            ))}
        </div>

        <div className="card" style={{ marginTop: 18 }}>
          <h3 style={{ marginTop: 0 }}>Mon plateau</h3>
          {count === 0 && <p className="muted" style={{ margin: 0 }}>Il est vide pour l'instant.</p>}
          {STEPS.slice(0, 4).map(
            (s) =>
              pick[s.key] && (
                <div key={s.key} className="order-row">
                  <span><small className="muted">{s.label}</small><br /><strong>{pick[s.key].name}</strong></span>
                  <span>{fcfa(eff(pick[s.key]))}</span>
                </div>
              )
          )}
          {pick.sauce.map((s) => (
            <div key={s.id} className="order-row">
              <span><small className="muted">Sauce</small><br /><strong>{s.name}</strong></span>
              <span>{fcfa(s.unit_price)}</span>
            </div>
          ))}
        </div>
        {message && <p className="error">{message}</p>}
      </main>

      {count > 0 && (
        <div className="cartbar">
          <span>
            <strong>{count}</strong> article{count > 1 ? 's' : ''} · <strong>{fcfa(total)}</strong>
          </span>
          <button className="btn-coral btn-big" disabled={busy} onClick={() => setCheckout(true)}>
            Commander
          </button>
        </div>
      )}
      {checkout && <Checkout total={total} balance={profile?.balance} busy={busy} error={message} onPay={order} onTopUp={async (a) => { const { error } = await supabase.rpc('recharge', { p_amount: a }); if (!error) await refreshProfile() }} onClose={() => setCheckout(false)} />}
      <TabBar />
    </div>
  )
}
