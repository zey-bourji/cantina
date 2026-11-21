import { useCallback, useEffect, useState } from 'react'
import Header from '../components/Header'
import FoodImg from '../components/FoodImg'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useOrders, today, dateStr, tally, fcfa, STATUS } from '../hooks/useOrders'

const DISH_CATS = [
  ['plat_ivoirien', 'Plat ivoirien'], ['plat', 'Plat'], ['sandwich', 'Sandwich'], ['salade', 'Salade'],
  ['toast', 'Toast'], ['entree', 'Entrée'], ['dessert', 'Dessert'], ['boisson', 'Boisson'], ['autre', 'Autre'],
]
const catOptions = (cur) => (DISH_CATS.some(([k]) => k === cur) || !cur ? DISH_CATS : [...DISH_CATS, [cur, cur]])
  .map(([k, l]) => <option key={k} value={k}>{l}</option>)

const short = (d) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })

export default function Admin() {
  const [tab, setTab] = useState('stats')
  return (
    <div>
      <Header />
      <main className="container">
        <h2>Administration</h2>
        <div className="tabs">
          {[
            ['stats', 'Tableau de bord'],
            ['orders', 'Commandes'],
            ['menus', 'Menus et plats'],
            ['stock', 'Ingrédients et stock'],
            ['users', 'Utilisateurs'],
          ].map(([k, label]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
              {label}
            </button>
          ))}
        </div>
        <div className="shortcuts">
          <Link to="/caisse">Caisse</Link>
          <Link to="/cuisine">Cuisine</Link>
          <Link to="/courses">Courses et budget coursier</Link>
          <Link to="/partenaire">Stock partenaire</Link>
          <Link to="/menu">Voir l'app client</Link>
        </div>
        {tab === 'stats' && <Stats />}
        {tab === 'orders' && <TodayOrders />}
        {tab === 'menus' && <Menus />}
        {tab === 'stock' && <Stock />}
        {tab === 'users' && <Users />}
      </main>
    </div>
  )
}

const iso = (d) => d.toLocaleDateString('sv-SE')
const PERIODS = [['day', 'Jour'], ['week', 'Semaine'], ['month', 'Mois'], ['year', 'Année']]
const METHOD = { solde: 'Solde', wave: 'Wave', orange_money: 'Orange Money', carte: 'Carte' }

function rangeOf(p) {
  const now = new Date()
  const end = iso(now)
  if (p === 'day') return { start: end, end }
  if (p === 'week') {
    const d = new Date(now)
    d.setDate(d.getDate() - 6)
    return { start: iso(d), end }
  }
  if (p === 'month') return { start: end.slice(0, 8) + '01', end }
  return { start: end.slice(0, 5) + '01-01', end }
}

async function fetchOrders(start, end) {
  const { data } = await supabase
    .from('orders')
    .select('pickup_day, total, status, payment_method, created_at, order_items(label, qty, unit_price)')
    .gte('pickup_day', start)
    .lte('pickup_day', end)
    .neq('status', 'annulee')
  return data || []
}
const topOf = (orders) => {
  const m = {}
  for (const o of orders)
    for (const i of o.order_items || []) {
      m[i.label] ||= { qty: 0, ca: 0 }
      m[i.label].qty += i.qty
      m[i.label].ca += i.qty * i.unit_price
    }
  return Object.entries(m).sort((x, y) => y[1].qty - x[1].qty)
}

