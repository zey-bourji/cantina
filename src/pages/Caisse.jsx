import { useCallback, useEffect, useRef, useState } from 'react'
import Header from '../components/Header'
import { supabase } from '../lib/supabase'
import { useOrders, today, dateStr, fcfa, STATUS } from '../hooks/useOrders'

const NEXT = {
  commandee: ['prete', 'Marquer prête'],
  en_preparation: ['prete', 'Marquer prête'],
  prete: ['recuperee', 'Remise au client'],
}


const dayName = (d, i) => (i === 0 ? "Aujourd'hui" : i === 1 ? 'Demain' : new Date(`${d}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }))

export function DayQuantities({ startIndex = 0, title = 'Quantités des plats' }) {
  const days = Array.from({ length: 7 }, (_, i) => dateStr(i))
  const [day, setDay] = useState(days[startIndex])
  const [dishes, setDishes] = useState([])
  const [qtys, setQtys] = useState({})
  const [vals, setVals] = useState({})
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const [d, m] = await Promise.all([
      supabase.from('dishes').select('id, name, category').eq('available', true).eq('approved', true).order('category').order('name'),
      supabase.from('menu_days').select('dish_id, qty').eq('day', day),
    ])
    setDishes(d.data || [])
    const map = {}
    for (const r of m.data || []) map[r.dish_id] = r.qty
    setQtys(map)
    setVals({})
  }, [day])
  useEffect(() => { load() }, [load])

  async function save(id) {
    const v = vals[id]
    if (v === '' || v === undefined) return
    const { error } = await supabase.rpc('set_day_qty', { p_day: day, p_dish: id, p_qty: Number(v) })
    setMsg(error ? error.message : 'Enregistré')
    load()
  }
  async function retirer(id) {
    await supabase.rpc('set_day_qty', { p_day: day, p_dish: id, p_qty: -1 })
    load()
  }

  return (
    <section className="card" style={{ marginBottom: 18 }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        Mets le nombre de portions du jour. Chaque commande ou réservation fait baisser le chiffre, et le plat passe en « Épuisé » à zéro.
      </p>
      <div className="daytabs" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {days.map((d, i) => (
          <button key={d} className={d === day ? '' : 'secondary'} onClick={() => setDay(d)}>{dayName(d, i)}</button>
        ))}
      </div>
      {msg && <p className="muted">{msg}</p>}
      {dishes.map((d) => {
        const inMenu = d.id in qtys
        const q = qtys[d.id]
        return (
          <div key={d.id} className="order-row" style={{ gap: 8, alignItems: 'center' }}>
            <span style={{ flex: 1 }}>
              <strong>{d.name}</strong><br />
              <small className="muted">
                {!inMenu ? 'Pas au menu ce jour' : q === null ? 'Sans limite' : q === 0 ? 'Épuisé' : `${q} restantes`}
              </small>
            </span>
            <input type="number" inputMode="numeric" min="0" placeholder="Qté" value={vals[d.id] ?? ''} onChange={(e) => setVals({ ...vals, [d.id]: e.target.value })} style={{ width: 80 }} />
            <button onClick={() => save(d.id)}>OK</button>
            {inMenu && <button className="secondary" onClick={() => retirer(d.id)}>Retirer</button>}
          </div>
        )
      })}
    </section>
  )
}

export function ProposeDish() {
  const [f, setF] = useState({ name: '', category: 'plat_ivoirien', price: '' })
  const [msg, setMsg] = useState('')
  async function send(e) {
    e.preventDefault()
    const { error } = await supabase.rpc('propose_dish', { p_name: f.name.trim(), p_category: f.category, p_price: Number(f.price) })
    if (error) return setMsg(error.message)
    setMsg('Plat envoyé. L\'administrateur le validera ce soir.')
    setF({ name: '', category: f.category, price: '' })
  }
  return (
    <section className="card" style={{ marginBottom: 18 }}>
      <h3 style={{ marginTop: 0 }}>Proposer un nouveau plat</h3>
      <p className="muted" style={{ marginTop: 0 }}>Il n'apparaît pas aux clients tant que l'administrateur ne l'a pas validé.</p>
      <form onSubmit={send} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
        <label>Nom<br /><input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label>Catégorie<br />
          <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            <option value="plat_ivoirien">Plat ivoirien</option>
            <option value="sandwich">Sandwich</option>
            <option value="salade">Salade</option>
            <option value="dessert">Dessert</option>
            <option value="boisson">Boisson</option>
          </select>
        </label>
        <label>Prix (FCFA)<br /><input required type="number" inputMode="numeric" min="0" step="50" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} style={{ width: 110 }} /></label>
        <button type="submit">Proposer</button>
      </form>
      {msg && <p className="muted">{msg}</p>}
    </section>
  )
}

function AntiGaspi() {
  const [f, setF] = useState({ qty: 5, price: 3000, discount: 50, from: '17:00' })
  const [msg, setMsg] = useState('')
  async function publish(e) {
    e.preventDefault()
    const { error } = await supabase.rpc('create_antigaspi', { p_qty: Number(f.qty), p_price: Number(f.price), p_discount: Number(f.discount), p_from: f.from })
    setMsg(error ? error.message : 'Paniers publiés. Les clients sont prévenus dans leur boîte de réception.')
  }
  const sale = Math.round(Number(f.price || 0) * (100 - Number(f.discount || 0)) / 100)
  return (
    <section className="card" style={{ marginBottom: 18, borderLeft: '6px solid #34A853' }}>
      <h3 style={{ marginTop: 0 }}>Panier anti-gaspi</h3>
      <p className="muted" style={{ marginTop: 0 }}>Fin de journée : propose les restes en panier surprise à prix réduit.</p>
      <form onSubmit={publish} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
        <label>Paniers<br /><input type="number" min="1" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} style={{ width: 80 }} /></label>
        <label>Valeur normale<br /><input type="number" min="0" step="100" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} style={{ width: 110 }} /></label>
        <label>Remise %<br /><input type="number" min="10" max="90" value={f.discount} onChange={(e) => setF({ ...f, discount: e.target.value })} style={{ width: 80 }} /></label>
        <label>Retrait dès<br /><input type="time" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></label>
        <button type="submit">Publier à {sale.toLocaleString('fr-FR')} FCFA</button>
      </form>
      {msg && <p className="muted">{msg}</p>}
    </section>
  )
}

export default function Caisse() {
  const { orders, reload } = useOrders(today())
  const [q, setQ] = useState('')
  const seen = useRef(null)
  const [alertMsg, setAlertMsg] = useState(null)

  useEffect(() => {
    const ids = new Set(orders.map((o) => o.id))
    if (seen.current) {
      const fresh = orders.filter((o) => !seen.current.has(o.id))
      if (fresh.length) {
        setAlertMsg(`Nouvelle commande #${fresh[fresh.length - 1].number}`)
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)()
          ;[880, 1175].forEach((f, i) => {
            const o = ctx.createOscillator(); const g = ctx.createGain()
            o.frequency.value = f; o.connect(g); g.connect(ctx.destination)
            g.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.18)
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.16)
            o.start(ctx.currentTime + i * 0.18); o.stop(ctx.currentTime + i * 0.18 + 0.17)
          })
        } catch { /* son bloqué par le navigateur */ }
        setTimeout(() => setAlertMsg(null), 6000)
      }
    }
    seen.current = ids
  }, [orders])

  async function setStatus(id, status) {
    await supabase.from('orders').update({ status }).eq('id', id)
    reload()
  }

  const list = orders
    .filter((o) => !['recuperee', 'annulee'].includes(o.status))
    .filter((o) => !q || String(o.number) === q || String(o.number).startsWith(q))

  return (
    <div>
      <Header />
      <main className="container">
        {alertMsg && <div className="arrive-tag" style={{ position: 'sticky', top: 8, zIndex: 20, fontSize: '1.05rem', padding: '12px 16px' }}>🔔 {alertMsg}</div>}
        <h2>Caisse</h2>
        <div className="receipt-search">
          <label htmlFor="receipt-num">Numéro du reçu du client</label>
          <input
            id="receipt-num"
            inputMode="numeric"
            placeholder="Ex. 123"
            value={q}
            onChange={(e) => setQ(e.target.value.replace(/\D/g, ''))}
          />
        </div>
        {list.length === 0 && <p className="muted">{q ? `Aucune commande avec le numéro ${q}.` : 'Aucune commande en cours.'}</p>}
        <div className="tickets">
          {list.map((o) => (
            <div key={o.id} className={`card ticket-card ${o.arriving ? 'arriving' : ''}`}>
              <div className="ticket-head">
                <strong style={{ fontSize: '1.3rem' }}>#{o.number}</strong>
                <span className="pill pill-mint">{STATUS[o.status]}</span>
              </div>
              <div className="muted">{o.profiles?.full_name || 'Client'}{o.profiles?.phone && <> · <a href={`tel:${o.profiles.phone}`}>{o.profiles.phone}</a></>}</div>
              {o.arriving && <div className="arrive-tag">Arrive dans 5 min</div>}
              <ul>
                {(o.order_items || []).map((i, k) => (
                  <li key={k}>{i.qty} × {i.label}</li>
                ))}
              </ul>
              <div className="ticket-foot">
                <strong>{fcfa(o.total)}</strong>
                {NEXT[o.status] && <button onClick={() => setStatus(o.id, NEXT[o.status][0])}>{NEXT[o.status][1]}</button>}
              </div>
            </div>
          ))}
        </div>
        <DayQuantities />
        <ProposeDish />
        <AntiGaspi />
      </main>
    </div>
  )
}
