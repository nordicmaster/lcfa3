import { useCallback, useEffect, useState } from 'react'

type Tag = [string, number]

interface IgnoredTag {
  id: number
  name: string
}

function ArtistTagsPage() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tags, setTags] = useState<Tag[] | null>(null)

  const [ignoredTags, setIgnoredTags] = useState<IgnoredTag[]>([])
  const [ignoredLoading, setIgnoredLoading] = useState(false)
  const [ignoredError, setIgnoredError] = useState<string | null>(null)
  const [ignoredName, setIgnoredName] = useState('')
  const [addingIgnored, setAddingIgnored] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [showIgnored, setShowIgnored] = useState(false)

  const loadIgnoredTags = useCallback(async () => {
    setIgnoredLoading(true)
    setIgnoredError(null)
    try {
      const res = await fetch('/api/v1/artists/tags/ignored')
      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(errorText || `HTTP ${res.status}`)
      }
      const data: IgnoredTag[] = await res.json()
      setIgnoredTags(data)
    } catch (err) {
      setIgnoredError((err as Error).message)
    } finally {
      setIgnoredLoading(false)
    }
  }, [])

  useEffect(() => {
    loadIgnoredTags()
  }, [loadIgnoredTags])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)
    setTags(null)

    try {
      const params = new URLSearchParams({ name: trimmed })
      const res = await fetch(`/api/v1/artists/tags?${params.toString()}`)
      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(errorText || `HTTP ${res.status}`)
      }
      const data: Tag[] = await res.json()
      setTags(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddIgnored = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = ignoredName.trim()
    if (!trimmed || addingIgnored) return

    if (ignoredTags.some((t) => t.name === trimmed)) return

    setAddingIgnored(true)
    setIgnoredError(null)
    try {
      const res = await fetch('/api/v1/artists/tags/ignored', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(errorText || `HTTP ${res.status}`)
      }
      const created: IgnoredTag = await res.json()
      setIgnoredTags((prev) => [...prev, created])
      setIgnoredName('')
    } catch (err) {
      setIgnoredError((err as Error).message)
    } finally {
      setAddingIgnored(false)
    }
  }

  const handleIgnoreTag = async (tag: string) => {
    if (ignoredTags.some((t) => t.name === tag)) return
    try {
      const res = await fetch('/api/v1/artists/tags/ignored', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tag }),
      })
      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(errorText || `HTTP ${res.status}`)
      }
      const created: IgnoredTag = await res.json()
      setIgnoredTags((prev) => [...prev, created])
    } catch (err) {
      setIgnoredError((err as Error).message)
    }
  }

  const handleRemoveIgnored = async (id: number) => {
    if (removingId !== null) return
    setRemovingId(id)
    setIgnoredError(null)
    try {
      const res = await fetch(`/api/v1/artists/tags/ignored/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(errorText || `HTTP ${res.status}`)
      }
      setIgnoredTags((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      setIgnoredError((err as Error).message)
    } finally {
      setRemovingId(null)
    }
  }
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Artist Tags</h1>

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Artist name"
          style={styles.input}
          required
        />
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? 'Loading...' : 'Get Tags'}
        </button>
      </form>

      {error && <div style={styles.messageError}>Error: {error}</div>}

      {tags !== null && tags.length === 0 && !error && (
        <div style={styles.messageInfo}>No tags found for "{name.trim()}".</div>
      )}

      {tags !== null && tags.length > 0 && (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Tag</th>
              <th style={styles.th}>Count</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {tags.map(([tag, count]) => (
              <tr key={tag}>
                <td style={styles.td}>{tag}</td>
                <td style={styles.td}>{count.toLocaleString("ru-RU")}</td>
                <td style={styles.tdCenter}>
                  <button
                    style={styles.ignoreButton}
                    onClick={() => handleIgnoreTag(tag)}
                    disabled={ignoredTags.some((t) => t.name === tag)}
                  >
                    {ignoredTags.some((t) => t.name === tag) ? 'Ignored' : 'Ignore'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={styles.section}>
        <button type="button" style={styles.sectionToggle} onClick={() => setShowIgnored((prev) => !prev)}>
          {showIgnored ? '▾' : '▸'} Ignored Tags
        </button>

        {showIgnored && (
          <div style={styles.sectionInner}>
            <form onSubmit={handleAddIgnored} style={styles.form}>
              <input
                type="text"
                value={ignoredName}
                onChange={(e) => setIgnoredName(e.target.value)}
                placeholder="Tag name to ignore"
                style={styles.input}
              />
              <button type="submit" style={styles.button} disabled={addingIgnored}>
                {addingIgnored ? 'Adding...' : 'Add to Ignored'}
              </button>
            </form>

            {ignoredError && <div style={styles.messageError}>Error: {ignoredError}</div>}

            {ignoredLoading && <div style={styles.messageInfo}>Loading ignored tags...</div>}

            {!ignoredLoading && ignoredTags.length === 0 && (
              <div style={styles.messageInfo}>No ignored tags yet.</div>
            )}

            {!ignoredLoading && ignoredTags.length > 0 && (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Tag</th>
                    <th style={styles.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {ignoredTags.map((t) => (
                    <tr key={t.id}>
                      <td style={styles.td}>{t.name}</td>
                      <td style={styles.tdCenter}>
                        <button
                          style={styles.removeButton}
                          onClick={() => handleRemoveIgnored(t.id)}
                          disabled={removingId !== null}
                        >
                          {removingId === t.id ? 'Removing...' : 'Remove'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
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
    marginBottom: 8,
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
  tdCenter: {
    border: '1px solid #ccc',
    padding: '8px 12px',
    textAlign: 'center',
    width: 120,
  },
  ignoreButton: {
    padding: '6px 12px',
    fontSize: 14,
    border: 'none',
    borderRadius: 4,
    background: '#007bff',
    color: '#fff',
    cursor: 'pointer',
  },
  removeButton: {
    padding: '6px 12px',
    fontSize: 14,
    border: 'none',
    borderRadius: 4,
    background: '#dc3545',
    color: '#fff',
    cursor: 'pointer',
  },
  section: {
    marginTop: 32,
    padding: '16px',
    border: '1px solid #ccc',
    borderRadius: 8,
  },
  sectionToggle: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: 0,
    border: 'none',
    background: 'transparent',
    fontSize: 18,
    fontWeight: 600,
    color: '#333',
    cursor: 'pointer',
    marginBottom: 16,
  },
  sectionInner: {
    marginTop: 8,
  },
}

export default ArtistTagsPage