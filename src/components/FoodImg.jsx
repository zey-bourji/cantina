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
