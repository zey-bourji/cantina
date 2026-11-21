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
import { getGuestCart, clearGuestCart } from '../lib/guestCart'
import { SERVICES, serviceOf, isClosed, closesLabel } from '../lib/services'
import { ALLERGENS, allergensOf, describe, loadAllergies, saveAllergies } from '../lib/food'

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
  const [detail, setDetail] = useState(null)
  const [allergies, setAllergies] = useState(loadAllergies)
  const [askAllergy, setAskAllergy] = useState(() => localStorage.getItem('cantina_allergies') === null)
  const toggleAllergy = (k) =>
    setAllergies((a) => {
      const n = a.includes(k) ? a.filter((x) => x !== k) : [...a, k]
      saveAllergies(n)
      return n
    })
  const closeAllergy = () => { saveAllergies(allergies); setAskAllergy(false) }
  const clash = (d) => allergensOf(d).filter((a) => allergies.includes(a))

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
    const guest = getGuestCart()
    if (guest?.items && guest.day && grouped[guest.day]) {
      // panier commencé avant l'inscription : on le retrouve ici
      const restored = {}
      for (const g of Object.values(guest.items)) {
        const dish = grouped[guest.day].find((x) => x.id === g.id)
        if (dish && dish.left !== 0) restored[dish.id] = { dish, qty: dish.left != null ? Math.min(g.qty, dish.left) : g.qty }
      }
      clearGuestCart()
      if (Object.keys(restored).length) {
        setDay(guest.day)
        setCart(restored)
        return
      }
    }
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
      if (isClosed(dish, day)) return c
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

  const dayKeys = Object.keys(menu)
  const nextDay = dayKeys[dayKeys.indexOf(day) + 1]
  const renderDish = (dish) => (
            <div key={dish.id} className="dish-row">
              <div className="dish-info" role="button" tabIndex={0} onClick={() => setDetail(dish)} onKeyDown={(e) => e.key === 'Enter' && setDetail(dish)}>
                <strong>{dish.name}</strong>
                <small>{dish.ready_to_go ? 'Prêt à emporter' : 'Préparé sur place'}</small>
                {clash(dish).length > 0 && <span className="pill allergy-pill">⚠ Contient : {clash(dish).map((k) => ALLERGENS.find((a) => a[0] === k)?.[1]).join(', ')}</span>}
                {isClosed(dish, day) && (
                  <span className="pill closed-pill">
                    Commandes closes depuis {closesLabel(dish)}
                    {nextDay && <button className="link-btn" onClick={(e) => { e.stopPropagation(); selectDay(nextDay) }}> Réserver pour demain</button>}
                  </span>
                )}
                {dish.left === 0 && <span className="pill sale" style={{ background: '#eee', color: '#555' }}>Épuisé</span>}
                {dish.left > 0 && dish.left <= 5 && <span className="pill sale">Plus que {dish.left}</span>}
                <span className="dish-price">
                  {dish.discount_pct > 0 && <s className="muted" style={{ fontWeight: 400, marginRight: 6 }}>{fcfa(dish.price)}</s>}
                  {fcfa(eff(dish))}
                  {dish.discount_pct > 0 && <span className="pill sale">-{dish.discount_pct} %</span>}
                </span>
              </div>
              <div className="dish-photo">
                <span onClick={() => setDetail(dish)} style={{ cursor: 'pointer', display: 'contents' }}><FoodImg folder="dishes" name={dish.name} category={dish.category} size={72} /></span>
                <div className="dish-add">
                  {cart[dish.id] ? (
                    <>
                      <button onClick={() => remove(dish)}>−</button>
                      <span>{cart[dish.id].qty}</span>
                    </>
                  ) : null}
                  <button onClick={() => add(dish)} disabled={isClosed(dish, day) || dish.left === 0 || (dish.left != null && (cart[dish.id]?.qty || 0) >= dish.left)}>+</button>
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

        <button className="allergy-bar" onClick={() => setAskAllergy(true)}>
          {allergies.length ? `Mes allergies : ${allergies.map((k) => ALLERGENS.find((a) => a[0] === k)?.[1]).join(', ')}` : 'Indiquer mes allergies'}
        </button>

        {message && <p className={message.type === 'error' ? 'error' : 'ok'}>{message.text}</p>}

        {featured.length > 0 && (
          <>
            <div className="section-title">
              <h2>Menu du jour</h2>
            </div>
            <div className="dishes featured-dishes">{featured.map(renderDish)}</div>
            {rest.length > 0 && (
              <div className="section-title">
                <h2>Aussi au menu</h2>
              </div>
            )}
          </>
        )}
        {SERVICES.map((sv) => {
          const list = rest.filter((d) => serviceOf(d).key === sv.key)
          if (!list.length) return null
          return (
            <div key={sv.key}>
              <div className="section-title service-title">
                <h2>{sv.label}</h2>
                <small>{day === new Date().toLocaleDateString('sv-SE') ? `Commande jusqu'à ${closesLabel({ service: sv.key })}` : 'Réservation'}</small>
              </div>
              <div className="dishes">{list.map(renderDish)}</div>
            </div>
          )
        })}

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

      {askAllergy && (
        <div className="modal-back" onClick={closeAllergy}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <h3>Des allergies ou intolérances ?</h3>
            <p className="muted">Choisis ce que tu dois éviter. On te prévient sur chaque plat concerné.</p>
            <div className="allergy-grid">
              {ALLERGENS.map(([k, label, ico]) => (
                <button key={k} className={allergies.includes(k) ? 'chip on' : 'chip'} onClick={() => toggleAllergy(k)}>{ico} {label}</button>
              ))}
            </div>
            <button className="btn-big" onClick={closeAllergy}>{allergies.length ? 'Enregistrer' : "Je n'ai pas d'allergie"}</button>
          </div>
        </div>
      )}
      {detail && (
        <div className="modal-back" onClick={() => setDetail(null)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <button className="modal-x" onClick={() => setDetail(null)} aria-label="Fermer">×</button>
            <div className="detail-photo"><FoodImg folder="dishes" name={detail.name} category={detail.category} size="fill" /></div>
            <h3>{detail.name}</h3>
            <p className="detail-price">{fcfa(eff(detail))}{detail.discount_pct > 0 && <s className="muted"> {fcfa(detail.price)}</s>}</p>
            <p>{describe(detail)}</p>
            <p className="muted" style={{ margin: '4px 0 8px' }}>{detail.ready_to_go ? 'Prêt à emporter' : 'Préparé sur place à la commande'}</p>
            <strong>Allergènes possibles</strong>
            <div className="allergy-grid" style={{ margin: '8px 0 12px' }}>
              {allergensOf(detail).length === 0 && <span className="muted">Aucun allergène courant détecté.</span>}
              {allergensOf(detail).map((k) => {
                const a = ALLERGENS.find((x) => x[0] === k)
                return <span key={k} className={allergies.includes(k) ? 'chip danger' : 'chip'}>{a?.[2]} {a?.[1]}</span>
              })}
            </div>
            {clash(detail).length > 0 && <p className="error">Attention, ce plat peut contenir ce que tu dois éviter.</p>}
            <small className="muted">Liste indiquée d'après la recette. En cas d'allergie sévère, demande à la caisse.</small>
            <button className="btn-big" style={{ marginTop: 12 }} disabled={detail.left === 0 || isClosed(detail, day)} onClick={() => { add(detail); setDetail(null) }}>{isClosed(detail, day) ? 'Commandes closes pour aujourd\'hui' : 'Ajouter à ma commande'}</button>
          </div>
        </div>
      )}
      <TabBar />
    </div>
  )
}
