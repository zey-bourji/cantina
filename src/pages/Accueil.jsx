import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import FoodImg from '../components/FoodImg'

const fcfa = (n) => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`
const eff = (d) => Math.round((d.price * (100 - (d.discount_pct || 0))) / 100)

const STEPS = [
  { n: 1, t: 'Choisis', d: 'Un plat du jour, un plateau ou ton propre plat, ingrédient par ingrédient.' },
  { n: 2, t: 'Paie', d: 'Avec ton solde Cantina, Wave ou Orange Money. Pas de monnaie à chercher.' },
  { n: 3, t: 'Récupère', d: 'Dis « J’arrive dans 5 min » : ton plat est chaud quand tu arrives.' },
]

export default function Accueil() {
  const [home, setHome] = useState({ today: [], best: [] })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    supabase.rpc('public_home').then(({ data }) => {
      if (data) setHome({ today: data.today || [], best: data.best || [] })
      setLoaded(true)
    })
  }, [])

  const featured = home.today.filter((d) => d.featured)
  const today = featured.length > 0 ? featured : home.today.slice(0, 3)

  return (
    <div className="lp">
      <header className="lp-bar">
        <span className="logo">cantina<span>.</span></span>
        <nav>
          <Link to="/login" className="lp-link">Connexion</Link>
          <Link to="/login?mode=signup" className="lp-pill">Inscription</Link>
        </nav>
      </header>

      <section className="lp-hero">
        <span className="lp-tag">Vatel Abidjan</span>
        <h1>La cantine,<br />sans la file d’attente.</h1>
        <p>Commande depuis ton téléphone, compose ton plat comme tu l’aimes, et récupère-le chaud.</p>
        <div className="lp-cta">
          <Link to="/login?mode=signup" className="lp-big">Commander maintenant</Link>
          <Link to="/login" className="lp-ghost">J’ai déjà un compte</Link>
        </div>
      </section>

      <main className="lp-main">
        <section>
          <div className="lp-head"><h2>⭐ Menu du jour</h2></div>
          {loaded && today.length === 0 && <p className="muted">Le menu du jour arrive bientôt.</p>}
          <div className="lp-grid">
            {today.map((d) => (
              <Link to="/login?mode=signup" key={d.id} className="lp-card">
                <span className="lp-pic"><FoodImg folder="dishes" name={d.name} category={d.category} size={96} /></span>
                <strong>{d.name}</strong>
                <span className="lp-price">
                  {d.discount_pct > 0 && <s className="muted">{fcfa(d.price)}</s>} {fcfa(eff(d))}
                </span>
                <span className="lp-order">Commander →</span>
              </Link>
            ))}
          </div>
        </section>

        {home.best.length > 0 && (
          <section>
            <div className="lp-head"><h2>🔥 Les plus commandés</h2></div>
            <div className="lp-grid">
              {home.best.map((d, i) => (
                <Link to="/login?mode=signup" key={d.name} className="lp-card">
                  <span className="lp-rank">#{i + 1}</span>
                  <span className="lp-pic"><FoodImg folder="dishes" name={d.name} category={d.category} size={96} /></span>
                  <strong>{d.name}</strong>
                  <span className="lp-price">{fcfa(d.price)} · {d.qty} commandés</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="lp-head"><h2>Comment ça marche</h2></div>
          <div className="lp-steps">
            {STEPS.map((s) => (
              <div key={s.n} className="lp-step">
                <span className="lp-n">{s.n}</span>
                <strong>{s.t}</strong>
                <p>{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="lp-final">
          <h2>Prêt à commander ?</h2>
          <p>Crée ton compte en 20 secondes : un code arrive par email, pas de mot de passe à retenir.</p>
          <Link to="/login?mode=signup" className="lp-big">Créer mon compte</Link>
        </section>
      </main>
    </div>
  )
}
