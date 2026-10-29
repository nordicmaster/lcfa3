import { useState } from 'react'
import commonStyles from './common.module.css'

type UserTag = [string, number]

const PERIODS = [
  { value: 'overall', label: 'Overall' },
  { value: '7day', label: 'Last 7 days' },
  { value: '1month', label: 'Last month' },
  { value: '3month', label: 'Last 3 months' },
  { value: '6month', label: 'Last 6 months' },
  { value: '12month', label: 'Last 12 months' },
]

function UserTopTagsPage() {
  const [name, setName] = useState('')
  const [period, setPeriod] = useState('overall')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tags, setTags] = useState<UserTag[] | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)
    setTags(null)

    try {
      const params = new URLSearchParams({ period })
      const res = await fetch(`/api/v1/user_stats/top_tags?${params.toString()}`, {
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
        setTags(data as UserTag[])
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={commonStyles.container}>
      <h1 className={commonStyles.title}>User Top Tags</h1>

      <form onSubmit={handleSubmit} className={commonStyles.form}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Last.fm username"
          className={commonStyles.input}
          required
        />
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className={commonStyles.select}
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value} className={commonStyles.option}>
              {p.label}
            </option>
          ))}
        </select>
        <button type="submit" className={commonStyles.button} disabled={loading}>
          {loading ? 'Loading...' : 'Get Top Tags'}
        </button>
      </form>

      {error && <div className={commonStyles.messageError}>Error: {error}</div>}

      {tags !== null && tags.length === 0 && !error && (
        <div className={commonStyles.messageInfo}>No tags found for &quot;{name.trim()}&quot;.</div>
      )}

      {tags !== null && tags.length > 0 && (
        <table className={commonStyles.table}>
          <thead>
            <tr>
              <th className={commonStyles.th}>#</th>
              <th className={commonStyles.th}>Tag</th>
              <th className={commonStyles.th}>Share</th>
            </tr>
          </thead>
          <tbody>
            {tags.map(([tag, share], index) => (
              <tr key={tag}>
                <td className={commonStyles.td}>{index + 1}</td>
                <td className={commonStyles.td}>{tag}</td>
                <td className={commonStyles.td}>{share.toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default UserTopTagsPage