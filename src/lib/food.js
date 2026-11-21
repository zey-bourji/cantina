import { slug } from '../components/FoodImg'

export const ALLERGENS = [
  ['gluten', 'Gluten', '🌾'],
  ['oeuf', 'Œufs', '🥚'],
  ['lait', 'Lait', '🥛'],
  ['poisson', 'Poisson', '🐟'],
  ['crustace', 'Crustacés', '🦐'],
  ['arachide', 'Arachides', '🥜'],
  ['coque', 'Fruits à coque', '🌰'],
  ['sesame', 'Sésame', '🫘'],
  ['soja', 'Soja', '🌱'],
]
const RULES = {
  gluten: ['pain', 'sandwich', 'toast', 'spaghetti', 'pates', 'wrap', 'burger', 'pizza', 'cookie', 'gateau', 'cake', 'croissant', 'semoule', 'attieke'],
  oeuf: ['oeuf', 'mayonnaise', 'cookie', 'gateau', 'cake', 'cesar', 'omelette'],
  lait: ['fromage', 'mozza', 'mozzarella', 'feta', 'creme', 'lait', 'yaourt', 'beurre', 'cookie', 'cesar', 'glace', 'gateau'],
  poisson: ['poisson', 'saumon', 'thon', 'sardine', 'capitaine', 'cesar'],
  crustace: ['crevette', 'crabe', 'langouste'],
  arachide: ['arachide', 'cacahuete', 'pistache'],
  coque: ['noix', 'amande', 'noisette'],
  sesame: ['sesame', 'burger'],
  soja: ['soja'],
}
// Estimation d'après le nom du plat. À confirmer avec la cantine en cas d'allergie grave.
export function allergensOf(dish) {
  if (Array.isArray(dish.allergens) && dish.allergens.length) return dish.allergens
  const s = `${slug(dish.name)}-${slug(dish.description || '')}`
  return Object.entries(RULES).filter(([, words]) => words.some((w) => s.includes(w))).map(([k]) => k)
}
const LEAD = {
  sandwich: 'Un sandwich préparé à la commande, servi frais.',
  salade: 'Une salade fraîche, assaisonnée au moment de servir.',
  toast: 'Un toast croustillant, garni généreusement.',
  dessert: 'Une douceur pour finir le repas.',
  boisson: 'Une boisson bien fraîche.',
  plat_ivoirien: 'Un plat ivoirien cuisiné sur place, copieux et bien assaisonné.',
}
export const describe = (dish) => dish.description || LEAD[dish.category] || 'Préparé par la cantine.'
const KEY = 'cantina_allergies'
export const loadAllergies = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
export const saveAllergies = (a) => {
  try { localStorage.setItem(KEY, JSON.stringify(a)) } catch { /* ignore */ }
}