function Stats() {
  const [period, setPeriod] = useState('week')
  const [orders, setOrders] = useState([])
  const [monthOrders, setMonthOrders] = useState([])
  const [clients, setClients] = useState(0)

  useEffect(() => {
    const load = async () => {
      const r = rangeOf(period)
      setOrders(await fetchOrders(r.start, r.end))
      const mo = rangeOf('month')
      setMonthOrders(await fetchOrders(mo.start, mo.end))
      const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'client')
      setClients(count || 0)
    }
    load()
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [period])

  const revenue = orders.reduce((s, o) => s + o.total, 0)
  const basket = orders.length ? Math.round(revenue / orders.length) : 0
  const top = topOf(orders)
  const star = topOf(monthOrders)[0]

  // Barres : heures (jour), jours (semaine, mois), mois (année)
  const buckets = {}
  const key = (o) =>
    period === 'day' ? String(new Date(o.created_at).getHours()).padStart(2, '0') + 'h'
    : period === 'year' ? o.pickup_day.slice(0, 7)
    : o.pickup_day
  if (period === 'week')
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      buckets[iso(d)] = 0
    }
  for (const o of orders) buckets[key(o)] = (buckets[key(o)] || 0) + o.total
  const entries = Object.entries(buckets).sort((x, y) => x[0].localeCompare(y[0]))
  const maxCa = Math.max(1, ...entries.map(([, v]) => v))
  const label = (k) =>
    period === 'day' ? k
    : period === 'year' ? new Date(k + '-01T00:00:00').toLocaleDateString('fr-FR', { month: 'short' })
    : new Date(k + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: period === 'week' ? 'short' : undefined })

  const pay = {}
  for (const o of orders) pay[o.payment_method || 'solde'] = (pay[o.payment_method || 'solde'] || 0) + o.total
  const payEntries = Object.entries(pay).sort((x, y) => y[1] - x[1])
  const maxQty = Math.max(1, ...top.map(([, v]) => v.qty))

  return (
    <>
      <div className="tabs">
        {PERIODS.map(([k, l]) => (
          <button key={k} className={period === k ? 'on' : ''} onClick={() => setPeriod(k)}>{l}</button>
        ))}
      </div>

      <div className="supersale">
        <small>Super vente du mois</small>
        <strong>{star ? star[0] : 'Pas encore de vente ce mois-ci'}</strong>
        {star && <span>{star[1].qty} vendus · {fcfa(star[1].ca)}</span>}
      </div>

      <div className="kpis" style={{ marginTop: 12 }}>
        <div className="kpi"><small>Commandes</small><strong>{orders.length}</strong></div>
        <div className="kpi"><small>Chiffre d'affaires</small><strong>{fcfa(revenue)}</strong></div>
        <div className="kpi"><small>Panier moyen</small><strong>{fcfa(basket)}</strong></div>
        <div className="kpi"><small>Plat le plus vendu</small><strong style={{ fontSize: '1.05rem' }}>{top[0] ? `${top[0][0]} (${top[0][1].qty})` : '—'}</strong></div>
        <div className="kpi"><small>Clients inscrits</small><strong>{clients}</strong></div>
      </div>

      <h3 style={{ marginTop: 22 }}>Chiffre d'affaires</h3>
      {entries.length === 0 && <p className="muted">Aucune vente sur cette période.</p>}
      <div className="bars" style={{ gridTemplateColumns: `repeat(${Math.max(1, entries.length)}, 1fr)` }}>
        {entries.map(([k, v]) => (
          <div key={k} className="bar-col">
            <span className="bar-val">{entries.length <= 14 && v ? `${Math.round(v / 100) / 10}k` : ''}</span>
            <div className="bar" style={{ height: `${(v / maxCa) * 100}%` }} />
            <small>{entries.length > 16 ? '' : label(k)}</small>
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: 22 }}>Moyens de paiement</h3>
      {payEntries.map(([k, v]) => (
        <div key={k} className="hbar">
          <span>{METHOD[k] || k}</span>
          <div><i style={{ width: `${(v / (payEntries[0][1] || 1)) * 100}%` }} /></div>
          <b style={{ width: 'auto' }}>{fcfa(v)}</b>
        </div>
      ))}

      <h3 style={{ marginTop: 22 }}>Plats les plus vendus</h3>
      {top.length === 0 && <p className="muted">Rien sur cette période.</p>}
      {top.slice(0, 10).map(([lbl, v]) => (
        <div key={lbl} className="hbar">
          <span>{lbl}</span>
          <div><i style={{ width: `${(v.qty / maxQty) * 100}%` }} /></div>
          <b>{v.qty}</b>
        </div>
      ))}
    </>
  )
}

