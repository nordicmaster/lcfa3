import { useEffect, useState } from 'react'

interface Artist {
  id: number
  name: string
  listeners: number
  scrobbles: number
  ratio: number
  created_at: string
  updated_at: string
}

function App() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/v1/artists')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setArtists(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) return <div style={styles.center}>Loading artists...</div>
  if (error) return <div style={styles.center}>Error: {error}</div>

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Artists</h1>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Listeners</th>
            <th style={styles.th}>Scrobbles</th>
            <th style={styles.th}>Ratio</th>
          </tr>
        </thead>
        <tbody>
          {artists.map((artist) => (
            <tr key={artist.id}>
              <td style={styles.td}>{artist.id}</td>
              <td style={styles.td}>{artist.name}</td>
              <td style={styles.td}>{artist.listeners.toLocaleString()}</td>
              <td style={styles.td}>{artist.scrobbles.toLocaleString()}</td>
              <td style={styles.td}>{artist.ratio.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
  center: {
    textAlign: 'center',
    marginTop: 48,
    fontSize: 18,
  },
}

export default App