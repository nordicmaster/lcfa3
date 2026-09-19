import { useState } from 'react'

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
    <div style={styles.container}>
      <h1 style={styles.title}>Top Artists</h1>

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Last.fm username"
          style={styles.input}
          required
        />
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          style={styles.select}
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value} style={styles.option}>
              {p.label}
            </option>
          ))}
        </select>
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? 'Loading...' : 'Get Top Artists'}
        </button>
      </form>

      {error && <div style={styles.messageError}>Error: {error}</div>}

      {artists !== null && artists.length === 0 && !error && (
        <div style={styles.messageInfo}>No artists found for &quot;{name.trim()}&quot;.</div>
      )}

      {artists !== null && artists.length > 0 && (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>#</th>
              <th style={styles.th}>Artist</th>
              <th style={styles.th}>Period playcount</th>
              <th style={styles.th}>Overall scrobbles</th>
            </tr>
          </thead>
          <tbody>
            {artists.map(([artist, playcount, overall], index) => (
              <tr key={artist}>
                <td style={styles.td}>{index + 1}</td>
                <td style={styles.td}>{artist}</td>
                <td style={styles.td}>{playcount.toLocaleString("ru-RU")}</td>
                <td style={styles.td}>{overall.toLocaleString("ru-RU")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 900,
    margin: '40px auto',
    fontFamily: 'system-ui, sans-serif',
    padding: '0 16px',
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
  },
  form: {
    display: 'flex',
    gap: 12,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    padding: '10px 12px',
    fontSize: 16,
    border: '1px solid #ccc',
    borderRadius: 4,
  },
  select: {
    padding: '10px 12px',
    fontSize: 16,
    border: '1px solid #ccc',
    borderRadius: 4,
    background: '#fff',
    color: '#000',
  },
  option: {
    background: '#fff',
    color: '#000',
  },
  button: {
    padding: '10px 20px',
    fontSize: 16,
    border: 'none',
    borderRadius: 4,
    background: '#28a745',
    color: '#fff',
    cursor: 'pointer',
  },
  messageError: {
    padding: '10px 12px',
    marginBottom: 16,
    background: '#f8d7da',
    color: '#721c24',
    border: '1px solid #f5c6cb',
    borderRadius: 4,
  },
  messageInfo: {
    padding: '10px 12px',
    marginBottom: 16,
    background: '#fff3cd',
    color: '#856404',
    border: '1px solid #ffeeba',
    borderRadius: 4,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    border: '1px solid #ccc',
    padding: '10px 12px',
    background: '#f5f5f5',
    textAlign: 'left',
    fontWeight: 600,
  },
  td: {
    border: '1px solid #ccc',
    padding: '8px 12px',
  },
}

export default TopArtistsPage