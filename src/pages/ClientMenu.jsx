import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'
import Ticket from '../components/Ticket'
import FoodImg from '../components/FoodImg'
import TabBar from '../components/TabBar'
import Checkout from '../components/Checkout'
import { fetchTicket } from '../lib/ticket'

const eff = (d) => Math.round((d.price * (100 - (d.discount_pct || 0))) / 100)
const fcfa = (n) => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`
const dayLabel = (d) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
const STATUS = {
  commandee: 'Commandée',
  en_preparation: 'En préparation',
  prete: 'Prête !',
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
  const [ticket, setTicket] = useState(null)
  const [monthCount, setMonthCount] = useState(0)
  const [checkout, setCheckout] = useState(false)

  const loadMenu = useCallback(async () => {
    const today = new Date().toLocaleDateString('sv-SE')
    const { data } = await supabase
      .from('menu_days')
      .select('day, qty, featured, dishes(*)')
      .gte('day', today)
      .order('day')
    const grouped = {}
    for (const row of data || []) {
      if (!row.dishes || !row.dishes.available) continue
      if (!grouped[row.day]) grouped[row.day] = []
      grouped[row.day].push({ ...row.dishes, left: row.qty, featured: !!row.featured })
    }
    setMenu(grouped)
    setDay((d) => d || Object.keys(grouped)[0] || null)
  }, [])

  const loadOrders = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('id, number, status, total, pickup_day, created_at, arriving')
      .order('created_at', { ascending: false })
      .limit(10)
    setOrders(data || [])
  }, [])

  const loadLoyalty = useCallback(async () => {
    const first = new Date().toLocaleDateString('sv-SE').slice(0, 8) + '01'
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .gte('pickup_day', first)
      .neq('status', 'annulee')
    setMonthCount(count || 0)
  }, [])

  useEffect(() => {
    loadMenu()
    loadOrders()
    loadLoyalty()
  }, [loadMenu, loadOrders, loadLoyalty])

  const selectDay = (d) => {
    setDay(d)
    setCart({})
  }
  const add = (dish) =>
    setCart((c) => {
      const have = c[dish.id]?.qty || 0
      if (dish.left !== null && dish.left !== undefined && have >= dish.left) return c
      return { ...c, [dish.id]: { dish, qty: have + 1 } }
    })
  const remove = (dish) =>
    setCart((c) => {
      const q = (c[dish.id]?.qty || 0) - 1
      const next = { ...c }
      if (q <= 0) delete next[dish.id]
      else next[dish.id] = { dish, qty: q }
      return next
    })

  const lines = Object.values(cart)
  const total = lines.reduce((s, l) => s + eff(l.dish) * l.qty, 0)

  async function order(method = 'solde') {
    setBusy(true)
    setMessage(null)
    const items = lines.map((l) => ({ type: 'dish', id: l.dish.id, qty: l.qty }))
    const { data, error } = await supabase.rpc('place_order', { p_items: items, p_pickup: day, p_method: method })
    if (error) setMessage({ type: 'error', text: error.message })
    else {
      setCart({})
      setCheckout(false)
      await Promise.all([refreshProfile(), loadOrders(), loadLoyalty()])
      setTicket(await fetchTicket(data))
    }
    setBusy(false)
  }

  async function arrive(o) {
    setMessage(null)
    const { error } = await supabase.rpc('notify_arrival', { p_order: o.id })
    if (error) setMessage({ type: 'error', text: error.message })
    loadOrders()
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
  const featured = dishes.filter((d) => d.featured)
  const rest = dishes.filter((d) => !d.featured)
  const firstName = (profile?.full_name || '').split(' ')[0]
  const count = lines.reduce((s, l) => s + l.qty, 0)

  const renderDish = (dish) => (
            <div key={dish.id} className="dish-row">
              <div className="dish-info">
                <strong>{dish.name}</strong>
                <small>{dish.ready_to_go ? 'Prêt à emporter' : 'Préparé sur place'}</small>
                {dish.left === 0 && <span className="pill sale" style={{ background: '#eee', color: '#555' }}>Épuisé</span>}
                {dish.left > 0 && dish.left <= 5 && <span className="pill sale">Plus que {dish.left}</span>}
                <span className="dish-price">
                  {dish.discount_pct > 0 && <s className="muted" style={{ fontWeight: 400, marginRight: 6 }}>{fcfa(dish.price)}</s>}
                  {fcfa(eff(dish))}
                  {dish.discount_pct > 0 && <span className="pill sale">-{dish.discount_pct} %</span>}
                </span>
              </div>
              <div className="dish-photo">
                <FoodImg folder="dishes" name={dish.name} category={dish.category} size={72} />
                <div className="dish-add">
                  {cart[dish.id] ? (
                    <>
                      <button onClick={() => remove(dish)}>−</button>
                      <span>{cart[dish.id].qty}</span>
                    </>
                  ) : null}
                  <button onClick={() => add(dish)} disabled={dish.left === 0 || (dish.left != null && (cart[dish.id]?.qty || 0) >= dish.left)}>+</button>
                </div>
              </div>
            </div>
  )

  return (
    <div>
      <Header />
      {ticket && <Ticket ticket={ticket} onClose={() => setTicket(null)} />}
      <div className="hero">
        <div className="hero-in">
          <h2>Salut {firstName || 'toi'} 👋</h2>
          <div className="wallet">
            <div>
              <small>Mon solde</small>
              <strong>{fcfa(profile?.balance)}</strong>
            </div>
            <div className="wallet-btns">
              {[1000, 2000, 5000].map((a) => (
                <button key={a} className="btn-light" disabled={busy} onClick={() => topUp(a)}>
                  + {a.toLocaleString('fr-FR')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <main className="container" style={{ paddingTop: 0 }}>
        <div className="loyal">
          <div className="loyal-top">
            <strong>{monthCount >= 5 ? 'Fidélité : -10 % sur tes commandes ce mois-ci' : `Fidélité : ${monthCount}/5 commandes ce mois-ci`}</strong>
            <small>{monthCount >= 5 ? 'Bravo !' : `Encore ${5 - monthCount} pour -10 %`}</small>
          </div>
          <div className="loyal-bar"><i style={{ width: `${Math.min(100, monthCount * 20)}%` }} /></div>
        </div>
        <Link to="/composer" className="promo">
          <span style={{ fontSize: 34 }}>🥣</span>
          <span>
            <b>Compose ton plat</b>
            <small>Tes ingrédients, ton budget.</small>
          </span>
          <span className="go">→</span>
        </Link>

        <div className="section-title">
          <h2>Menu de la semaine</h2>
        </div>
        <div className="tabs">
          {Object.keys(menu).map((d) => (
            <button key={d} className={d === day ? 'on' : ''} onClick={() => selectDay(d)}>
              {dayLabel(d)}
            </button>
          ))}
        </div>

        {message && <p className={message.type === 'error' ? 'error' : 'ok'}>{message.text}</p>}

        {featured.length > 0 && (
          <>
            <div className="section-title">
              <h2>⭐ Menu du jour</h2>
            </div>
            <div className="dishes featured-dishes">{featured.map(renderDish)}</div>
            {rest.length > 0 && (
              <div className="section-title">
                <h2>Aussi au menu</h2>
              </div>
            )}
          </>
        )}
        <div className="dishes">
          {rest.map(renderDish)}
        </div>

        <div className="section-title" id="commandes">
          <h2>Mes commandes</h2>
        </div>
        {orders.length === 0 && <p className="muted">Aucune commande pour l'instant.</p>}
        <div>
          {orders.map((o) => (
            <div key={o.id} className="order-row">
              <span>
                <strong>#{o.number}</strong> · {dayLabel(o.pickup_day)}
              </span>
              <span>
                {fcfa(o.total)} <span className="pill pill-mint">{STATUS[o.status]}</span>
                {['commandee', 'en_preparation', 'prete'].includes(o.status) &&
                  o.pickup_day === new Date().toLocaleDateString('sv-SE') &&
                  (o.arriving ? (
                    <span className="pill" style={{ marginLeft: 6 }}>On t'attend !</span>
                  ) : (
                    <button className="btn-light" style={{ marginLeft: 6, padding: '0.3em 0.8em', fontSize: '0.8rem' }} onClick={() => arrive(o)}>
                      J'arrive dans 5 min
                    </button>
                  ))}
              </span>
            </div>
          ))}
        </div>
      </main>

      {count > 0 && (
        <div className="cartbar">
          <span>
            <strong>{count}</strong> plat{count > 1 ? 's' : ''} · <strong>{fcfa(total)}</strong>
          </span>
          <button className="btn-coral btn-big" disabled={busy} onClick={() => setCheckout(true)}>
            Commander
          </button>
        </div>
      )}
      {checkout && (
        <Checkout total={total} balance={profile?.balance} busy={busy} error={message?.type === 'error' ? message.text : null} onPay={order} onTopUp={topUp} onClose={() => setCheckout(false)} />
      )}
      <TabBar />
    </div>
  )
}