function TodayOrders() {
  const { orders, reload } = useOrders(today())
  async function cancel(id) {
    if (!window.confirm('Annuler cette commande ? Le client est remboursé et le stock remis.')) return
    const { error } = await supabase.rpc('cancel_order', { p_order: id })
    if (error) window.alert(error.message)
    reload()
  }
  if (orders.length === 0) return <p className="muted">Aucune commande aujourd'hui.</p>
  return (
    <div>
      {orders.map((o) => (
        <div key={o.id} className="order-row" style={{ alignItems: 'flex-start' }}>
          <div>
            <strong>#{o.number}</strong> · {o.profiles?.full_name || 'Client'}
            <div className="muted" style={{ fontSize: '0.85rem' }}>
              {(o.order_items || []).map((i) => `${i.qty} × ${i.label}`).join(', ')}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div>{fcfa(o.total)}</div>
            <span className="pill pill-mint">{STATUS[o.status]}</span>
            {o.status !== 'annulee' && o.status !== 'recuperee' && (
              <button className="btn-light" style={{ marginLeft: 6, padding: '0.25em 0.7em', fontSize: '0.8rem' }} onClick={() => cancel(o.id)}>
                Annuler
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export function Menus() {
  const [dishes, setDishes] = useState([])
  const [menuIds, setMenuIds] = useState(new Set())
  const [mday, setMday] = useState(today())
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', category: '', price: '', ready_to_go: false })
  const days = Array.from({ length: 7 }, (_, i) => dateStr(i))

  const loadDishes = useCallback(async () => {
    const { data } = await supabase.from('dishes').select('*').order('category').order('name')
    setDishes(data || [])
  }, [])
  const loadMenu = useCallback(async () => {
    const { data } = await supabase.from('menu_days').select('dish_id').eq('day', mday)
    setMenuIds(new Set((data || []).map((r) => r.dish_id)))
  }, [mday])
  useEffect(() => { loadDishes() }, [loadDishes])
  useEffect(() => { loadMenu() }, [loadMenu])

  async function toggleMenu(id, on) {
    if (on) await supabase.from('menu_days').insert({ day: mday, dish_id: id })
    else await supabase.from('menu_days').delete().eq('day', mday).eq('dish_id', id)
    loadMenu()
  }
  async function toggleAvailable(d) {
    await supabase.from('dishes').update({ available: !d.available }).eq('id', d.id)
    loadDishes()
  }
  async function approve(d, ok) {
    if (ok) await supabase.from('dishes').update({ approved: true }).eq('id', d.id)
    else await supabase.from('dishes').delete().eq('id', d.id)
    loadDishes()
  }
  async function setSale(d, pct) {
    await supabase.from('dishes').update({ discount_pct: pct }).eq('id', d.id)
    loadDishes()
  }
  async function saveEdit() {
    await supabase
      .from('dishes')
      .update({ name: editing.name, category: editing.category, price: Number(editing.price), ready_to_go: editing.ready_to_go })
      .eq('id', editing.id)
    setEditing(null)
    loadDishes()
  }
  async function createDish(e) {
    e.preventDefault()
    await supabase.from('dishes').insert({
      name: form.name,
      category: form.category || 'autre',
      price: Number(form.price),
      ready_to_go: form.ready_to_go,
    })
    setForm({ name: '', category: '', price: '', ready_to_go: false })
    loadDishes()
  }

  return (
    <>
      {dishes.some((d) => d.approved === false) && (
        <div className="card" style={{ marginBottom: 14, borderColor: 'var(--yellow)' }}>
          <h3 style={{ marginTop: 0 }}>Plats proposés, à valider</h3>
          {dishes.filter((d) => d.approved === false).map((d) => (
            <div key={d.id} className="order-row">
              <span>
                <strong>{d.name}</strong>
                <br />
                <small className="muted">{d.category} · {fcfa(d.price)} · {d.ready_to_go ? 'prêt' : 'sur place'}</small>
              </span>
              {isAdmin ? (
                <span style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => approve(d, true)}>Valider</button>
                  <button className="btn-light" onClick={() => approve(d, false)}>Refuser</button>
                </span>
              ) : (
                <span className="pill">En attente de l'admin</span>
              )}
            </div>
          ))}
        </div>
      )}
      <h3>1. Choisis le jour</h3>
      <div className="tabs">
        {days.map((d) => (
          <button key={d} className={d === mday ? 'on' : ''} onClick={() => setMday(d)}>
            {short(d)}
          </button>
        ))}
      </div>
      <h3>2. Coche les plats servis ce jour-là</h3>
      <div>
        {dishes.filter((d) => d.approved !== false).map((d) => (
          <div key={d.id} className="dish-row" style={{ alignItems: 'center', opacity: d.available ? 1 : 0.55 }}>
            {editing?.id === d.id ? (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                <select className="select" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>{catOptions(editing.category)}</select>
                <input type="number" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} style={{ width: 100 }} />
                <label><input type="checkbox" checked={editing.ready_to_go} onChange={(e) => setEditing({ ...editing, ready_to_go: e.target.checked })} /> prêt</label>
                <button onClick={saveEdit}>Enregistrer</button>
                <button className="btn-light" onClick={() => setEditing(null)}>Annuler</button>
              </div>
            ) : (
              <>
                <label style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1 }}>
                  <input type="checkbox" checked={menuIds.has(d.id)} onChange={(e) => toggleMenu(d.id, e.target.checked)} style={{ width: 20, height: 20 }} />
                  <FoodImg folder="dishes" name={d.name} category={d.category} size={36} />
                  <span>
                    <strong>{d.name}</strong>
                    <br />
                    <small className="muted">{d.category} · {fcfa(d.price)} · {d.ready_to_go ? 'prêt' : 'sur place'}{d.available ? '' : ' · épuisé'}{d.discount_pct > 0 ? ` · soldé -${d.discount_pct} %` : ''}</small>
                  </span>
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-light" onClick={() => setEditing({ ...d })}>Modifier</button>
                  <button className="btn-light" onClick={() => setSale(d, d.discount_pct > 0 ? 0 : 30)}>{d.discount_pct > 0 ? 'Fin du solde' : 'Solder -30 %'}</button>
                  <button className="btn-light" onClick={() => toggleAvailable(d)}>{d.available ? 'Épuisé' : 'Remettre'}</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: 24 }}>Nouveau plat</h3>
      <form onSubmit={createDish} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <select className="select" value={form.category || 'plat_ivoirien'} onChange={(e) => setForm({ ...form, category: e.target.value })}>{catOptions(form.category || 'plat_ivoirien')}</select>
        <input type="number" min="0" placeholder="Prix FCFA" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
        <label><input type="checkbox" checked={form.ready_to_go} onChange={(e) => setForm({ ...form, ready_to_go: e.target.checked })} /> Prêt à emporter</label>
        <button type="submit">Ajouter</button>
      </form>
    </>
  )
}

const CATS = [
  ['base', 'Base'],
  ['proteine', 'Protéine'],
  ['accompagnement', 'Accompagnement'],
  ['legume', 'Légume'],
  ['sauce', 'Sauce'],
]

export function Stock() {
  const [list, setList] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', category: 'base', unit_price: '', unit_label: 'portion', stock_qty: '', alert_threshold: '' })
  const [msg, setMsg] = useState(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('ingredients').select('*').order('category').order('name')
    setList(data || [])
  }, [])
  useEffect(() => { load() }, [load])

  const run = async (p) => {
    setMsg(null)
    const { error } = await p
    if (error) setMsg(error.message)
    load()
  }
  const save = async () => {
    await run(
      supabase.from('ingredients').update({
        name: editing.name,
        category: editing.category,
        unit_price: Number(editing.unit_price),
        unit_label: editing.unit_label,
        stock_qty: Number(editing.stock_qty),
        alert_threshold: Number(editing.alert_threshold),
      }).eq('id', editing.id)
    )
    setEditing(null)
  }
  const create = (e) => {
    e.preventDefault()
    run(supabase.from('ingredients').insert({
      name: form.name,
      category: form.category,
      unit_price: Number(form.unit_price),
      unit_label: form.unit_label,
      stock_qty: Number(form.stock_qty),
      alert_threshold: Number(form.alert_threshold) || 0,
      available: true,
    }))
    setForm({ ...form, name: '', unit_price: '', stock_qty: '', alert_threshold: '' })
  }

  const low = list.filter((i) => i.stock_qty <= i.alert_threshold)
  return (
    <>
      {low.length > 0 && (
        <div className="card" style={{ marginBottom: 12, borderColor: 'var(--coral)' }}>
          <strong>{low.length} ingrédient{low.length > 1 ? 's' : ''} sous le seuil :</strong> {low.map((i) => i.name).join(', ')}.{' '}
          <Link to="/courses">Préparer la liste de courses</Link>
        </div>
      )}
      {msg && <p className="error">{msg}</p>}
      <div>
        {list.map((i) => (
          <div key={i.id} className="dish-row" style={{ alignItems: 'center', opacity: i.available ? 1 : 0.55 }}>
            {editing?.id === i.id ? (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} style={{ width: 150 }} />
                <select className="select" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                  {CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                <input type="number" value={editing.unit_price} onChange={(e) => setEditing({ ...editing, unit_price: e.target.value })} style={{ width: 90 }} title="Prix" />
                <input value={editing.unit_label} onChange={(e) => setEditing({ ...editing, unit_label: e.target.value })} style={{ width: 90 }} title="Unité" />
                <input type="number" value={editing.stock_qty} onChange={(e) => setEditing({ ...editing, stock_qty: e.target.value })} style={{ width: 80 }} title="Stock" />
                <input type="number" value={editing.alert_threshold} onChange={(e) => setEditing({ ...editing, alert_threshold: e.target.value })} style={{ width: 80 }} title="Seuil d'alerte" />
                <button onClick={save}>Enregistrer</button>
                <button className="btn-light" onClick={() => setEditing(null)}>Annuler</button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1 }}>
                  <FoodImg folder="ingredients" name={i.name} category={i.category} size={40} />
                  <span>
                    <strong>{i.name}</strong>
                    <br />
                    <small className="muted">
                      {i.category} · {fcfa(i.unit_price)} / {i.unit_label} · alerte à {i.alert_threshold}
                    </small>
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span className={`pill ${i.stock_qty <= i.alert_threshold ? 'sale' : 'pill-mint'}`}>Stock : {Number(i.stock_qty)}</span>
                  <button className="btn-light" onClick={() => run(supabase.from('ingredients').update({ stock_qty: Number(i.stock_qty) + 10 }).eq('id', i.id))}>+10</button>
                  <button className="btn-light" onClick={() => setEditing({ ...i })}>Modifier</button>
                  <button className="btn-light" onClick={() => run(supabase.from('ingredients').update({ available: !i.available }).eq('id', i.id))}>
                    {i.available ? 'Masquer' : 'Afficher'}
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: 24 }}>Nouvel ingrédient</h3>
      <form onSubmit={create} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <select className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <input type="number" min="0" placeholder="Prix FCFA" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} required style={{ width: 110 }} />
        <input placeholder="Unité" value={form.unit_label} onChange={(e) => setForm({ ...form, unit_label: e.target.value })} style={{ width: 100 }} />
        <input type="number" min="0" placeholder="Stock" value={form.stock_qty} onChange={(e) => setForm({ ...form, stock_qty: e.target.value })} required style={{ width: 90 }} />
        <input type="number" min="0" placeholder="Seuil" value={form.alert_threshold} onChange={(e) => setForm({ ...form, alert_threshold: e.target.value })} style={{ width: 90 }} />
        <button type="submit">Ajouter</button>
      </form>
    </>
  )
}

const ROLES = [
  ['client', 'Client'],
  ['caisse', 'Caisse'],
  ['cuisine', 'Cuisine'],
  ['approvisionnement', 'Coursier'],
  ['partenaire', 'Partenaire'],
  ['admin', 'Admin'],
]

function Users() {
  const [users, setUsers] = useState([])
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState(null)
  const load = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('id, full_name, role, balance, permissions').order('full_name')
    setUsers(data || [])
  }, [])
  useEffect(() => { load() }, [load])

  async function setRole(u, role) {
    setMsg(null)
    const { error } = await supabase.rpc('set_role', { p_user: u.id, p_role: role })
    if (error) setMsg(error.message)
    load()
  }
  async function togglePerm(u, perm) {
    setMsg(null)
    const cur = u.permissions || []
    const next = cur.includes(perm) ? cur.filter((p) => p !== perm) : [...cur, perm]
    const { error } = await supabase.rpc('set_permissions', { p_user: u.id, p_perms: next })
    if (error) setMsg(error.message)
    load()
  }
  async function credit(u, amount) {
    setMsg(null)
    const { error } = await supabase.rpc('admin_credit', { p_user: u.id, p_amount: amount })
    if (error) setMsg(error.message)
    load()
  }

  const list = users.filter((u) => !q || (u.full_name || '').toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <p className="muted" style={{ marginTop: 0 }}>
        Pour créer un compte caisse, cuisine ou coursier : la personne s'inscrit sur l'app, puis tu changes son rôle ici.
      </p>
      <input placeholder="Chercher un nom" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: '100%', maxWidth: 320, marginBottom: 10 }} />
      {msg && <p className="error">{msg}</p>}
      {list.map((u) => (
        <div key={u.id} className="order-row" style={{ flexWrap: 'wrap' }}>
          <div>
            <strong>{u.full_name || 'Sans nom'}</strong>
            <div className="muted" style={{ fontSize: '0.85rem' }}>Solde : {fcfa(u.balance)}</div>
            {['caisse', 'cuisine', 'approvisionnement'].includes(u.role) && (
              <div className="perms">
                <label><input type="checkbox" checked={(u.permissions || []).includes('menus')} onChange={() => togglePerm(u, 'menus')} /> Peut modifier les menus et plats</label>
                <label><input type="checkbox" checked={(u.permissions || []).includes('stock')} onChange={() => togglePerm(u, 'stock')} /> Peut gérer le stock</label>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button className="btn-light" onClick={() => credit(u, 1000)}>+1 000</button>
            <select className="select" value={u.role} onChange={(e) => setRole(u, e.target.value)}>
              {ROLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
        </div>
      ))}
    </>
  )
}
