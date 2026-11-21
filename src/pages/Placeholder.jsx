import Header from '../components/Header'

export default function Placeholder({ title, text }) {
  return (
    <div>
      <Header />
      <main style={{ padding: 20 }}>
        <h2>{title}</h2>
        <p>{text}</p>
      </main>
    </div>
  )
}
