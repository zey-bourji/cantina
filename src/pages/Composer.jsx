import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Ticket from '../components/Ticket'
import FoodImg, { slug } from '../components/FoodImg'
import TabBar from '../components/TabBar'
import Checkout from '../components/Checkout'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { fetchTicket } from '../lib/ticket'
import { fcfa, today } from '../hooks/useOrders'

const CATEGORIES = [
  ['base', 'Les bases'],
  ['proteine', 'Les protéines'],
  ['accompagnement', 'Les accompagnements'],
  ['legume', 'Les légumes'],
  ['sauce', 'Les sauces'],
]
const PRESETS = [1000, 1500, 2000, 3000]

const ORDER = ['base', 'proteine', 'accompagnement', 'legume', 'sauce']

// Poids d'une portion "parfaite" (en grammes), par ingrédient puis par catégorie
const GRAMS_BY_CAT = { base: 150, proteine: 120, accompagnement: 100, legume: 80, sauce: 25 }
const GRAMS = {
  riz: 150,
  'riz-jaune': 150,
  attieke: 150,
  'spaghetti-tomate': 150,
  'spaghetti-bolognaise': 150,
  'pain-plat': 60,
  'poulet-braise': 150,
  'poisson-braise': 150,
  'steak-grille': 150,
  oeuf: 60,
  jambon: 40,
  thon: 80,
  frites: 100,
  'mais-grille': 150,
  alloco: 100,
  avocat: 80,
  tomate: 60,
  oignon: 30,
  piment: 5,
  mayonnaise: 25,
  ketchup: 20,
}
const gramsOf = (ing) => GRAMS[slug(ing.name)] || GRAMS_BY_CAT[ing.category] || 100

