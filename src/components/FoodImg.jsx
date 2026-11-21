import { useState } from 'react'

export const slug = (s = '') =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

// Emojis de secours tant que les vraies images ne sont pas dans /public/img
const EMOJI = {
  attieke: '🍚',
  riz: '🍚',
  thon: '🐟',
  'poulet-braise': '🍗',
  'poisson-braise': '🐟',
  oeuf: '🥚',
  alloco: '🍌',
  tomate: '🍅',
  oignon: '🧅',
  piment: '🌶️',
  mayonnaise: '🫙',
}
const CAT = {
  sandwich: '🥪',
  salade: '🥗',
  toast: '🥑',
  dessert: '🍪',
  boisson: '🥤',
  plat_ivoirien: '🍛',
  base: '🍚',
  proteine: '🍗',
  accompagnement: '🍌',
  legume: '🥬',
  sauce: '🌶️',
}

// Photos de plats disponibles dans /public/img/dishes (sans extension)
const DISH_IMGS = ['cookie-geant','foutou-sauce','sandwich-poulet','toast-avocat-oeuf','toast-champignon','toast-fraise','toast-grenade-feta','toast-oeuf-brouille','toast-oeuf-dur','toast-pois-chiche','toast-saumon-avocat','toast-saumon-concombre','toast-saumon-fromage','toast-tomate-mozza']
const STOP = new Set(['au', 'aux', 'a', 'de', 'du', 'la', 'le', 'les', 'et', 'd', 'l', 'en', 'avec', 'sur'])
const toks = (s) => slug(s).split('-').filter((t) => t && !STOP.has(t))

// Trouve la meilleure photo même si le nom en base n'est pas exactement celui du fichier
export function dishImage(name) {
  const s = folder === 'dishes' ? dishImage(name) : slug(name)
  if (DISH_IMGS.includes(s)) return s
  const t = toks(name)
  let best = null, bestScore = 0
  for (const img of DISH_IMGS) {
    const it = toks(img)
    const common = t.filter((x) => it.some((y) => y === x || y.startsWith(x) || x.startsWith(y))).length
    const score = common - (it.length - common) * 0.1
    if (common > 0 && score > bestScore) { best = img; bestScore = score }
  }
  return best || s
}

export default function FoodImg({ folder, name, category, size = 64 }) {
  const fill = size === 'fill'
  const [failed, setFailed] = useState(false)
  const s = slug(name)
  if (!failed) {
    return (
      <img
        src={`/img/${folder}/${s}.png`}
        alt={name}
        width={fill ? undefined : size}
        height={fill ? undefined : size}
        style={fill ? { width: '100%', height: '100%', objectFit: 'contain' } : { objectFit: 'contain' }}
        onError={() => setFailed(true)}
      />
    )
  }
  return (
    <span role="img" aria-label={name} style={{ fontSize: fill ? 'min(16vw, 74px)' : size * 0.75, lineHeight: 1 }}>
      {EMOJI[s] || CAT[category] || '🍽️'}
    </span>
  )
}
