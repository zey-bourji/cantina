import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import FoodImg from '../components/FoodImg'
import { getGuestCart, setGuestCart } from '../lib/guestCart'
import { isClosed, closesLabel } from '../lib/services'

const fcfa = (n) => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`
const eff = (d) => Math.round((d.price * (100 - (d.discount_pct || 0))) / 100)

export default function Accueil() {
  const [home, setHome] = useState({ today: [], best: [] })
  const [loaded, setLoaded] = useState(false)
  const [cart, setCart] = useState(() => getGuestCart()?.items || {})
  const [day, setDay] = useState(null)
  const [bsmFail, setBsmFail] = useState(false)

  useEffect(() => {
    supabase.rpc('public_home').then(({ data }) => {
      if (data) { setHome({ today: data.today || [], best: data.best || [] }); setDay(data.day || null) }
      setLoaded(true)
    })
  }, [])

  const change = (d, delta) =>
    setCart((c) => {
      const q = (c[d.id]?.qty || 0) + delta
      const next = { ...c }
      if (q <= 0) delete next[d.id]
      else {
        if (d.left != null && q > d.left) return c
        next[d.id] = { id: d.id, name: d.name, price: d.price, discount_pct: d.discount_pct || 0, qty: q }
      }
      setGuestCart({ day, items: next })
      return next
    })
  const lines = Object.values(cart)
  const count = lines.reduce((s, l) => s + l.qty, 0)
  const total = lines.reduce((s, l) => s + eff(l) * l.qty, 0)
  const Qty = ({ d }) => (
    <span className="lp-qty">
      {isClosed(d, day) ? <small className="muted">Fermé depuis {closesLabel(d)}</small> : null}
      {cart[d.id] ? (
        <>
          <button onClick={() => change(d, -1)} aria-label="Retirer">−</button>
          <b>{cart[d.id].qty}</b>
        </>
      ) : null}
      <button onClick={() => change(d, 1)} aria-label="Ajouter" disabled={isClosed(d, day)}>+</button>
    </span>
  )

  const today = home.today

  return (
    <div className="lp">
      <header className="lp-bar">
        <span className="logo">cantina<span>.</span></span>
        <nav>
          <Link to="/login" className="lp-link">Connexion</Link>
          <Link to="/login?mode=signup" className="lp-pill">Inscription</Link>
        </nav>
      </header>

      <div className="lp-ticker" aria-hidden="true">
        <div className="lp-ticker-in">
          {[0, 1].map((k) => (
            <span key={k}>Commande depuis ton téléphone, récupère sans faire la queue ✦ Compose ton plat comme tu l'aimes ✦ Paie avec ton solde, Wave ou Orange Money ✦ Des paniers anti-gaspi à prix réduit en fin de journée ✦ </span>
          ))}
        </div>
      </div>

      <section className="lp-hero">
        <div className="lp-hero-inner">
          <div className="lp-hero-copy">
            <span className="lp-tag">Vatel Abidjan</span>
            <h1>La cantine, sans la file d’attente.</h1>
            <p>Commande depuis ton téléphone, compose ton plat comme tu l’aimes, et récupère-le chaud.</p>
            <div className="lp-cta">
              <a href="#menu" className="lp-big">Voir le menu</a>
              <Link to="/login" className="lp-ghost">J’ai déjà un compte</Link>
            </div>
          </div>
          <div className="lp-hero-media">
            <FoodImg folder="dishes" name={home.today[0]?.name || 'Poulet sauce tomate'} category={home.today[0]?.category} size="fill" />
          </div>
        </div>
      </section>

      <main className="lp-main">
        <section className="lp-section" id="menu">
          <div className="lp-head"><h2>Au menu</h2><span className="lp-sub">{day ? new Date(day + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}</span></div>
          {loaded && today.length === 0 && <p className="muted">Le menu du jour arrive bientôt.</p>}
          <div className="lp-grid">
            {today.map((d) => (
              <div key={d.id} className="lp-card">
                <span className="lp-pic"><FoodImg folder="dishes" name={d.name} category={d.category} size={96} /></span>
                <strong>{d.name}</strong>
                <span className="lp-price">
                  {d.discount_pct > 0 && <s className="muted">{fcfa(d.price)}</s>} {fcfa(eff(d))}
                </span>
                <Qty d={d} />
              </div>
            ))}
          </div>
        </section>

        <section className="lp-bsm">
          {bsmFail ? (
            <FoodImg folder="dishes" name={home.best[0]?.name || ''} category={home.best[0]?.category} size={96} />
          ) : (
            <img src="/img/best-seller.png" alt="" onError={() => setBsmFail(true)} />
          )}
          <div>
            <small>Best seller du mois</small>
            <strong>{home.best[0]?.name || 'Notre plat star'}</strong>
          </div>
        </section>

        {home.best.length > 0 && (
          <section className="lp-section">
            <div className="lp-head"><h2>Les plus commandés</h2></div>
            <div className="lp-grid">
              {home.best.map((d, i) => (
                <div key={d.name} className="lp-card">
                  <span className="lp-rank">#{i + 1}</span>
                  <span className="lp-pic"><FoodImg folder="dishes" name={d.name} category={d.category} size={96} /></span>
                  <strong>{d.name}</strong>
                  <span className="lp-price">{fcfa(d.price)} · {d.qty} commandés</span>
                  {d.id && day && home.today.some((t) => t.id === d.id) && <Qty d={d} />}
                </div>
              ))}
            </div>
          </section>
        )}


      </main>
      {count > 0 && (
        <div className="cartbar">
          <span><strong>{count}</strong> plat{count > 1 ? 's' : ''} · <strong>{fcfa(total)}</strong></span>
          <Link to="/login?mode=signup" className="btn-coral btn-big lp-validate">Valider ma commande</Link>
        </div>
      )}
    </div>
  )
}