// Compteur animé fluide pour le prix en FCFA et le grammage
function useAnimatedNumber(target, duration = 360) {
  const [value, setValue] = useState(target)
  const currentRef = useRef(target)

  useEffect(() => {
    const start = currentRef.current
    const diff = target - start
    if (diff === 0) return

    let frameId
    const startTime = performance.now()

    const tick = (now) => {
      const elapsed = Math.min(1, (now - startTime) / duration)
      const eased = 1 - Math.pow(1 - elapsed, 3)
      const next = start + diff * eased
      currentRef.current = next
      setValue(next)
      if (elapsed < 1) {
        frameId = requestAnimationFrame(tick)
      } else {
        currentRef.current = target
        setValue(target)
      }
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [target, duration])

  return Math.round(value)
}

// Dressage culinaire réaliste : empilement par couches (base -> protéine -> accompagnement -> légume)
// avec chevauchement naturel et légères rotations organiques.
function plateLayout(foods) {
  const byCat = { base: [], proteine: [], accompagnement: [], legume: [] }
  foods.forEach((item) => {
    const cat = byCat[item.ing.category] ? item.ing.category : 'accompagnement'
    byCat[cat].push(item)
  })

  const placements = []

  // 1. Les bases (lit généreux au centre-bas de l'assiette)
  const bases = byCat.base
  bases.forEach((item, idx) => {
    const n = bases.length
    let spot
    if (n === 1) {
      spot = { x: 48, y: 52, size: 54, rot: -4 }
    } else if (n === 2) {
      spot = idx === 0 ? { x: 38, y: 51, size: 45, rot: -8 } : { x: 60, y: 52, size: 45, rot: 7 }
    } else {
      const angle = (-110 + (360 / n) * idx) * (Math.PI / 180)
      spot = { x: 50 + 14 * Math.cos(angle), y: 52 + 13 * Math.sin(angle), size: 41, rot: idx * 11 - 10 }
    }
    placements.push({ item, ...spot, z: 10 + idx })
  })

  // 2. Les protéines (posées sur et légèrement en chevauchement de la base)
  const prots = byCat.proteine
  prots.forEach((item, idx) => {
    const n = prots.length
    let spot
    if (n === 1) {
      spot = { x: 53, y: 45, size: 44, rot: 6 }
    } else if (n === 2) {
      spot = idx === 0 ? { x: 41, y: 43, size: 39, rot: -9 } : { x: 61, y: 47, size: 39, rot: 8 }
    } else {
      const angle = (-135 + (270 / Math.max(1, n - 1)) * idx) * (Math.PI / 180)
      spot = { x: 50 + 16 * Math.cos(angle), y: 46 + 13 * Math.sin(angle), size: 35, rot: idx * 12 - 12 }
    }
    placements.push({ item, ...spot, z: 22 + idx })
  })

  // 3. Les accompagnements (nichés sur les courbes inférieures)
  const sides = byCat.accompagnement
  sides.forEach((item, idx) => {
    const n = sides.length
    let spot
    if (n === 1) {
      spot = { x: 35, y: 61, size: 37, rot: -12 }
    } else if (n === 2) {
      spot = idx === 0 ? { x: 34, y: 60, size: 34, rot: -14 } : { x: 65, y: 61, size: 34, rot: 11 }
    } else {
      const angle = (155 - (130 / Math.max(1, n - 1)) * idx) * (Math.PI / 180)
      spot = { x: 50 + 21 * Math.cos(angle), y: 54 + 17 * Math.sin(angle), size: 31, rot: idx * 14 - 14 }
    }
    placements.push({ item, ...spot, z: 34 + idx })
  })

  // 4. Les légumes (touche fraîche en finition sur le dessus)
  const vegs = byCat.legume
  vegs.forEach((item, idx) => {
    const n = vegs.length
    let spot
    if (n === 1) {
      spot = { x: 64, y: 37, size: 30, rot: 13 }
    } else if (n === 2) {
      spot = idx === 0 ? { x: 64, y: 36, size: 28, rot: 12 } : { x: 36, y: 38, size: 28, rot: -15 }
    } else if (n === 3) {
      const preset = [
        { x: 64, y: 36, size: 27, rot: 12 },
        { x: 36, y: 38, size: 27, rot: -15 },
        { x: 51, y: 66, size: 26, rot: 5 },
      ]
      spot = preset[idx]
    } else {
      const angle = (-45 + (360 / n) * idx) * (Math.PI / 180)
      spot = { x: 50 + 21 * Math.cos(angle), y: 50 + 20 * Math.sin(angle), size: 25, rot: idx * 18 - 20 }
    }
    placements.push({ item, ...spot, z: 46 + idx })
  })

  return placements
}

// Décalages naturels lorsqu'un même ingrédient est ajouté plusieurs fois (×2, ×3)
const STACK_OFFSETS = [
  { dx: 0, dy: 0, dRot: 0, scale: 1 },
  { dx: 5.5, dy: -4.2, dRot: 14, scale: 0.92 },
  { dx: -5.0, dy: 3.8, dRot: -12, scale: 0.9 },
]

const SAUCE_PALETTES = {
  mayonnaise: { fill: '#FFF7DF', edge: '#E6D6A8', shine: '#FFFFFF' },
  ketchup: { fill: '#D9261C', edge: '#96130C', shine: '#FF857D' },
  moutarde: { fill: '#E3A722', edge: '#B37E0D', shine: '#FFE08A' },
  piment: { fill: '#C92A1D', edge: '#7D140C', shine: '#F26B5E' },
  barbecue: { fill: '#6E2618', edge: '#42140B', shine: '#A84A38' },
  andalouse: { fill: '#E87A3E', edge: '#B5531E', shine: '#FFB48A' },
}

// Filet de sauce en zigzag : la bouteille arrive, glisse en S-curve en versant le filet, puis repart
function Drizzle({ name, q, k }) {
  const sl = slug(name)
  const [imgFailed, setImgFailed] = useState(false)
  const palette = SAUCE_PALETTES[sl] || { fill: '#C86D25', edge: '#8A440F', shine: '#F2A96B' }
  const y0 = 32 + k * 10
  const loops = Math.min(2 + q, 4)

  let d = `M 25 ${y0}`
  for (let i = 0; i < loops; i++) {
    const y = y0 + i * 7.5
    if (i % 2 === 0) {
      d += ` C 42 ${y - 6}, 58 ${y - 6}, 75 ${y + 1}`
    } else {
      d += ` C 58 ${y + 7}, 42 ${y + 7}, 25 ${y + 2}`
    }
  }

  const w = 2.1 + Math.min(q, 3) * 0.42

  return (
    <g>
      {/* Ombre portée douce du filet sur les aliments */}
      <path
        d={d}
        pathLength="1"
        className="drz"
        stroke="rgba(28, 22, 16, 0.22)"
        strokeWidth={w + 0.9}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(0.4, 1.1)"
      />
      {/* Contour / épaisseur du filet */}
      <path
        d={d}
        pathLength="1"
        className="drz"
        stroke={palette.edge}
        strokeWidth={w + 0.65}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Cœur crémeux de la sauce */}
      <path
        d={d}
        pathLength="1"
        className="drz"
        stroke={palette.fill}
        strokeWidth={w}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Reflet brillant façon vidéo studio */}
      <path
        d={d}
        pathLength="1"
        className="drz"
        stroke={palette.shine}
        strokeWidth={w * 0.3}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.88"
        transform="translate(-0.2, -0.4)"
      />

      {/* Bouteille inclinée dont la buse suit la pointe du filet */}
      <g opacity="0">
        {!imgFailed ? (
          <image
            href={`/img/ingredients/${sl}.png`}
            width="28"
            height="28"
            x="-14"
            y="-31"
            transform="rotate(160)"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <g transform="rotate(-142)">
            <path d="M 0 0 L -2.2 -5.5 L 2.2 -5.5 Z" fill={palette.fill} stroke={palette.edge} strokeWidth="0.6" />
            <rect x="-4.5" y="-8.5" width="9" height="3.2" rx="1.2" fill="#FFFFFF" stroke="#D6D3CB" strokeWidth="0.6" />
            <rect x="-6.5" y="-27" width="13" height="19" rx="4.2" fill={palette.fill} stroke={palette.edge} strokeWidth="0.8" />
            <rect x="-5" y="-21" width="10" height="7" rx="1.8" fill="#FFFFFF" opacity="0.92" />
            <line x1="-3" y1="-17.5" x2="3" y2="-17.5" stroke="#1D1D1B" strokeWidth="0.9" strokeLinecap="round" />
          </g>
        )}
        <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.84;1" dur="1.48s" fill="freeze" />
        <animateMotion
          begin="0.14s"
          dur="1.18s"
          path={d}
          fill="freeze"
          calcMode="spline"
          keyTimes="0;1"
          keySplines="0.35 0 0.45 1"
        />
      </g>
    </g>
  )
}

