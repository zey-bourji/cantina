import { useCallback, useEffect, useState } from 'react'
import Header from '../components/Header'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { fcfa } from '../hooks/useOrders'
import { Menus, Stock } from './Admin'

const CATS = [
  ['salade', 'Salade'],
  ['toast', 'Toast'],
  ['sandwich', 'Sandwich'],
  ['plat_ivoirien', 'Plat'],
  ['dessert', 'Dessert'],
  ['boisson', 'Boisson'],
  ['autre', 'Autre'],
]

export default function Gestion() {
  const { profile } = useAuth()
  const perms = profile?.permissions || []
  const canMenus = profile?.role === 'admin' || perms.includes('menus')
  const canStock = profile?.role === 'admin' || perms.includes('stock')
  const [tab, setTab] = useState('propose')

  return (
    <div>
      <Header />
      <main className="container">
        <h2>Gestion</h2>
        <p className="muted" style={{ marginTop: -6 }}>
          Tu peux proposer un plat. Pour modifier les menus ou le stock, l'admin doit t'en donner l'accès.
        </p>
        <div className="tabs">
          <button className={tab === 'propose' ? 'on' : ''} onClick={() => setTab('propose')}>Proposer un plat</button>
          {canMenus && <button className={tab === 'menus' ? 'on' : ''} onClick={() => setTab('menus')}>Menus et plats</button>}
          {canStock && <button className={tab === 'stock' ? 'on' : ''} onClick={() => setTab('stock')}>Stock</button>}
        </div>
        {tab === 'propose' && <Propose />}
        {tab === 'menus' && canMenus && <Menus />}
        {tab === 'stock' && canStock && <Stock />}
      </main>
    </div>
  )
}

function Propose() {
  const { profile } = useAuth()
  const [mine, setMine] = useState([])
  const [form, setForm] = useState({ name: '', category: 'plat_ivoirien', price: '', ready_to_go: false })
  const [msg, setMsg] = useState(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('dishes').select('*').eq('proposed_by', profile.id).order('created_at', { ascending: false })
    setMine(data || [])
  }, [profile.id])
  useEffect(() => {
    load()
  }, [load])

  async function submit(e) {
    e.preventDefault()
    setMsg(null)
    const { error } = await supabase.from('dishes').insert({
      name: form.name,
      category: form.category,
      price: Number(form.price),
      ready_to_go: form.ready_to_go,
      approved: false,
      proposed_by: profile.id,
    })
    if (error) setMsg(error.message)
    else setForm({ ...form, name: '', price: '' })
    load()
  }

  return (
    <>
      <form onSubmit={submit} className="card" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="Nom du plat" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required style={{ flex: '1 1 160px' }} />
        <select className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <input type="number" min="0" placeholder="Prix FCFA" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required style={{ width: 110 }} />
        <label><input type="checkbox" checked={form.ready_to_go} onChange={(e) => setForm({ ...form, ready_to_go: e.target.checked })} /> Plat prêt</label>
        <button type="submit">Envoyer à l'admin</button>
      </form>
      {msg && <p className="error">{msg}</p>}
      <div className="section-title"><h3 style={{ margin: 0 }}>Mes propositions</h3></div>
      {mine.length === 0 && <p className="muted">Aucune proposition pour l'instant.</p>}
      {mine.map((d) => (
        <div key={d.id} className="order-row">
          <span><strong>{d.name}</strong><br /><small className="muted">{fcfa(d.price)}</small></span>
          <span className={`pill ${d.approved ? 'pill-mint' : ''}`}>{d.approved ? 'Validé' : 'En attente'}</span>
        </div>
      ))}
    </>
  )
}
