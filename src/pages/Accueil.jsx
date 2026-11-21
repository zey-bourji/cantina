import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import FoodImg, { hasDishImage, dishImage } from '../components/FoodImg'
import { getGuestCart, setGuestCart } from '../lib/guestCart'
import { isClosed, closesLabel } from '../lib/services'

const fcfa = (n) => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`
const eff = (d) => Math.round((d.price * (100 - (d.discount_pct || 0))) / 100)

const HERO_PHOTO = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'

const DISH_PHOTOS = [
  { keys: ['brownie'], url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80' },
  { keys: ['cookie'], url: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=600&q=80' },
  { keys: ['poulet', 'chicken', 'braise'], url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=600&q=80' },
  { keys: ['poisson', 'thon', 'garba', 'attieke'], url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80' },
  { keys: ['riz', 'thieb', 'tchep', 'bowl'], url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80' },
  { keys: ['alloco', 'frite', 'plantain'], url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80' },
  { keys: ['burger', 'cheeseburger'], url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80' },
  { keys: ['sandwich', 'panini', 'wrap', 'tacos', 'club'], url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80' },
  { keys: ['spaghetti', 'pate', 'bolognaise', 'pasta'], url: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=600&q=80' },
  { keys: ['salade', 'cesar', 'avocat'], url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80' },
  { keys: ['pizza'], url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80' },
  { keys: ['croissant', 'pain', 'viennoiserie', 'brioche'], url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80' },
  { keys: ['gateau', 'cake', 'fondant', 'tiramisu', 'crepe', 'dessert'], url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80' },
  { keys: ['jus', 'bissap', 'gingembre', 'boisson', 'smoothie', 'cafe', 'the'], url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80' },
]

function photoFor(dish) {
  if (dish?.image_url) return dish.image_url
  const raw = `${dish?.name || ''} ${dish?.category || ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  const match = DISH_PHOTOS.find((entry) => entry.keys.some((k) => raw.includes(k)))
  return match ? match.url : HERO_PHOTO
}

function DishPhoto({ dish }) {
  const [failed, setFailed] = useState(false)
  const local = hasDishImage(dish?.name || '')
  if (!failed && local) {
    // vraie photo détourée de la cantine en priorité
    return <img className="is-cutout" src={`/img/dishes/${dishImage(dish.name)}.png`} alt={dish.name} loading="lazy" decoding="async" onError={() => setFailed(true)} />
  }
  if (failed) {
    return <FoodImg folder="dishes" name={dish.name} category={dish.category} size={116} />
  }
  return (
    <img
      src={photoFor(dish)}
      alt={dish.name}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

export default function Accueil() {
  const [home, setHome] = useState({ today: [], best: [] })
  const [loaded, setLoaded] = useState(false)
  const [cart, setCart] = useState(() => getGuestCart()?.items || {})
  const [day, setDay] = useState(null)

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

  const isLocked = (d) => isClosed(d, day) || d.available === false || (d.left != null && d.left <= 0)
  const lockLabel = (d) => {
    if (isClosed(d, day)) return `Fermé depuis ${closesLabel(d)}`
    if (d.available === false || (d.left != null && d.left <= 0)) return 'Épuisé'
    return null
  }

  const lines = Object.values(cart)
  const count = lines.reduce((s, l) => s + l.qty, 0)
  const total = lines.reduce((s, l) => s + eff(l) * l.qty, 0)
  const Qty = ({ d }) => (
    <span className="lp-qty">
      {cart[d.id] ? (
        <>
          <button onClick={() => change(d, -1)} aria-label="Retirer">−</button>
          <b>{cart[d.id].qty}</b>
        </>
      ) : null}
      <button onClick={() => change(d, 1)} aria-label="Ajouter" disabled={isLocked(d)}>+</button>
    </span>
  )

  const today = home.today
  // plats retirés de la carte : on ne les met plus en avant
  const best = home.best.filter((d) => d.available !== false && !/foutou/i.test(d.name || ''))
  const starDish = best[0] || today[0]

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
            <span key={k}>Commande depuis ton téléphone, récupère sans faire la queue • Compose ton plat comme tu l&apos;aimes • Paie avec ton solde, Wave ou Orange Money • Paniers anti-gaspi à prix réduit en fin de journée • </span>
          ))}
        </div>
      </div>

      <section className="lp-hero">
        <div className="lp-hero-inner">
          <div className="lp-hero-copy">
            <span className="lp-tag">Vatel Abidjan</span>
            <h1>La cantine,<br />sans la file d’attente.</h1>
            <p>Commande en avance et récupère ton plat chaud au comptoir.</p>
            <div className="lp-cta">
              <Link to="/login?mode=signup" className="lp-big">Commander maintenant</Link>
            </div>
          </div>
          <div className="lp-hero-media">
            <DishPhoto dish={starDish || { name: '' }} />
          </div>
        </div>
      </section>

      <main className="lp-main">
        <section className="lp-section">
          <div className="lp-head">
            <h2>Au menu</h2>
            {today.length > 0 && (
              <span className="lp-sub">{today.length} plat{today.length > 1 ? 's' : ''}</span>
            )}
          </div>
          {loaded && today.length === 0 && <p className="muted">Le menu du jour arrive bientôt.</p>}
          <div className="lp-grid">
            {today.map((d) => {
              const locked = isLocked(d)
              const reason = lockLabel(d)
              return (
                <div key={d.id} className={`lp-card ${locked ? 'is-closed' : ''}`}>
                  <span className="lp-pic">
                    <DishPhoto dish={d} />
                    {locked && (
                      <span className="lp-closed-mask">
                        <span className="lp-closed-badge">{reason}</span>
                      </span>
                    )}
                  </span>
                  <strong>{d.name}</strong>
                  <span className="lp-price">
                    {d.discount_pct > 0 && <s className="muted">{fcfa(d.price)}</s>}
                    <span>{fcfa(eff(d))}</span>
                  </span>
                  <Qty d={d} />
                </div>
              )
            })}
          </div>
        </section>

        <section className="lp-bsm">
          <DishPhoto dish={starDish || { name: '' }} />
          <div>
            <small>Best seller du mois</small>
            <strong>{best[0]?.name || 'Notre plat star'}</strong>
          </div>
        </section>

        {best.length > 0 && (
          <section className="lp-section">
            <div className="lp-head">
              <h2>Les plus commandés</h2>
              <span className="lp-sub">Favoris du campus</span>
            </div>
            <div className="lp-grid">
              {best.map((d, i) => {
                const locked = isLocked(d)
                const reason = lockLabel(d)
                return (
                  <div key={d.name} className={`lp-card ${locked ? 'is-closed' : ''}`}>
                    <span className="lp-rank">#{i + 1}</span>
                    <span className="lp-pic">
                      <DishPhoto dish={d} />
                      {locked && (
                        <span className="lp-closed-mask">
                          <span className="lp-closed-badge">{reason}</span>
                        </span>
                      )}
                    </span>
                    <strong>{d.name}</strong>
                    <span className="lp-price">
                      <span>{fcfa(d.price)}</span>
                      <small className="lp-sold">{d.qty} commandés</small>
                    </span>
                    {d.id && day && home.today.some((t) => t.id === d.id) && <Qty d={d} />}
                  </div>
                )
              })}
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