/* Icônes SVG minimalistes (sans emojis) */
function IconArrowLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  )
}

function IconWallet() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </svg>
  )
}

function IconPlate() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function IconReset() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}

function IconMinus() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M5 12h14" />
    </svg>
  )
}

function IconAlert() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

export default function Composer() {
  const { profile, refreshProfile } = useAuth()
  const [ingredients, setIngredients] = useState([])
  const [qty, setQty] = useState({})
  const [budget, setBudget] = useState(null)
  const [message, setMessage] = useState(null)
  const [ticket, setTicket] = useState(null)
  const [busy, setBusy] = useState(false)
  const [checkout, setCheckout] = useState(false)
  const [activeCat, setActiveCat] = useState('all')

  const load = useCallback(async () => {
    const { data } = await supabase.from('ingredients').select('*').order('name')
    setIngredients(data || [])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const byId = Object.fromEntries(ingredients.map((i) => [i.id, i]))
  const chosen = Object.entries(qty)
    .map(([id, q]) => ({ ing: byId[id], q }))
    .filter((c) => c.ing && c.q > 0)
  const sorted = [...chosen].sort(
    (a, b) => ORDER.indexOf(a.ing.category) - ORDER.indexOf(b.ing.category) || a.ing.name.localeCompare(b.ing.name)
  )
  const foods = sorted.filter((s) => s.ing.category !== 'sauce')
  const sauces = sorted.filter((s) => s.ing.category === 'sauce')
  const platedFoods = plateLayout(foods)

  const grams = chosen.reduce((s, c) => s + gramsOf(c.ing) * c.q, 0)
  const has = (cat) => chosen.some((c) => c.ing.category === cat)
  const isBalanced = has('base') && has('proteine') && has('legume')
  const tip = !has('base')
    ? 'Ajoute une base (≈ 150 g)'
    : !has('proteine')
      ? 'Ajoute une protéine (≈ 120 g)'
      : !has('legume')
        ? 'Ajoute un légume (≈ 80 g)'
        : 'Assiette équilibrée'

  const total = chosen.reduce((s, c) => s + c.ing.unit_price * c.q, 0)
  const pct = budget ? Math.min(100, Math.round((total / budget) * 100)) : 0
  const remaining = budget ? Math.max(0, budget - total) : null

  const animatedTotal = useAnimatedNumber(total, 360)
  const animatedGrams = useAnimatedNumber(grams, 340)

  function add(ing) {
    setMessage(null)
    if (!ing.available || ing.stock_qty <= 0) return
    const current = qty[ing.id] || 0
    if (current + 1 > ing.stock_qty) {
      setMessage({ type: 'error', text: `Il n'en reste plus assez : ${ing.name}.` })
      return
    }
    if (budget && total + ing.unit_price > budget) {
      setMessage({ type: 'error', text: `Budget de ${fcfa(budget)} atteint !` })
      return
    }
    setQty({ ...qty, [ing.id]: current + 1 })
  }

  function sub(ing) {
    setMessage(null)
    const current = qty[ing.id] || 0
    if (current > 0) setQty({ ...qty, [ing.id]: current - 1 })
  }

  function chooseBudget(v) {
    setMessage(null)
    if (v && total > v) {
      setMessage({ type: 'error', text: 'Ton plat dépasse déjà ce budget : retire des ingrédients.' })
      return
    }
    setBudget(v)
  }

  async function topUp(amount) {
    const { error } = await supabase.rpc('recharge', { p_amount: amount })
    if (error) setMessage({ type: 'error', text: error.message })
    else await refreshProfile()
  }

  async function validate(method = 'solde') {
    setBusy(true)
    setMessage(null)
    const items = chosen.map((c) => ({ type: 'ingredient', id: c.ing.id, qty: c.q }))
    const { data, error } = await supabase.rpc('place_order', { p_items: items, p_pickup: today(), p_method: method })
    if (error) setMessage({ type: 'error', text: error.message })
    else {
      setQty({})
      setCheckout(false)
      await refreshProfile()
      load()
      setTicket(await fetchTicket(data))
    }
    setBusy(false)
  }

  function jumpToCategory(cat) {
    setActiveCat(cat)
    if (cat === 'all') return
    const el = document.getElementById(`cat-${cat}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="cmp-page">
      <Header />
      {ticket && <Ticket ticket={ticket} onClose={() => setTicket(null)} />}

      <main className="container">
        <div className="cmp-topbar-row">
          <Link to="/menu" className="cmp-back">
            <IconArrowLeft />
            <span>Menu</span>
          </Link>
          <span className="pill pill-mint">
            <IconWallet />
            <span>Solde : {fcfa(profile?.balance)}</span>
          </span>
        </div>

        <div className="cmp-header">
          <h1>Compose ton plat</h1>
          <p className="cmp-subtitle">Touche les ingrédients pour dresser ton assiette en direct.</p>
        </div>

        <div className="cmp-layout">
          {/* Colonne gauche (fixe sur tablette/desktop) : Assiette + Compteurs animés */}
          <div className="cmp-stage-col">
            <div className="cmp-stage-card">
              <div className="cmp-stage-actions">
                <span className={`cmp-balance-badge ${isBalanced ? 'is-balanced' : ''}`}>
                  {isBalanced && <IconCheck />}
                  <span>{tip}</span>
                </span>
                {chosen.length > 0 && (
                  <button
                    type="button"
                    className="cmp-clear-btn"
                    onClick={() => {
                      setMessage(null)
                      setQty({})
                    }}
                  >
                    <IconReset />
                    <span>Vider</span>
                  </button>
                )}
              </div>

              <div className="bowl">
                <img
                  className="bowl-img"
                  src="/img/bol.png"
                  alt=""
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />

                {chosen.length === 0 && (
                  <div className="bowl-empty">
                    <span className="bowl-empty-icon">
                      <IconPlate />
                    </span>
                    <span>
                      Ton assiette est vide.
                      <br />
                      Choisis un ingrédient ci-dessous.
                    </span>
                  </div>
                )}

                {platedFoods.map((p) => {
                  const visualCopies = Math.min(p.item.q, 3)
                  return Array.from({ length: visualCopies }, (_, copyIdx) => {
                    const offset = STACK_OFFSETS[copyIdx]
                    const pieceSize = p.size * offset.scale
                    const pieceRot = p.rot + offset.dRot
                    const isTopPiece = copyIdx === visualCopies - 1
                    const isTopBadge = isTopPiece && p.item.q > 1
                    const pieceKey = isTopPiece
                      ? `${p.item.ing.id}-top-${p.item.q}`
                      : `${p.item.ing.id}-piece-${copyIdx + 1}`

                    return (
                      <div
                        key={pieceKey}
                        className="in-bowl"
                        style={{
                          left: `${p.x + offset.dx}%`,
                          top: `${p.y + offset.dy}%`,
                          width: `${pieceSize}%`,
                          height: `${pieceSize}%`,
                          zIndex: p.z + copyIdx,
                        }}
                      >
                        <div className="scoop" style={{ '--rot': `${pieceRot}deg` }}>
                          <FoodImg folder="ingredients" name={p.item.ing.name} category={p.item.ing.category} size="fill" />
                        </div>
                        {isTopBadge && <span className="in-bowl-qty">×{p.item.q}</span>}
                      </div>
                    )
                  })
                })}

                {sauces.length > 0 && (
                  <svg className="drizzle" viewBox="0 0 100 100" aria-hidden="true">
                    {sauces.map((s, k) => (
                      <Drizzle key={`${s.ing.id}-${s.q}`} name={s.ing.name} q={s.q} k={k} />
                    ))}
                  </svg>
                )}
              </div>

              <div className="cmp-metrics">
                <div className="cmp-price-row">
                  <span className="cmp-price-val">{fcfa(animatedTotal)}</span>
                  {budget && <span className="cmp-price-cap">/ {fcfa(budget)}</span>}
                </div>

                <p className="cmp-grams-line">
                  {chosen.length > 0 ? (
                    <>
                      Poids estimé : <strong>≈ {animatedGrams} g</strong> · idéal 400 à 500 g
                    </>
                  ) : (
                    <>Portion idéale recommandée : 400 à 500 g</>
                  )}
                </p>

                {sorted.length > 0 && (
                  <div className="cmp-selected-strip">
                    {sorted.map((s) => (
                      <span key={s.ing.id} className="cmp-chip">
                        <span>
                          {s.ing.name}
                          {s.q > 1 ? ` ×${s.q}` : ''}
                        </span>
                        <button
                          type="button"
                          className="cmp-chip-btn"
                          aria-label={`Retirer ${s.ing.name}`}
                          onClick={() => sub(s.ing)}
                        >
                          <IconMinus />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <button
                  className="btn-coral btn-big cmp-cta"
                  disabled={busy || chosen.length === 0}
                  onClick={() => setCheckout(true)}
                >
                  <span>Valider et payer</span>
                  {chosen.length > 0 && <span>· {fcfa(animatedTotal)}</span>}
                </button>

                {message && (
                  <p className={`cmp-feedback ${message.type === 'error' ? 'error' : 'ok'}`}>
                    {message.type === 'error' && <IconAlert />}
                    <span>{message.text}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Colonne droite : Budget + Catalogue d'ingrédients */}
          <div className="cmp-catalog-col">
            <div className="cmp-budget-card">
              <div className="cmp-budget-head">
                <span className="cmp-budget-title">Mon budget</span>
                {budget ? (
                  <span className={`cmp-budget-rem ${pct >= 100 ? 'full' : ''}`}>
                    {remaining > 0 ? `Reste ${fcfa(remaining)}` : 'Budget atteint'}
                  </span>
                ) : (
                  <span className="muted" style={{ fontSize: '0.8rem' }}>Libre</span>
                )}
              </div>

              <div className="tabs" style={{ paddingBottom: budget ? 8 : 0 }}>
                {PRESETS.map((p) => (
                  <button key={p} className={budget === p ? 'on' : ''} onClick={() => chooseBudget(p)}>
                    {p.toLocaleString('fr-FR')} F
                  </button>
                ))}
                <button className={!budget ? 'on' : ''} onClick={() => chooseBudget(null)}>
                  Sans limite
                </button>
              </div>

              {budget && (
                <div className="budget">
                  <div
                    className={pct >= 100 ? 'full' : pct >= 85 ? 'warn' : ''}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
            </div>

            <div className="cmp-cat-nav">
              <div className="tabs" style={{ paddingBottom: 2 }}>
                <button className={activeCat === 'all' ? 'on' : ''} onClick={() => jumpToCategory('all')}>
                  Tout
                </button>
                {CATEGORIES.map(([cat, label]) => (
                  <button key={cat} className={activeCat === cat ? 'on' : ''} onClick={() => jumpToCategory(cat)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {CATEGORIES.map(([cat, label]) => {
              const list = ingredients.filter((i) => i.category === cat)
              if (list.length === 0) return null
              return (
                <section key={cat} id={`cat-${cat}`} className="cmp-section">
                  <div className="cmp-section-head">
                    <h3>{label}</h3>
                    <span className="cmp-section-count">{list.length} choix</span>
                  </div>

                  <div className="plates">
                    {list.map((ing) => {
                      const out = !ing.available || ing.stock_qty <= 0
                      const low = !out && ing.stock_qty <= ing.alert_threshold
                      const q = qty[ing.id] || 0
                      return (
                        <div key={ing.id} className="plate-wrap" style={{ opacity: out ? 0.45 : 1 }}>
                          <button className={`plate ${q ? 'on' : ''}`} disabled={out} onClick={() => add(ing)}>
                            <span className="plate-disc">
                              <FoodImg folder="ingredients" name={ing.name} category={ing.category} size={62} />
                            </span>
                            <span className="plate-name">{ing.name}</span>
                            <span className="plate-price">
                              {ing.unit_price} F · ≈{gramsOf(ing)} g
                            </span>
                            {q > 0 && <span className="plate-qty">{q}</span>}
                          </button>
                          <span className="plate-low">{out ? 'Épuisé' : low ? 'Bientôt fini' : ''}</span>
                          {q > 0 && (
                            <button className="mini" onClick={() => sub(ing)}>
                              <IconMinus />
                              <span>retirer</span>
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      </main>

      {checkout && (
        <Checkout
          total={total}
          balance={profile?.balance}
          busy={busy}
          error={message?.type === 'error' ? message.text : null}
          onPay={validate}
          onTopUp={topUp}
          onClose={() => setCheckout(false)}
        />
      )}
      <TabBar />
    </div>
  )
}