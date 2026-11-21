import { NavLink } from 'react-router-dom'

const Icon = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />
    </svg>
  ),
  bowl: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11h18a9 9 0 0 1-18 0z" />
      <path d="M8 7c0-2 2-2 2-4M14 7c0-2 2-2 2-4" />
    </svg>
  ),
  wallet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M3 7l12-4v4" /><circle cx="17" cy="13.5" r="1" />
    </svg>
  ),
  orders: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2h12v20l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6M9 12h6" />
    </svg>
  ),
}

export default function TabBar() {
  return (
    <nav className="tabbar">
      <NavLink to="/menu" end className={({ isActive }) => (isActive ? 'on' : '')}>
        {Icon.home}Menu
      </NavLink>
      <NavLink to="/composer" className={({ isActive }) => (isActive ? 'on' : '')}>
        {Icon.bowl}Composer
      </NavLink>
      <NavLink to="/compte" className={({ isActive }) => (isActive ? 'on' : '')}>
        {Icon.wallet}Compte
      </NavLink>
      <a href="/menu#commandes">{Icon.orders}Commandes</a>
    </nav>
  )
}
