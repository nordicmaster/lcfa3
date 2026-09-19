import { useCallback, useEffect, useMemo, useState } from 'react'
import ArtistTagsPage from './ArtistTagsPage'
import LastWeekPage from './LastWeekPage'
import NavBar, { type NavItem } from './NavBar'
import TopArtistsPage from './TopArtistsPage'
import UserTopTagsPage from './UserTopTagsPage'

interface Artist {
  id: number
  name: string
  listeners: number
  scrobbles: number
  ratio: number
  created_at: string
  updated_at: string
}

type Page = 'artists' | 'tags' | 'lastWeek' | 'userTags' | 'topArtists'

const NAV_ITEMS: NavItem[] = [
  { id: 'artists', label: 'Artists' },
  { id: 'tags', label: 'Artist Tags' },
  { id: 'lastWeek', label: 'Last Week' },
  { id: 'userTags', label: 'User Top Tags' },
  { id: 'topArtists', label: 'Top Artists' },
]

function App() {
  const [page, setPage] = useState<Page>('artists')

  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)
  const [lastInsertedId, setLastInsertedId] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState('ratio')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')

  const loadArtists = useCallback(() => {
    setLoading(true)
    fetch('/api/v1/artists')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setArtists(data)
        setError(null)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (page === 'artists') {
      loadArtists()
    }
  }, [page, loadArtists])

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setOrder(order === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setOrder('desc')
    }
  }

  const sortedArtists = useMemo(() => {
    const sorted = [...artists]
    sorted.sort((a, b) => {
      const aVal = a[sortBy as keyof Artist]
      const bVal = b[sortBy as keyof Artist]
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return order === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }
      const aNum = aVal as number
      const bNum = bVal as number
      return order === 'asc' ? aNum - bNum : bNum - aNum
    })
    return sorted
  }, [artists, sortBy, order])

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/v1/artists/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(errorText || `HTTP ${res.status}`)
      }
      setMessageType('success')
      setMessage('Artist deleted.')
      loadArtists()
    } catch (err) {
      setMessageType('error')
      setMessage(`Failed to delete artist: ${(err as Error).message}`)
    }
  }

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
      setLastInsertedId(artist.id)
      setMessageType('success')
      setMessage(
        existed
          ? `Artist "${artist.name}" already existed — row overridden. Ratio: ${artist.ratio.toFixed(2)}`
          : `Artist "${artist.name}" created. Ratio: ${artist.ratio.toFixed(2)}`,
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

  return (
    <div style={styles.container}>
      <NavBar items={NAV_ITEMS} current={page} onNavigate={setPage} />

      {page === 'tags' ? (
        <ArtistTagsPage />
      ) : page === 'lastWeek' ? (
        <LastWeekPage />
      ) : page === 'userTags' ? (
        <UserTopTagsPage />
      ) : page === 'topArtists' ? (
        <TopArtistsPage />
      ) : loading ? (
        <div style={styles.center}>Loading artists...</div>
      ) : error ? (
        <div style={styles.center}>Error: {error}</div>
      ) : (
        <>
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
            <th style={styles.th}>
              <button style={styles.sortButton} onClick={() => handleSort('name')}>
                Name {sortBy === 'name' && (order === 'asc' ? '▲' : '▼')}
              </button>
            </th>
            <th style={styles.th}>
              <button style={styles.sortButton} onClick={() => handleSort('listeners')}>
                Listeners {sortBy === 'listeners' && (order === 'asc' ? '▲' : '▼')}
              </button>
            </th>
            <th style={styles.th}>
              <button style={styles.sortButton} onClick={() => handleSort('scrobbles')}>
                Scrobbles {sortBy === 'scrobbles' && (order === 'asc' ? '▲' : '▼')}
              </button>
            </th>
            <th style={styles.th}>
              <button style={styles.sortButton} onClick={() => handleSort('ratio')}>
                Ratio {sortBy === 'ratio' && (order === 'asc' ? '▲' : '▼')}
              </button>
            </th>
            <th style={styles.thNoBorder}></th>
          </tr>
        </thead>
        <tbody>
          {sortedArtists.map((artist) => (
            <tr
              key={artist.id}
              style={{
                ...styles.row,
                ...(artist.id === lastInsertedId ? styles.rowHighlighted : {}),
              }}
              onMouseEnter={() => setHoveredRow(artist.id)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              <td style={styles.td}>{artist.name}</td>
              <td style={styles.td}>{artist.listeners.toLocaleString("ru-RU")}</td>
              <td style={styles.td}>{artist.scrobbles.toLocaleString("ru-RU")}</td>
              <td style={styles.td}>{artist.ratio.toFixed(2)}</td>
              <td style={styles.tdNoBorder}>
                <button
                  style={{
                    ...styles.deleteButton,
                    ...(hoveredRow === artist.id ? styles.deleteButtonVisible : {}),
                  }}
                  onClick={() => handleDelete(artist.id)}
                  title={`Delete ${artist.name}`}
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
          </tbody>
        </table>
        </>
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
  sortButton: {
    background: 'transparent',
    border: 'none',
    padding: 0,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    color: '#333',
  },
  td: {
    border: '1px solid #ccc',
    padding: '8px 12px',
  },
  thNoBorder: {
    padding: '10px 12px',
    textAlign: 'left',
    fontWeight: 600,
  },
  tdNoBorder: {
    padding: '8px 12px',
  },
  row: {
    position: 'relative',
  },
  rowHighlighted: {
    background: '#fff3cd',
  },
  deleteButton: {
    background: 'transparent',
    border: 'none',
    color: '#dc3545',
    fontSize: 16,
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: 4,
    opacity: 0,
    transition: 'opacity 0.2s',
  },
  deleteButtonVisible: {
    opacity: 1,
  },
  center: {
    textAlign: 'center',
    marginTop: 48,
    fontSize: 18,
  },
}

export default App