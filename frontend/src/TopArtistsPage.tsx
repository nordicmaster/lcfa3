import { useState } from 'react'
import styles from './TopArtistsPage.module.css'

type TopArtist = [string, number, number]

const PERIODS = [
  { value: 'overall', label: 'Overall' },
  { value: '7day', label: 'Last 7 days' },
  { value: '1month', label: 'Last month' },
  { value: '3month', label: 'Last 3 months' },
  { value: '6month', label: 'Last 6 months' },
  { value: '12month', label: 'Last 12 months' },
]

function TopArtistsPage() {
  const [name, setName] = useState('')
  const [period, setPeriod] = useState('overall')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [artists, setArtists] = useState<TopArtist[] | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)
    setArtists(null)

    try {
      const params = new URLSearchParams({ period })
      const res = await fetch(`/api/v1/user_stats/top_artists?${params.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(errorText || `HTTP ${res.status}`)
      }
      const data = await res.json()
      if (typeof data === 'string') {
        setError(data)
      } else {
        setArtists(data as TopArtist[])
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Top Artists</h1>

      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Last.fm username"
          className={styles.input}
          required
        />
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className={styles.select}
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value} className={styles.option}>
              {p.label}
            </option>
          ))}
        </select>
        <button type="submit" className={styles.button} disabled={loading}>
          {loading ? 'Loading...' : 'Get Top Artists'}
        </button>
      </form>

      {error && <div className={styles.messageError}>Error: {error}</div>}

      {artists !== null && artists.length === 0 && !error && (
        <div className={styles.messageInfo}>No artists found for &quot;{name.trim()}&quot;.</div>
      )}

      {artists !== null && artists.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>#</th>
              <th className={styles.th}>Artist</th>
              <th className={styles.th}>Period playcount</th>
              <th className={styles.th}>Overall scrobbles</th>
            </tr>
          </thead>
          <tbody>
            {artists.map(([artist, playcount, overall], index) => (
              <tr key={artist}>
                <td className={styles.td}>{index + 1}</td>
                <td className={styles.td}>{artist}</td>
                <td className={styles.td}>{playcount.toLocaleString("ru-RU")}</td>
                <td className={styles.td}>{overall.toLocaleString("ru-RU")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default TopArtistsPage