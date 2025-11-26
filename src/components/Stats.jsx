import { getPlayerStats, getPlayers, updatePlayer } from '../state/store'
import { useEffect, useState } from 'react'
import PlayerEditModal from './PlayerEditModal'

function colorForRating(r) {
  const v = Number(r)
  if (Number.isNaN(v)) return '#999'
  if (v <= 1) return '#16a34a'
  if (v <= 2) return '#65a30d'
  if (v <= 3) return '#f59e0b'
  if (v <= 4) return '#f97316'
  if (v <= 5) return '#ef4444'
  return '#b91c1c'
}

export default function Stats() {
  const [stats, setStats] = useState(getPlayerStats())
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    // Refresh when window regains focus to reflect external changes
    const onFocus = () => setStats(getPlayerStats())
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  function openEdit(playerId) {
    const p = getPlayers().find(x => x.id === playerId)
    if (!p) return
    setEditing({ id: p.id, name: p.name, baseRating: p.baseRating })
  }

  function saveEdit(data) {
    updatePlayer(data.id, { name: data.name, baseRating: data.baseRating })
    setStats(getPlayerStats())
    setEditing(null)
  }

  return (
    <div className="grid accent-stats">
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Statistiques des joueurs</h2>
        <div className="grid">
          {stats.length === 0 && <div className="list-item">Aucun joueur enregistré.</div>}
          {stats.map(s => (
            <article key={s.player.id} className="list-item">
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <strong>{s.player.name}</strong>
                <span style={{ color: '#666', fontSize: 12 }}>
                  Dernière partie: {s.lastPlayed ? new Date(s.lastPlayed).toLocaleString() : '—'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="rating-cube" style={{ background: colorForRating(s.avgRating) }}>{s.avgRating}</span>
                <span className="rating-cube" style={{ background: colorForRating(s.minRating) }}>{s.minRating}</span>
                <span className="rating-cube" style={{ background: colorForRating(s.maxRating) }}>{s.maxRating}</span>
                <span className="badge" style={{ background: 'var(--accent-stats)' }}>parties: {s.gamesPlayed}</span>
                <button className="btn ghost" title="Modifier" onClick={() => openEdit(s.player.id)}>✏️</button>
              </div>
            </article>
          ))}
        </div>
      </section>
      {editing && (
        <PlayerEditModal
          player={editing}
          onClose={() => setEditing(null)}
          onSave={saveEdit}
        />
      )}
    </div>
  )
}