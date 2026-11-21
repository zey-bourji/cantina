// Panier d'un visiteur non connecté : gardé sur l'appareil jusqu'à son inscription
const KEY = 'cantina_guest_cart'
export const getGuestCart = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null }
}
export const setGuestCart = (c) => {
  try { localStorage.setItem(KEY, JSON.stringify(c)) } catch { /* ignore */ }
}
export const clearGuestCart = () => {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}
