import { useCallback, useEffect, useMemo, useState } from 'react'
import ArtistTagsPage from './ArtistTagsPage'
import LastWeekPage from './LastWeekPage'
import NavBar, { type NavItem } from './NavBar'
import TopArtistsPage from './TopArtistsPage'
import UserTopTagsPage from './UserTopTagsPage'
import styles from './App.module.css'

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

// Gradient fill for the listeners column: red (#FF9999) for small counts →
// green (#99FF99) for large counts, mapped over the decade-logarithm range
// (1..10,000,000). Anything above the cap stays at the green endpoint.
const LISTENER_LOG_MIN = 0 // 10^0 = 1
const LISTENER_LOG_MAX = 7 // 10^7 = 10 000 000
const GRADIENT_FROM = [0xff, 0x99, 0x99] // #FF9999
const GRADIENT_TO = [0x99, 0xff, 0x99] // #99FF99

function listenersBackground(listeners: number): string | undefined {
  if (listeners < 1) return undefined
  const t = Math.max(
    0,
    Math.min(
      1,
      (Math.log10(listeners) - LISTENER_LOG_MIN) /
        (LISTENER_LOG_MAX - LISTENER_LOG_MIN),
    ),
  )
  const rgb = GRADIENT_FROM.map((from, i) =>
    Math.round(from + (GRADIENT_TO[i] - from) * t),
  )
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
}

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
    <div className={styles.container}>
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
        <div className={styles.center}>Loading artists...</div>
      ) : error ? (
        <div className={styles.center}>Error: {error}</div>
      ) : (
        <>
          <h1 className={styles.title}>Artists</h1>

      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Artist name"
          className={styles.input}
          required
        />
        <button type="submit" className={styles.button} disabled={submitting}>
          {submitting ? 'Saving...' : 'Create / Override'}
        </button>
      </form>

      {message && (
        <div
          className={
            messageType === 'success' ? styles.messageSuccess : styles.messageError
          }
        >
          {message}
        </div>
      )}

      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>
              <button className={styles.sortButton} onClick={() => handleSort('name')}>
                Name {sortBy === 'name' && (order === 'asc' ? '▲' : '▼')}
              </button>
            </th>
            <th className={styles.th}>
              <button className={styles.sortButton} onClick={() => handleSort('listeners')}>
                Listeners {sortBy === 'listeners' && (order === 'asc' ? '▲' : '▼')}
              </button>
            </th>
            <th className={styles.th}>
              <button className={styles.sortButton} onClick={() => handleSort('scrobbles')}>
                Scrobbles {sortBy === 'scrobbles' && (order === 'asc' ? '▲' : '▼')}
              </button>
            </th>
            <th className={styles.th}>
              <button className={styles.sortButton} onClick={() => handleSort('ratio')}>
                Ratio {sortBy === 'ratio' && (order === 'asc' ? '▲' : '▼')}
              </button>
            </th>
            <th className={styles.thNoBorder}></th>
          </tr>
        </thead>
        <tbody>
          {sortedArtists.map((artist) => (
            <tr
              key={artist.id}
              className={
                artist.id === lastInsertedId
                  ? `${styles.row} ${styles.rowHighlighted}`
                  : styles.row
              }
              onMouseEnter={() => setHoveredRow(artist.id)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              <td className={styles.td}>{artist.name}</td>
              <td className={styles.td} style={{ background: listenersBackground(artist.listeners) }}>
                {artist.listeners.toLocaleString("ru-RU")}
              </td>
              <td className={styles.td}>{artist.scrobbles.toLocaleString("ru-RU")}</td>
              <td className={styles.td}>{artist.ratio.toFixed(2)}</td>
              <td className={styles.tdNoBorder}>
                <button
                  className={
                    hoveredRow === artist.id
                      ? `${styles.deleteButton} ${styles.deleteButtonVisible}`
                      : styles.deleteButton
                  }
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

export default App