import { useCallback, useEffect, useState } from 'react'
import Header from '../components/Header'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { fcfa, today } from '../hooks/useOrders'

export default function Courses() {
  const { profile } = useAuth()
  const role = profile?.role
  const canRequest = ['admin', 'caisse', 'cuisine'].includes(role)
  const canBudget = ['admin', 'caisse'].includes(role)
  const canBuy = ['admin', 'approvisionnement'].includes(role)

  const [ingredients, setIngredients] = useState([])
  const [items, setItems] = useState([])
  const [budget, setBudget] = useState(0)
  const [budgetInput, setBudgetInput] = useState('')
  const [pick, setPick] = useState({ id: '', qty: 1 })
  const [costs, setCosts] = useState({})
  const [msg, setMsg] = useState(null)
  const [offers, setOffers] = useState([])

  const load = useCallback(async () => {
    const off = await supabase.from('partner_offers').select('*, profiles(full_name)').eq('day', today()).gt('qty', 0).order('product')
    setOffers(off.data || [])
    const [ing, it, bud] = await Promise.all([
      supabase.from('ingredients').select('*').order('name'),
      supabase.from('shopping_items').select('*, ingredients(name, unit_label)').order('created_at', { ascending: false }),
      supabase.from('courier_budgets').select('amount').eq('day', today()).maybeSingle(),
    ])
    setIngredients(ing.data || [])
    setItems(it.data || [])
    setBudget(bud.data?.amount || 0)
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 6000)
    return () => clearInterval(t)
  }, [load])

  const open = items.filter((i) => i.status !== 'recu' || i.created_at?.slice(0, 10) === today())
  const inList = new Set(items.filter((i) => i.status === 'a_acheter').map((i) => i.ingredient_id))
  const low = ingredients.filter((i) => i.stock_qty <= i.alert_threshold && !inList.has(i.id))
  const spent = items
    .filter((i) => ['achete', 'recu'].includes(i.status) && i.created_at?.slice(0, 10) === today())
    .reduce((s, i) => s + (i.cost || 0), 0)
  const left = budget - spent

  async function run(p) {
    setMsg(null)
    const { error } = await p
    if (error) setMsg(error.message)
    load()
  }

  const addItem = (ingredient_id, qty) => run(supabase.from('shopping_items').insert({ ingredient_id, qty }))
  const addAllLow = () =>
    run(
      supabase
        .from('shopping_items')
        .insert(low.map((i) => ({ ingredient_id: i.id, qty: Math.max(1, i.alert_threshold * 2 - i.stock_qty) })))
    )
  const saveBudget = () =>
    run(supabase.from('courier_budgets').upsert({ day: today(), amount: Number(budgetInput) || 0 }))
  const markBought = (it) => {
    const cost = Number(costs[it.id])
    if (!cost && cost !== 0) return setMsg('Écris le prix payé avant de valider.')
    return run(supabase.from('shopping_items').update({ status: 'achete', cost }).eq('id', it.id))
  }
  const receive = (it) => run(supabase.rpc('receive_item', { p_item: it.id }))
  const remove = (it) => run(supabase.from('shopping_items').delete().eq('id', it.id))

  const STATE = { a_acheter: 'À acheter', achete: 'Acheté, à réceptionner', recu: 'Reçu' }

  return (
    <div>
      <Header />
      <main className="container">
        <h2>Liste de courses</h2>

        <div className="kpis">
          <div className="kpi"><small>Budget du coursier (aujourd'hui)</small><strong>{fcfa(budget)}</strong></div>
          <div className="kpi"><small>Dépensé</small><strong>{fcfa(spent)}</strong></div>
          <div className="kpi"><small>Reste</small><strong style={{ color: left < 0 ? 'var(--coral)' : undefined }}>{fcfa(left)}</strong></div>
        </div>
        {canBudget && (
          <div style={{ display: 'flex', gap: 8, margin: '10px 0 0', flexWrap: 'wrap' }}>
            <input type="number" min="0" placeholder="Donner un budget au coursier" value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)} />
            <button onClick={saveBudget}>Valider le budget</button>
          </div>
        )}
        {msg && <p className="error">{msg}</p>}

        {canRequest && (
          <>
            <div className="section-title"><h3 style={{ margin: 0 }}>Ce qui manque</h3></div>
            {low.length > 0 && (
              <div className="card" style={{ marginBottom: 10 }}>
                <p style={{ marginTop: 0 }}>
                  <strong>{low.length}</strong> ingrédient{low.length > 1 ? 's' : ''} sous le seuil : {low.map((i) => i.name).join(', ')}.
                </p>
                <button onClick={addAllLow}>Tout ajouter à la liste</button>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select value={pick.id} onChange={(e) => setPick({ ...pick, id: e.target.value })} className="select">
                <option value="">Choisir un ingrédient</option>
                {ingredients.map((i) => (
                  <option key={i.id} value={i.id}>{i.name} (reste {i.stock_qty})</option>
                ))}
              </select>
              <input type="number" min="1" value={pick.qty} onChange={(e) => setPick({ ...pick, qty: e.target.value })} style={{ width: 90 }} />
              <button disabled={!pick.id} onClick={() => { addItem(Number(pick.id), Number(pick.qty) || 1); setPick({ id: '', qty: 1 }) }}>
                Ajouter
              </button>
            </div>
          </>
        )}

        {offers.length > 0 && (
          <>
            <div className="section-title"><h3 style={{ margin: 0 }}>Chez nos partenaires aujourd'hui</h3></div>
            <div className="recap">
              {offers.map((o) => (
                <div key={o.id} className="recap-item" style={{ display: 'grid', gap: 2 }}>
                  <strong>{o.product}</strong>
                  <small className="muted">
                    {fcfa(o.unit_price)} / {o.unit} · {Number(o.qty)} {o.unit} dispo
                    {o.profiles?.full_name ? ` · ${o.profiles.full_name}` : ''}
                  </small>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="section-title"><h3 style={{ margin: 0 }}>À acheter</h3></div>
        {open.length === 0 && <p className="muted">La liste est vide.</p>}
        <div>
          {open.map((it) => (
            <div key={it.id} className="order-row" style={{ flexWrap: 'wrap' }}>
              <div>
                <strong>{it.qty} × {it.ingredients?.name}</strong>
                <div className="muted" style={{ fontSize: '0.85rem' }}>
                  {STATE[it.status]}{it.cost != null ? ` · ${fcfa(it.cost)}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {it.status === 'a_acheter' && canBuy && (
                  <>
                    <input type="number" min="0" placeholder="Prix payé" value={costs[it.id] ?? ''} onChange={(e) => setCosts({ ...costs, [it.id]: e.target.value })} style={{ width: 110 }} />
                    <button onClick={() => markBought(it)}>Acheté</button>
                  </>
                )}
                {it.status === 'achete' && ['admin', 'caisse', 'cuisine'].includes(role) && (
                  <button className="btn-mint" onClick={() => receive(it)}>Réceptionné</button>
                )}
                {it.status === 'a_acheter' && canRequest && (
                  <button className="btn-light" onClick={() => remove(it)}>Retirer</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
