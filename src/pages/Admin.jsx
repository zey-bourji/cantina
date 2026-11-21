import { useCallback, useEffect, useState } from 'react'
import Header from '../components/Header'
import { supabase } from '../lib/supabase'
import { useOrders, today, dateStr, tally, fcfa } from '../hooks/useOrders'

export default function Admin() {
  const { orders } = useOrders(today())
  const active = orders.filter((o) => o.status !== 'annulee')
  const revenue = active.reduce((s, o) => s + o.total, 0)
  const recap = tally(orders)

  const [dishes, setDishes] = useState([])
  const [menuIds, setMenuIds] = useState(new Set())
  const [mday, setMday] = useState(today())
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

  useEffect(() => {
    loadDishes()
  }, [loadDishes])
  useEffect(() => {
    loadMenu()
  }, [loadMenu])

  async function toggleMenu(id, on) {
    if (on) await supabase.from('menu_days').insert({ day: mday, dish_id: id })
    else await supabase.from('menu_days').delete().eq('day', mday).eq('dish_id', id)
    loadMenu()
  }

  async function toggleAvailable(d) {
    await supabase.from('dishes').update({ available: !d.available }).eq('id', d.id)
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

  const card = { border: '1px solid #e5e0d8', borderRadius: 12, padding: 12 }

  return (
    <div>
      <Header />
      <main style={{ padding: 20, maxWidth: 1000, margin: '0 auto' }}>
        <h2>Tableau de bord (aujourd'hui)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div style={card}>
            <div>Commandes</div>
            <strong style={{ fontSize: 28 }}>{active.length}</strong>
          </div>
          <div style={card}>
            <div>Chiffre d'affaires</div>
            <strong style={{ fontSize: 28 }}>{fcfa(revenue)}</strong>
          </div>
          <div style={card}>
            <div>Repas à préparer</div>
            <strong style={{ fontSize: 28 }}>{recap.reduce((s, [, q]) => s + q, 0)}</strong>
          </div>
        </div>

        <h3>Plats les plus commandés</h3>
        {recap.length === 0 && <p>Pas encore de commande.</p>}
        <ul>
          {recap.map(([label, qty]) => (
            <li key={label}>
              {qty} × {label}
            </li>
          ))}
        </ul>

        <h2>Menus</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {days.map((d) => (
            <button key={d} onClick={() => setMday(d)} style={{ fontWeight: d === mday ? 700 : 400 }}>
              {new Date(`${d}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {dishes.map((d) => (
            <div key={d.id} style={{ ...card, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <label>
                <input
                  type="checkbox"
                  checked={menuIds.has(d.id)}
                  onChange={(e) => toggleMenu(d.id, e.target.checked)}
                />{' '}
                <strong>{d.name}</strong>
              </label>
              <span>
                {d.category} · {fcfa(d.price)} · {d.ready_to_go ? 'prêt' : 'sur place'}
              </span>
              <button onClick={() => toggleAvailable(d)}>
                {d.available ? 'Marquer épuisé' : 'Remettre disponible'}
              </button>
            </div>
          ))}
        </div>

        <h3>Nouveau plat</h3>
        <form onSubmit={createDish} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input placeholder="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input placeholder="Catégorie" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <input type="number" min="0" placeholder="Prix FCFA" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          <label>
            <input type="checkbox" checked={form.ready_to_go} onChange={(e) => setForm({ ...form, ready_to_go: e.target.checked })} /> Prêt à emporter
          </label>
          <button type="submit">Ajouter</button>
        </form>
      </main>
    </div>
  )
}
