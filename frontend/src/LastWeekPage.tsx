import { useState } from 'react'

type WeekArtist = [string, number]

function LastWeekPage() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [artists, setArtists] = useState<WeekArtist[] | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)
    setArtists(null)

    try {
      const res = await fetch('/api/v1/user_stats/last_week', {
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
        setArtists(data as WeekArtist[])
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Last Week Artists</h1>

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Last.fm username"
          style={styles.input}
          required
        />
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? 'Loading...' : 'Get Last Week'}
        </button>
      </form>

      {error && <div style={styles.messageError}>Error: {error}</div>}

      {artists !== null && artists.length === 0 && !error && (
        <div style={styles.messageInfo}>No artists found for "{name.trim()}".</div>
      )}

      {artists !== null && artists.length > 0 && (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Artist</th>
              <th style={styles.th}>Playcount</th>
            </tr>
          </thead>
          <tbody>
            {artists.map(([artist, playcount]) => (
              <tr key={artist}>
                <td style={styles.td}>{artist}</td>
                <td style={styles.td}>{playcount.toLocaleString("ru-RU")}</td>
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

export default LastWeekPage