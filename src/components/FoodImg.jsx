import { useState } from 'react'

export const slug = (s = '') =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

// Unsplash de secours pour un rendu photo ultra-réaliste détouré
const PHOTO_FALLBACKS = {
  riz: 'https://images.unsplash.com/photo-1536304997881-a372c179924b?auto=format&fit=crop&w=150&q=80',
  'riz-jaune': 'https://images.unsplash.com/photo-1626831301097-3997480cf895?auto=format&fit=crop&w=150&q=80',
  attieke: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=150&q=80',
  'spaghetti-tomate': 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=150&q=80',
  'spaghetti-bolognaise': 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=150&q=80',
  'pain-plat': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=150&q=80',
  'poulet-braise': 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=150&q=80',
  'poisson-braise': 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=150&q=80',
  'steak-grille': 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=150&q=80',
  oeuf: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=150&q=80',
  jambon: 'https://images.unsplash.com/photo-1608039755401-742074f0548d?auto=format&fit=crop&w=150&q=80',
  thon: 'https://images.unsplash.com/photo-1516685018646-549198525c1b?auto=format&fit=crop&w=150&q=80',
  frites: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=150&q=80',
  'mais-grille': 'https://images.unsplash.com/photo-1551782450-17144efb9c50?auto=format&fit=crop&w=150&q=80',
  alloco: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=150&q=80',
  igname: 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&w=150&q=80',
  foutou: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=150&q=80',
  avocat: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=150&q=80',
  tomate: 'https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&w=150&q=80',
  oignon: 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=150&q=80',
  piment: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?auto=format&fit=crop&w=150&q=80',
  mayonnaise: 'https://images.unsplash.com/photo-1588854337236-6889d631faa8?auto=format&fit=crop&w=150&q=80',
  ketchup: 'https://images.unsplash.com/photo-1607305387299-a3d9611cd46f?auto=format&fit=crop&w=150&q=80',
}

// Emojis de secours au cas où tout échoue
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
const DISH_IMGS = ['cookie-geant','foutou-sauce','sandwich-poulet','toast-avocat-oeuf','toast-champignon','toast-fraise','toast-grenade-feta','toast-oeuf-brouille','toast-oeuf-dur','toast-pois-chiche','toast-saumon-avocat','toast-saumon-concombre','toast-saumon-fromage','toast-tomate-mozza','jus-de-bissap','bouteille-bissap','poulet-sauce-tomate','riz-sauce-arachide','salade-grecque','salade-de-pates']
const STOP = new Set(['au', 'aux', 'a', 'de', 'du', 'la', 'le', 'les', 'et', 'd', 'l', 'en', 'avec', 'sur'])
const toks = (s) => slug(s).split('-').filter((t) => t && !STOP.has(t))

// Trouve la meilleure photo même si le nom en base n'est pas exactement celui du fichier
export function dishImage(name) {
  const s = slug(name)
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

export const hasDishImage = (name) => DISH_IMGS.includes(dishImage(name))

export default function FoodImg({ folder, name, category, size = 64 }) {
  const fill = size === 'fill'
  const [failed, setFailed] = useState(false)
  const s = folder === 'dishes' ? dishImage(name) : slug(name)

  if (!failed) {
    return (
      <img
        src={`/img/${folder}/${s}.png`}
        alt={name}
        width={fill ? undefined : size}
        height={fill ? undefined : size}
        className="food-img-asset"
        loading="lazy"
        decoding="async"
        style={fill ? { width: '100%', height: '100%', objectFit: 'cover' } : { objectFit: 'cover' }}
        onError={() => setFailed(true)}
      />
    )
  }

  // Si l'asset local manque, on tente la photo Unsplash détourée de manière naturelle
  const fallbackUrl = PHOTO_FALLBACKS[s]
  if (fallbackUrl) {
    return (
      <img
        src={fallbackUrl}
        alt={name}
        width={fill ? undefined : size}
        height={fill ? undefined : size}
        className="food-img-asset is-fallback"
        style={fill ? { width: '100%', height: '100%', objectFit: 'cover' } : { objectFit: 'cover' }}
      />
    )
  }

  // Sinon repli Emoji
  return (
    <span className="food-emoji-fallback" role="img" aria-label={name} style={{ fontSize: fill ? 'min(16vw, 74px)' : size * 0.75, lineHeight: 1 }}>
      {EMOJI[s] || CAT[category] || '🍽️'}
    </span>
  )
}