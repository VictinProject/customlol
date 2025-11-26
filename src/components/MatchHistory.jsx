import { useEffect, useMemo, useState } from 'react'
import { addMatch, addPlayer, findPlayerByName, getMatches, getPlayers, updatePlayer } from '../state/store'
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

function usePlayers() {
  const [players, setPlayers] = useState(getPlayers())
  useEffect(() => {
    // Lightweight refresh on visibility changes (since we use localStorage)
    const onFocus = () => setPlayers(getPlayers())
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])
  return [players, setPlayers]
}

async function filesToDataUrls(files) {
  const toDataUrl = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.readAsDataURL(file)
    })
  const arr = Array.from(files || [])
  return Promise.all(arr.map(toDataUrl))
}

export default function MatchHistory() {
  const [players] = usePlayers()
  const [matches, setMatches] = useState(getMatches())
  const [editing, setEditing] = useState(null)
  const [openCreate, setOpenCreate] = useState(false)

  const [name, setName] = useState('')
  const [dateTime, setDateTime] = useState(() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16) // for datetime-local
  })
  const [duration, setDuration] = useState(30)
  const [teamAName, setTeamAName] = useState("Équipe A")
  const [teamBName, setTeamBName] = useState("Équipe B")

  const [teamA, setTeamA] = useState([])
  const [teamB, setTeamB] = useState([])

  const [imageFiles, setImageFiles] = useState([])
  const [previewUrls, setPreviewUrls] = useState([])

  useEffect(() => {
    const urls = []
    for (const f of imageFiles) {
      const u = URL.createObjectURL(f)
      urls.push(u)
    }
    setPreviewUrls(urls)
    return () => urls.forEach(u => URL.revokeObjectURL(u))
  }, [imageFiles])

  const addToTeam = (teamSetter, playerName, matchRating) => {
    if (!playerName) return
    const existing = findPlayerByName(playerName) || addPlayer({ name: playerName, baseRating: matchRating || 3 })
    teamSetter(prev => {
      // avoid duplicates
      if (prev.some(p => p.id === existing.id)) {
        return prev.map(p => p.id === existing.id ? { ...p, matchRating } : p)
      }
      return [...prev, { id: existing.id, name: existing.name, matchRating }]
    })
  }

  const removeFromTeam = (teamSetter, id) => {
    teamSetter(prev => prev.filter(p => p.id !== id))
  }

  async function onCreateMatch() {
    if (!name.trim()) return
    const imgs = await filesToDataUrls(imageFiles)
    const id = (crypto?.randomUUID && crypto.randomUUID()) || String(Date.now() + Math.random())

    const playerRatings = {}
    for (const p of teamA) if (p.matchRating) playerRatings[p.id] = Number(p.matchRating)
    for (const p of teamB) if (p.matchRating) playerRatings[p.id] = Number(p.matchRating)

    const match = {
      id,
      name: name.trim(),
      dateTimeISO: new Date(dateTime).toISOString(),
      durationMinutes: Number(duration),
      teamA: { name: teamAName.trim() || "Équipe A", playerIds: teamA.map(p => p.id) },
      teamB: { name: teamBName.trim() || "Équipe B", playerIds: teamB.map(p => p.id) },
      playerRatings,
      images: imgs,
    }

    addMatch(match)
    setMatches(getMatches())

    // reset form
    setName('')
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    setDateTime(d.toISOString().slice(0, 16))
    setDuration(30)
    setTeamAName("Équipe A")
    setTeamBName("Équipe B")
    setTeamA([])
    setTeamB([])
    setImageFiles([])
    setPreviewUrls([])
  }

  const playerOptions = useMemo(() => players.map(p => p.name), [players])

  return (
    <div className="grid accent-history">
      <section className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ marginTop: 0, marginBottom: 0 }}>Créer une partie</h2>
          <button className="btn" onClick={() => setOpenCreate(v => !v)}>{openCreate ? 'Masquer' : 'Afficher'}</button>
        </div>
        {openCreate && (
        <>
        <div className="grid grid-2">
          <div className="field">
            <label>Nom de la partie</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: ARAM de 22h" />
          </div>
          <div className="field">
            <label>Date et heure</label>
            <input type="datetime-local" value={dateTime} onChange={e => setDateTime(e.target.value)} />
          </div>
          <div className="field">
            <label>Durée (minutes)</label>
            <input type="number" min={1} value={duration} onChange={e => setDuration(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-2" style={{ marginTop: 12 }}>
          <div className="field">
            <label>Nom équipe 1</label>
            <input value={teamAName} onChange={e => setTeamAName(e.target.value)} />
          </div>
          <div className="field">
            <label>Nom équipe 2</label>
            <input value={teamBName} onChange={e => setTeamBName(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-2" style={{ marginTop: 12 }}>
          <TeamEditor
            title="Équipe 1"
            players={teamA}
            onAdd={(n, r) => addToTeam(setTeamA, n, r)}
            onRemove={(id) => removeFromTeam(setTeamA, id)}
            suggestions={playerOptions}
          />
          <TeamEditor
            title="Équipe 2"
            players={teamB}
            onAdd={(n, r) => addToTeam(setTeamB, n, r)}
            onRemove={(id) => removeFromTeam(setTeamB, id)}
            suggestions={playerOptions}
          />
        </div>

        <div className="field" style={{ marginTop: 12 }}>
          <label>Captures (images)</label>
          <input type="file" accept="image/*" multiple onChange={e => setImageFiles(Array.from(e.target.files || []))} />
          {previewUrls.length > 0 && (
            <div className="preview-images" style={{ marginTop: 8 }}>
              {previewUrls.map((u, i) => <img key={i} src={u} alt={`preview-${i}`} />)}
            </div>
          )}
        </div>

        <div className="btn-row" style={{ marginTop: 16 }}>
          <button className="btn" onClick={onCreateMatch}>Créer la partie</button>
          <button className="btn secondary" onClick={() => { setTeamA([]); setTeamB([]) }}>Réinitialiser équipes</button>
        </div>
        </>
        )}
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Historique</h2>
        <div className="grid">
          {matches.length === 0 && (
            <div className="list-item">Aucune partie enregistrée.</div>
          )}
          {matches.map(m => (
            <article key={m.id} className="card fade-in">
              <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <h3 style={{ margin: '0 0 6px' }}>{m.name}</h3>
                  <div className="team-meta">
                    <span>{new Date(m.dateTimeISO).toLocaleString()}</span>
                    <span>Durée: {m.durationMinutes} min</span>
                  </div>
                </div>
              </header>

              <div className="teams" style={{ marginTop: 12 }}>
                <TeamView
                  title={m.teamA?.name || 'Équipe A'}
                  ids={m.teamA?.playerIds || []}
                  playerRatings={m.playerRatings}
                  onEdit={(p) => setEditing(p)}
                />
                <TeamView
                  title={m.teamB?.name || 'Équipe B'}
                  ids={m.teamB?.playerIds || []}
                  playerRatings={m.playerRatings}
                  onEdit={(p) => setEditing(p)}
                />
              </div>

              {m.images?.length > 0 && (
                <div className="preview-images" style={{ marginTop: 12 }}>
                  {m.images.map((src, i) => (
                    <a key={i} href={src} target="_blank" rel="noreferrer">
                      <img src={src} alt={`match-${m.id}-${i}`} />
                    </a>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
      {editing && (
        <PlayerEditModal
          player={editing}
          onClose={() => setEditing(null)}
          onSave={(data) => {
            updatePlayer(data.id, { name: data.name, baseRating: data.baseRating })
            setMatches(getMatches())
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function TeamEditor({ title, players, onAdd, onRemove, suggestions }) {
  const [name, setName] = useState('')
  const [rating, setRating] = useState('')

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <div className="grid">
        <div className="field">
          <label>Joueur</label>
          <input list={`${title}-players`} value={name} onChange={e => setName(e.target.value)} placeholder="Nom du joueur" />
          <datalist id={`${title}-players`}>
            {suggestions.map((n, i) => <option key={i} value={n} />)}
          </datalist>
        </div>
        <div className="field">
          <label>Note (facultatif, pour cette partie)</label>
          <input className="rating-cube-input" type="number" min={1} step="1" value={rating} onChange={e => setRating(e.target.value)} placeholder="ex: 3" />
        </div>
        <div className="btn-row">
          <button className="btn" onClick={() => { onAdd(name.trim(), rating ? Number(rating) : undefined); setName(''); setRating('') }}>Ajouter</button>
        </div>
      </div>

      <div className="list" style={{ marginTop: 12 }}>
        {players.map(p => (
          <div key={p.id} className="list-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <strong>{p.name}</strong>
              {typeof p.matchRating === 'number' && <span className="badge">note: {p.matchRating}</span>}
            </div>
            <button className="btn ghost" onClick={() => onRemove(p.id)}>Retirer</button>
          </div>
        ))}
        {players.length === 0 && <div className="list-item">Aucun joueur dans {title}.</div>}
      </div>
    </div>
  )
}

function TeamView({ title, ids, playerRatings, onEdit }) {
  const players = getPlayers()
  const byId = Object.fromEntries(players.map(p => [p.id, p]))
  return (
    <div className="card">
      <h4 style={{ margin: '0 0 8px' }}>{title}</h4>
      <div className="list">
        {ids.map(id => {
          const p = byId[id]
          if (!p) return null
          const r = playerRatings?.[id]
          return (
            <div key={id} className="list-item">
              <span>{p.name}</span>
              <div className="btn-row">
                {typeof r === 'number' ? (
                  <span className="rating-cube" style={{ background: colorForRating(r) }}>{r}</span>
                ) : (
                  <span className="rating-cube" style={{ background: colorForRating(p.baseRating) }}>{p.baseRating}</span>
                )}
                {onEdit && (
                  <button className="btn ghost" title="Modifier" onClick={() => onEdit({ id: p.id, name: p.name, baseRating: p.baseRating })}>✏️</button>
                )}
              </div>
            </div>
          )
        })}
        {ids.length === 0 && <div className="list-item">Aucun joueur.</div>}
      </div>
    </div>
  )
}