import { useCallback, useEffect, useState } from 'react'
import Header from '../components/Header'
import { supabase } from '../lib/supabase'
import { fcfa, today } from '../hooks/useOrders'

const UNITS = ['kg', 'pièce', 'sachet', 'botte', 'litre']

export default function Partenaire() {
  const [offers, setOffers] = useState([])
  const [form, setForm] = useState({ product: '', unit_price: '', qty: '', unit: 'kg' })
  const [msg, setMsg] = useState(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('partner_offers').select('*').eq('day', today()).order('created_at', { ascending: false })
    setOffers(data || [])
  }, [])
  useEffect(() => {
    load()
  }, [load])

  async function add(e) {
    e.preventDefault()
    setMsg(null)
    const { error } = await supabase.from('partner_offers').insert({
      product: form.product,
      unit_price: Number(form.unit_price),
      qty: Number(form.qty),
      unit: form.unit,
    })
    if (error) setMsg(error.message)
    else setForm({ product: '', unit_price: '', qty: '', unit: form.unit })
    load()
  }
  const setQty = async (o, qty) => {
    await supabase.from('partner_offers').update({ qty: Math.max(0, qty) }).eq('id', o.id)
    load()
  }
  const remove = async (o) => {
    await supabase.from('partner_offers').delete().eq('id', o.id)
    load()
  }

  return (
    <div>
      <Header />
      <main className="container">
        <h2>Mon stock du jour</h2>
        <p className="muted" style={{ marginTop: -6 }}>
          Ce que tu peux livrer à la cantine aujourd'hui. Le coursier le voit en préparant ses achats.
        </p>

        <form onSubmit={add} className="card" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input placeholder="Produit (ex. tomates)" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} required style={{ flex: '1 1 160px' }} />
          <input type="number" min="0" placeholder="Prix FCFA" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} required style={{ width: 110 }} />
          <input type="number" min="0" step="0.1" placeholder="Quantité" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} required style={{ width: 110 }} />
          <select className="select" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
            {UNITS.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
          <button type="submit">Ajouter</button>
        </form>
        {msg && <p className="error">{msg}</p>}

        <div className="section-title"><h3 style={{ margin: 0 }}>Disponible aujourd'hui</h3></div>
        {offers.length === 0 && <p className="muted">Rien pour l'instant.</p>}
        <div>
          {offers.map((o) => (
            <div key={o.id} className="order-row" style={{ opacity: o.qty > 0 ? 1 : 0.5 }}>
              <div>
                <strong>{o.product}</strong>
                <div className="muted" style={{ fontSize: '0.85rem' }}>
                  {fcfa(o.unit_price)} / {o.unit}
                  {o.qty <= 0 ? ' · épuisé' : ''}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button className="btn-light" onClick={() => setQty(o, Number(o.qty) - 1)}>−</button>
                <strong style={{ minWidth: 44, textAlign: 'center' }}>{Number(o.qty)} {o.unit}</strong>
                <button className="btn-light" onClick={() => setQty(o, Number(o.qty) + 1)}>+</button>
                <button className="btn-light" onClick={() => remove(o)}>Retirer</button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
