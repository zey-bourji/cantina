// Les trois services de la cantina. Modifie ici les heures de fin de commande.
export const SERVICES = [
  { key: 'petit_dej', label: 'Petit-déjeuner', closes: '10:30' },
  { key: 'dejeuner', label: 'Déjeuner', closes: '14:30' },
  { key: 'diner', label: 'Dîner', closes: '20:30' },
  { key: 'toute_la_journee', label: 'Toute la journée', closes: '21:00' },
]
export const serviceOf = (dish) => SERVICES.find((s) => s.key === dish.service) || SERVICES[3]
const todayStr = () => new Date().toLocaleDateString('sv-SE')
const nowHM = () => new Date().toTimeString().slice(0, 5)

// Fermé seulement pour le jour même : pour un autre jour, on peut toujours réserver.
export const isClosed = (dish, day) => day === todayStr() && nowHM() >= serviceOf(dish).closes
export const closesLabel = (dish) => serviceOf(dish).closes.replace(':00', 'h').replace(':', 'h')
