import { useState } from 'react'
import commonStyles from './common.module.css'

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
    <div className={commonStyles.container}>
      <h1 className={commonStyles.title}>Last Week Artists</h1>

      <form onSubmit={handleSubmit} className={commonStyles.form}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Last.fm username"
          className={commonStyles.input}
          required
        />
        <button type="submit" className={commonStyles.button} disabled={loading}>
          {loading ? 'Loading...' : 'Get Last Week'}
        </button>
      </form>

      {error && <div className={commonStyles.messageError}>Error: {error}</div>}

      {artists !== null && artists.length === 0 && !error && (
        <div className={commonStyles.messageInfo}>No artists found for "{name.trim()}".</div>
      )}

      {artists !== null && artists.length > 0 && (
        <table className={commonStyles.table}>
          <thead>
            <tr>
              <th className={commonStyles.th}>Artist</th>
              <th className={commonStyles.th}>Playcount</th>
            </tr>
          </thead>
          <tbody>
            {artists.map(([artist, playcount]) => (
              <tr key={artist}>
                <td className={commonStyles.td}>{artist}</td>
                <td className={commonStyles.td}>{playcount.toLocaleString("ru-RU")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default LastWeekPage