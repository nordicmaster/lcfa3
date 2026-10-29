import { useCallback, useEffect, useState } from 'react'
import commonStyles from './common.module.css'

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
    <div className={commonStyles.container}>
      <h1 className={commonStyles.title}>Artist Tags</h1>

      <form onSubmit={handleSubmit} className={commonStyles.form}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Artist name"
          className={commonStyles.input}
          required
        />
        <button type="submit" className={commonStyles.button} disabled={loading}>
          {loading ? 'Loading...' : 'Get Tags'}
        </button>
      </form>

      {error && <div className={commonStyles.messageError}>Error: {error}</div>}

      {tags !== null && tags.length === 0 && !error && (
        <div className={commonStyles.messageInfo}>No tags found for "{name.trim()}".</div>
      )}

      {tags !== null && tags.length > 0 && (
        <table className={commonStyles.table}>
          <thead>
            <tr>
              <th className={commonStyles.th}>Tag</th>
              <th className={commonStyles.th}>Count</th>
              <th className={commonStyles.th}></th>
            </tr>
          </thead>
          <tbody>
            {tags.map(([tag, count]) => (
              <tr key={tag}>
                <td className={commonStyles.td}>{tag}</td>
                <td className={commonStyles.td}>{count.toLocaleString("ru-RU")}</td>
                <td className={commonStyles.tdCenter}>
                  <button
                    className={commonStyles.ignoreButton}
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

      <div className={commonStyles.section}>
        <button type="button" className={commonStyles.sectionToggle} onClick={() => setShowIgnored((prev) => !prev)}>
          {showIgnored ? '▾' : '▸'} Ignored Tags
        </button>

        {showIgnored && (
          <div className={commonStyles.sectionInner}>
            <form onSubmit={handleAddIgnored} className={commonStyles.form}>
              <input
                type="text"
                value={ignoredName}
                onChange={(e) => setIgnoredName(e.target.value)}
                placeholder="Tag name to ignore"
                className={commonStyles.input}
              />
              <button type="submit" className={commonStyles.button} disabled={addingIgnored}>
                {addingIgnored ? 'Adding...' : 'Add to Ignored'}
              </button>
            </form>

            {ignoredError && <div className={commonStyles.messageError}>Error: {ignoredError}</div>}

            {ignoredLoading && <div className={commonStyles.messageInfo}>Loading ignored tags...</div>}

            {!ignoredLoading && ignoredTags.length === 0 && (
              <div className={commonStyles.messageInfo}>No ignored tags yet.</div>
            )}

            {!ignoredLoading && ignoredTags.length > 0 && (
              <table className={commonStyles.table}>
                <thead>
                  <tr>
                    <th className={commonStyles.th}>Tag</th>
                    <th className={commonStyles.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {ignoredTags.map((t) => (
                    <tr key={t.id}>
                      <td className={commonStyles.td}>{t.name}</td>
                      <td className={commonStyles.tdCenter}>
                        <button
                          className={commonStyles.removeButton}
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

export default ArtistTagsPage