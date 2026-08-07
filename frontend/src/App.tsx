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

  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  const loadArtists = () => {
    setLoading(true)
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
  }

  useEffect(() => {
    loadArtists()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    setSubmitting(true)
    setMessage(null)

    try {
      const res = await fetch('/api/v1/artists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(errorText || `HTTP ${res.status}`)
      }
      const artist: Artist = await res.json()

      const existed = artists.some((a) => a.name === artist.name)
      setMessageType('success')
      setMessage(
        existed
          ? `Artist "${artist.name}" already existed — row overridden.`
          : `Artist "${artist.name}" created.`,
      )
      setName('')
      loadArtists()
    } catch (err) {
      setMessageType('error')
      setMessage(`Failed to save artist: ${(err as Error).message}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div style={styles.center}>Loading artists...</div>
  if (error) return <div style={styles.center}>Error: {error}</div>

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Artists</h1>

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Artist name"
          style={styles.input}
          required
        />
        <button type="submit" style={styles.button} disabled={submitting}>
          {submitting ? 'Saving...' : 'Create / Override'}
        </button>
      </form>

      {message && (
        <div
          style={
            messageType === 'success' ? styles.messageSuccess : styles.messageError
          }
        >
          {message}
        </div>
      )}

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
              <td style={styles.td}>{artist.listeners.toLocaleString("ru-RU")}</td>
              <td style={styles.td}>{artist.scrobbles.toLocaleString("ru-RU")}</td>
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
    background: '#007bff',
    color: '#fff',
    cursor: 'pointer',
  },
  messageSuccess: {
    padding: '10px 12px',
    marginBottom: 16,
    background: '#d4edda',
    color: '#155724',
    border: '1px solid #c3e6cb',
    borderRadius: 4,
  },
  messageError: {
    padding: '10px 12px',
    marginBottom: 16,
    background: '#f8d7da',
    color: '#721c24',
    border: '1px solid #f5c6cb',
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
  center: {
    textAlign: 'center',
    marginTop: 48,
    fontSize: 18,
  },
}

export default App