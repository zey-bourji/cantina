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
  igname: 130,
  foutou: 180,
  avocat: 80,
  tomate: 60,
  oignon: 30,
  piment: 5,
  mayonnaise: 25,
  ketchup: 20,
}
const gramsOf = (ing) => GRAMS[slug(ing.name)] || GRAMS_BY_CAT[ing.category] || 100

// Compteur mécanique type odomètre : chaque chiffre roule verticalement comme sur un Reel UI
const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
function RollingNumber({ value }) {
  const formatted = Math.round(Number(value || 0)).toLocaleString('fr-FR')
  const chars = formatted.split('')

  return (
    <span className="odo" aria-label={formatted}>
      {chars.map((ch, idx) => {
        const posFromRight = chars.length - 1 - idx
        if (ch >= '0' && ch <= '9') {
          const digit = Number(ch)
          return (
            <span key={`d-${posFromRight}`} className="odo-digit-box">
              <span className="odo-strip" style={{ transform: `translateY(-${digit * 1.15}em)` }}>
                {DIGITS.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </span>
            </span>
          )
        }
        return (
          <span key={`s-${posFromRight}`} className="odo-sep">
            {ch === ' ' || ch === '\u202f' || ch === '\u00a0' ? '\u00a0' : ch}
          </span>
        )
      })}
    </span>
  )
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

// Ingrédients "saupoudrés" : une pluie de petits grains retombe sur l'assiette
const SPRINKLES = [
  { match: 'sel', only: true, colors: ['#FFFFFF', '#F1EFEA', '#DAD6CE'], shape: 'cube', size: 1.15, count: 20, tool: 'shaker' },
  { match: 'poivre', only: true, colors: ['#2B2622', '#4A413A', '#1A1613'], shape: 'dot', size: 0.9, count: 18, tool: 'shaker' },
  { match: 'maggi', only: true, colors: ['#D9A441', '#B9792A', '#EBC26B', '#8F5A1B'], shape: 'chunk', size: 1.5, count: 14, tool: 'cube' },
  { match: 'piment', only: true, colors: ['#D62A1B', '#A81C10', '#F0541E'], shape: 'flake', size: 1.5, count: 14, tool: null },
  { match: 'tomate', only: false, colors: ['#E0342A', '#C7261C', '#F25B4B'], shape: 'dice', size: 2, count: 8, tool: null },
  { match: 'oignon', only: false, colors: ['#F4E7F0', '#E7C9DD', '#FFF8F2'], shape: 'flake', size: 1.7, count: 9, tool: null },
  { match: 'ail', only: false, colors: ['#FFF4D6', '#F2E2B0'], shape: 'dot', size: 1.1, count: 7, tool: null },
]
const sprinkleOf = (ing) => {
  const sl = slug(ing.name)
  return SPRINKLES.find((sp) => (sp.match === 'ail' ? sl === 'ail' : sl.includes(sp.match)))
}
const rnd = (n) => {
  const x = Math.sin(n * 12.9898 + 4.1414) * 43758.5453
  return x - Math.floor(x)
}

function Sprinkle({ spec, q, k }) {
  const t0 = 0.1 + k * 0.45
  const count = spec.count + (q - 1) * 5
  const grains = Array.from({ length: count }, (_, i) => {
    const r1 = rnd(i + 1 + k * 31)
    const r2 = rnd(i + 57 + k * 17)
    const r3 = rnd(i + 91 + k * 7)
    const r4 = rnd(i + 13 + k * 5)
    return {
      x: 26 + r1 * 48,
      y: 32 + r2 * 38,
      rot: r3 * 180,
      color: spec.colors[Math.floor(r4 * spec.colors.length)],
      begin: t0 + 0.12 + i * (0.9 / count),
      dx: (r4 - 0.5) * 8,
      s: spec.size * (0.75 + r3 * 0.6),
    }
  })

  const grain = (g) => {
    if (spec.shape === 'dot') return <circle r={g.s * 0.6} fill={g.color} />
    if (spec.shape === 'flake') return <ellipse rx={g.s * 0.85} ry={g.s * 0.4} fill={g.color} />
    if (spec.shape === 'chunk') return <polygon points={`${-g.s},${-g.s * 0.5} ${g.s * 0.2},${-g.s * 0.8} ${g.s},${g.s * 0.3} ${-g.s * 0.4},${g.s * 0.8}`} fill={g.color} />
    if (spec.shape === 'dice') return <rect x={-g.s / 2} y={-g.s / 2} width={g.s} height={g.s} rx="0.4" fill={g.color} stroke="rgba(0,0,0,0.12)" strokeWidth="0.15" />
    return <rect x={-g.s / 2} y={-g.s / 2} width={g.s} height={g.s} fill={g.color} stroke="rgba(0,0,0,0.18)" strokeWidth="0.15" />
  }

  const toolDur = 1.3
  return (
    <g>
      {/* Outil : salière / cube qu'on écrase au-dessus de l'assiette */}
      {spec.tool && (
        <g opacity="0">
          <g transform="translate(50 14)">
            <g>
              {spec.tool === 'shaker' ? (
                <g>
                  <rect x="-5" y="-4" width="10" height="11" rx="2.5" fill="#F6F8FA" stroke="#B9C0C7" strokeWidth="0.6" />
                  <rect x="-5.3" y="-8" width="10.6" height="5" rx="2" fill="#C8CED4" stroke="#8F979F" strokeWidth="0.6" />
                  <circle cx="-2" cy="-5.5" r="0.5" fill="#6B737B" />
                  <circle cx="0" cy="-5.5" r="0.5" fill="#6B737B" />
                  <circle cx="2" cy="-5.5" r="0.5" fill="#6B737B" />
                </g>
              ) : (
                <g>
                  <rect x="-5" y="-5" width="10" height="10" rx="1.6" fill="#F3C233" stroke="#B88A10" strokeWidth="0.6" />
                  <rect x="-3.6" y="-2.4" width="7.2" height="4.8" rx="0.8" fill="#D8281C" />
                  <text x="0" y="1.1" fontSize="3" fontWeight="800" textAnchor="middle" fill="#FFF">MAGGI</text>
                </g>
              )}
              <animateTransform attributeName="transform" type="rotate" values="0;-24;18;-24;18;-12;0" dur={`${toolDur}s`} begin={`${t0}s`} fill="freeze" />
            </g>
          </g>
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.85;1" dur={`${toolDur + 0.2}s`} begin={`${t0}s`} fill="freeze" />
        </g>
      )}
      {grains.map((g, i) => (
        <g key={i} transform={`translate(${g.x} ${g.y}) rotate(${g.rot})`} opacity="0">
          <g>
            {grain(g)}
            <animateTransform attributeName="transform" type="translate" from={`${g.dx} -38`} to="0 0" dur="0.5s" begin={`${g.begin}s`} fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.5 0 0.9 0.6" />
          </g>
          <set attributeName="opacity" to="1" begin={`${g.begin}s`} fill="freeze" />
        </g>
      ))}
    </g>
  )
}

// Filet de sauce en zigzag : la bouteille arrive, se presse en S-curve en versant le filet, puis repart
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

      {/* Bouteille inclinée dont la buse suit la pointe du filet avec pulsation de pression */}
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
          <g className="bottle-squeeze">
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

  // États purement visuels pour la chorégraphie d'animation
  const [activeCat, setActiveCat] = useState('all')
  const [flyers, setFlyers] = useState([])
  const [bowlImpact, setBowlImpact] = useState(0)
  const [bumping, setBumping] = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const bowlRef = useRef(null)
  const prevBalancedRef = useRef(false)

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
  const sprinkled = sorted.filter((s) => sprinkleOf(s.ing))
  const foods = sorted.filter((s) => s.ing.category !== 'sauce' && !sprinkleOf(s.ing)?.only)
  const sauces = sorted.filter((s) => s.ing.category === 'sauce' && !sprinkleOf(s.ing)?.only)
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

  useEffect(() => {
    if (bowlImpact === 0) return
    setBumping(true)
    const t = setTimeout(() => setBumping(false), 400)
    return () => clearTimeout(t)
  }, [bowlImpact])

  useEffect(() => {
    if (isBalanced && !prevBalancedRef.current) {
      setCelebrating(true)
      const timer = setTimeout(() => setCelebrating(false), 750)
      prevBalancedRef.current = true
      return () => clearTimeout(timer)
    }
    prevBalancedRef.current = isBalanced
  }, [isBalanced])

  const total = chosen.reduce((s, c) => s + c.ing.unit_price * c.q, 0)
  const pct = budget ? Math.min(100, Math.round((total / budget) * 100)) : 0
  const remaining = budget ? Math.max(0, budget - total) : null

  // Déclenche le vol parabolique de la carte vers l'assiette + l'impact à l'atterrissage
  function launchFlight(ing, e) {
    const bowlEl = bowlRef.current
    const discEl = e?.currentTarget?.querySelector?.('.plate-disc')
    if (!bowlEl || !discEl) {
      setBowlImpact((n) => n + 1)
      return
    }

    const from = discEl.getBoundingClientRect()
    const to = bowlEl.getBoundingClientRect()
    const id = `${ing.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const size = Math.min(68, from.width * 0.85)

    const flyer = {
      id,
      name: ing.name,
      category: ing.category,
      size,
      sx: from.left + from.width / 2 - size / 2,
      sy: from.top + from.height / 2 - size / 2,
      ex: to.left + to.width / 2 - size / 2,
      ey: to.top + to.height / 2 - size / 2,
    }

    setFlyers((prev) => [...prev, flyer])
    setTimeout(() => setBowlImpact((n) => n + 1), 390)
    setTimeout(() => {
      setFlyers((prev) => prev.filter((item) => item.id !== id))
    }, 580)
  }

  function add(ing, e) {
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
    launchFlight(ing, e)
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
    <div className="composer-page">
      <Header />
      {ticket && <Ticket ticket={ticket} onClose={() => setTicket(null)} />}

      {/* Calque des ingrédients en vol parabolique vers l'assiette */}
      {flyers.length > 0 && (
        <div className="fly-layer" aria-hidden="true">
          {flyers.map((f) => (
            <div
              key={f.id}
              className="fly-x"
              style={{
                width: f.size,
                height: f.size,
                '--sx': `${f.sx}px`,
                '--ex': `${f.ex}px`,
              }}
            >
              <div
                className="fly-y"
                style={{
                  '--sy': `${f.sy}px`,
                  '--ey': `${f.ey}px`,
                }}
              >
                <FoodImg folder="ingredients" name={f.name} category={f.category} size="fill" />
              </div>
            </div>
          ))}
        </div>
      )}

      <main className="container cmp-container">
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
          {/* Colonne gauche (fixe sur tablette/desktop) : Assiette + Compteurs odomètre */}
          <div className="cmp-stage-col">
            <div className="cmp-stage-card">
              <div className="cmp-stage-actions">
                <span
                  className={`cmp-balance-badge ${isBalanced ? 'is-balanced' : ''} ${celebrating ? 'is-celebrating' : ''}`}
                >
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

              <div className="bowl-frame">
                <div
                  ref={bowlRef}
                  className={`bowl ${bumping ? 'is-impact' : ''}`}
                >
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

                  {sprinkled.length > 0 && (
                    <svg className="drizzle" viewBox="0 0 100 100" aria-hidden="true">
                      {sprinkled.map((s, k) => (
                        <Sprinkle key={`${s.ing.id}-${s.q}`} spec={sprinkleOf(s.ing)} q={s.q} k={k} />
                      ))}
                    </svg>
                  )}

                  {sauces.length > 0 && (
                    <svg className="drizzle" viewBox="0 0 100 100" aria-hidden="true">
                      {sauces.map((s, k) => (
                        <Drizzle key={`${s.ing.id}-${s.q}`} name={s.ing.name} q={s.q} k={k} />
                      ))}
                    </svg>
                  )}
                </div>
              </div>

              <div className="cmp-metrics">
                <div className="cmp-price-row">
                  <span className="cmp-price-val">
                    <RollingNumber value={total} />
                    <span className="cmp-price-unit">FCFA</span>
                  </span>
                  {budget && <span className="cmp-price-cap">/ {fcfa(budget)}</span>}
                </div>

                <p className="cmp-grams-line">
                  {chosen.length > 0 ? (
                    <>
                      Poids estimé :{' '}
                      <strong>
                        ≈&nbsp;<RollingNumber value={grams} />&nbsp;g
                      </strong>{' '}
                      · idéal 400 à 500 g
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
                  {chosen.length > 0 && (
                    <span>
                      · <RollingNumber value={total} /> F
                    </span>
                  )}
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
                    {remaining > 0 ? (
                      <>
                        Reste <RollingNumber value={remaining} /> F
                      </>
                    ) : (
                      'Budget atteint'
                    )}
                  </span>
                ) : (
                  <span className="muted" style={{ fontSize: '0.8rem' }}>Libre</span>
                )}
              </div>

              <div className="tabs tabs-budget" style={{ paddingBottom: budget ? 8 : 0 }}>
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
                <div className="budget budget-bar-track">
                  <div
                    className={`budget-progress-fill ${pct >= 100 ? 'full' : pct >= 85 ? 'warn' : ''}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
            </div>

            <div className="cmp-cat-nav">
              <div className="tabs tabs-categories" style={{ paddingBottom: 2 }}>
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
                    {list.map((ing, idx) => {
                      const out = !ing.available || ing.stock_qty <= 0
                      const low = !out && ing.stock_qty <= ing.alert_threshold
                      const q = qty[ing.id] || 0
                      return (
                        <div
                          key={ing.id}
                          className="plate-wrap"
                          style={{ opacity: out ? 0.45 : 1, '--stagger': idx }}
                        >
                          <button className={`plate ${q ? 'on' : ''}`} disabled={out} onClick={(e) => add(ing, e)}>
                            <span className="plate-disc">
                              <FoodImg folder="ingredients" name={ing.name} category={ing.category} size={62} />
                            </span>
                            <span className="plate-name">{ing.name}</span>
                            <span className="plate-price">
                              {ing.unit_price} F · ≈{gramsOf(ing)} g
                            </span>
                            {q > 0 && <span className="plate-qty">{q}</span>}
                          </button>
                          {out ? (
                            <span className="plate-low state-out">Épuisé</span>
                          ) : low ? (
                            <span className="plate-low state-low">Bientôt fini</span>
                          ) : null}
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