import { useEffect, useMemo, useState } from 'react'
import { addPlayer, findPlayerByName, getPlayers, addMatch } from '../state/store'

function adjusted(r, { allowCustom, useExtended }) {
  const v = Number(r)
  if (!allowCustom) return Math.max(1, Math.min(5, v))
  return useExtended ? v : Math.min(5, v)
}

function balanceTeams(pool, opts) {
  // Greedy partition by adjusted rating, keep team sizes balanced
  const players = [...pool].map(p => ({ ...p, adj: adjusted(p.rating, opts) }))
  players.sort((a, b) => b.adj - a.adj) // place heavier first
  const a = [], b = []
  let sumA = 0, sumB = 0
  for (const p of players) {
    const capA = a.length <= b.length
    const capB = b.length <= a.length
    if ((sumA <= sumB && capA) || !capB) { a.push(p); sumA += p.adj }
    else { b.push(p); sumB += p.adj }
  }
  const avgA = a.length ? sumA / a.length : 0
  const avgB = b.length ? sumB / b.length : 0
  return { a, b, avgA, avgB, diff: Math.abs(avgA - avgB) }
}

function colorForRating(r) {
  const v = Number(r)
  if (Number.isNaN(v)) return '#999'
  if (v <= 1) return '#16a34a' // green
  if (v <= 2) return '#65a30d' // yellow-green
  if (v <= 3) return '#f59e0b' // amber
  if (v <= 4) return '#f97316' // orange
  if (v <= 5) return '#ef4444' // red
  // >5: deeper red gradient
  return '#b91c1c'
}

export default function TeamGenerator() {
  const [teamAName, setTeamAName] = useState("Équipe A")
  const [teamBName, setTeamBName] = useState("Équipe B")

  const [allowCustom, setAllowCustom] = useState(false)
  const [useExtended, setUseExtended] = useState(false)

  const [teamA, setTeamA] = useState([])
  const [teamB, setTeamB] = useState([])
  const [suggestions, setSuggestions] = useState(() => getPlayers().map(p => p.name))

  const opts = useMemo(() => ({ allowCustom, useExtended }), [allowCustom, useExtended])

  useEffect(() => {
    const refresh = () => setSuggestions(getPlayers().map(p => p.name))
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])

  function addToTeam(teamSetter, playerName, rating) {
    const n = (playerName || '').trim()
    if (!n) return
    const r = Number(rating || 3)
    const existing = findPlayerByName(n) || addPlayer({ name: n, baseRating: r })
    setSuggestions(getPlayers().map(p => p.name))
    teamSetter(prev => {
      if (prev.some(p => p.id === existing.id)) {
        return prev.map(p => p.id === existing.id ? { ...p, name: existing.name, rating: r } : p)
      }
      return [...prev, { id: existing.id, name: existing.name, rating: r }]
    })
  }

  function removeFromTeam(teamSetter, id) {
    teamSetter(prev => prev.filter(p => p.id !== id))
  }

  function rebalance() {
    const merged = [...teamA, ...teamB]
    const res = balanceTeams(merged, opts)
    setTeamA(res.a.map(x => ({ id: x.id, name: x.name, rating: x.rating })))
    setTeamB(res.b.map(x => ({ id: x.id, name: x.name, rating: x.rating })))
  }

  const [finishMsg, setFinishMsg] = useState('')

  function finishMatch() {
    if (teamA.length === 0 && teamB.length === 0) return
    const id = (crypto?.randomUUID && crypto.randomUUID()) || String(Date.now() + Math.random())
    const playerRatings = {}
    for (const p of teamA) playerRatings[p.id] = Number(p.rating)
    for (const p of teamB) playerRatings[p.id] = Number(p.rating)
    const match = {
      id,
      name: `${(teamAName || 'Équipe A').trim()} vs ${(teamBName || 'Équipe B').trim()}`,
      dateTimeISO: new Date().toISOString(),
      durationMinutes: 0,
      teamA: { name: teamAName.trim() || 'Équipe A', playerIds: teamA.map(p => p.id) },
      teamB: { name: teamBName.trim() || 'Équipe B', playerIds: teamB.map(p => p.id) },
      playerRatings,
      images: [],
    }
    addMatch(match)
    setFinishMsg('Partie enregistrée dans l\'historique.')
    setTimeout(() => setFinishMsg(''), 3500)
    // Clear teams for a new setup
    setTeamA([])
    setTeamB([])
  }

  // const avgText = (v) => v ? v.toFixed(2) : '-'

  function avgOf(list) {
    if (!list.length) return 0
    const sum = list.reduce((acc, p) => acc + adjusted(p.rating, opts), 0)
    return sum / list.length
  }

  return (
    <div className="grid accent-teams">
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Génération d'équipes</h2>
        {/* Team names are now editable inside each team panel header */}

        <div className="grid grid-2" style={{ marginTop: 12 }}>
          <div className="field">
            <label>
              <input type="checkbox" checked={allowCustom} onChange={e => { setAllowCustom(e.target.checked); if (!e.target.checked) setUseExtended(false) }} />
              {' '}Notes personnalisées (dépasser 5 autorisé)
            </label>
          </div>
          <div className="field">
            <label style={{ opacity: allowCustom ? 1 : 0.5 }}>
              <input type="checkbox" disabled={!allowCustom} checked={useExtended} onChange={e => setUseExtended(e.target.checked)} />
              {' '}Prendre en compte les notes {">"} 5 dans la moyenne
            </label>
          </div>
        </div>
        <div className="btn-row" style={{ marginTop: 12 }}>
          <button className="btn accent" type="button" onClick={rebalance}>Équilibrer automatiquement</button>
          <button className="btn secondary" type="button" onClick={finishMatch}>Terminer la partie</button>
          {finishMsg && <span style={{ color: 'var(--accent-teams)', fontSize: 12 }}>{finishMsg}</span>}
        </div>

        <div className="grid teams" style={{ marginTop: 12 }}>
          <TeamPanel
            title={teamAName}
            onChangeTitle={setTeamAName}
            players={teamA}
            allowCustom={allowCustom}
            onAdd={(n, r) => addToTeam(setTeamA, n, r)}
            onRemove={(id) => removeFromTeam(setTeamA, id)}
            onChangeRating={(id, r) => setTeamA(prev => prev.map(p => {
              if (p.id !== id) return p
              let v = Number(r)
              if (!Number.isFinite(v)) return p
              // Enforce minimum 1, cap to 5 when custom notes are disabled
              v = Math.max(1, allowCustom ? v : Math.min(5, v))
              return { ...p, rating: v }
            }))}
            avg={avgOf(teamA)}
            suggestions={suggestions}
            datalistId="teamA-players"
          />
          <TeamPanel
            title={teamBName}
            onChangeTitle={setTeamBName}
            players={teamB}
            allowCustom={allowCustom}
            onAdd={(n, r) => addToTeam(setTeamB, n, r)}
            onRemove={(id) => removeFromTeam(setTeamB, id)}
            onChangeRating={(id, r) => setTeamB(prev => prev.map(p => {
              if (p.id !== id) return p
              let v = Number(r)
              if (!Number.isFinite(v)) return p
              v = Math.max(1, allowCustom ? v : Math.min(5, v))
              return { ...p, rating: v }
            }))}
            avg={avgOf(teamB)}
            suggestions={suggestions}
            datalistId="teamB-players"
          />
        </div>
      </section>

    </div>
  )
}

function TeamPanel({ title, onChangeTitle, players, onAdd, onRemove, onChangeRating, avg, allowCustom, suggestions, datalistId }) {
  const [entry, setEntry] = useState('')
  const [editingRatings, setEditingRatings] = useState({})

  const maxAttr = allowCustom ? undefined : 5

  return (
    <div className="card team-card">
      <input
        className="team-name-input"
        value={title}
        onChange={e => onChangeTitle(e.target.value)}
        placeholder="Nom de l'équipe"
      />
      <div className="team-meta">
        <span>Moyenne: <b>{players.length ? avg.toFixed(2) : '-'}</b></span>
        <span>Joueurs: {players.length}</span>
      </div>

      <div className="grid" style={{ marginTop: 12 }}>
        <div className="field">
          <label>Ajouter (Nom | Note)</label>
          <input
            list={datalistId}
            value={entry}
            onChange={e => setEntry(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const [n, r] = String(entry).split('|')
                onAdd(n, r)
                setEntry('')
              }
            }}
            placeholder="Ex: Faker | 2"
          />
          <datalist id={datalistId}>
            {Array.isArray(suggestions) && suggestions.map((n, i) => <option key={i} value={n} />)}
          </datalist>
        </div>
        <div className="btn-row">
          <button className="btn" aria-label="Ajouter" title="Ajouter" onClick={() => { const [n, r] = String(entry).split('|'); onAdd(n, r); setEntry('') }}>+</button>
        </div>
      </div>

      <div className="list" style={{ marginTop: 12 }}>
        {players.map(p => {
          const hasEdit = Object.prototype.hasOwnProperty.call(editingRatings, p.id)
          const rawVal = hasEdit ? editingRatings[p.id] : String(p.rating)
          const displayVal = rawVal === '0' ? '' : rawVal
          const colorBase = displayVal === '' ? p.rating : Number(displayVal)
          return (
          <div key={p.id} className="list-item">
            <strong>{p.name}</strong>
            <div className="btn-row" style={{ alignItems: 'center' }}>
              <input
                className="rating-cube-input"
                title="Modifier la note"
                type="number"
                min={1}
                max={maxAttr}
                step="1"
                value={displayVal}
                onChange={e => {
                  let v = e.target.value
                  if (v === '0') v = '' // never show 0
                  setEditingRatings(prev => ({ ...prev, [p.id]: v }))
                  if (v === '') return
                  const n = Number(v)
                  if (!Number.isFinite(n)) return
                  onChangeRating(p.id, n)
                }}
                onBlur={() => {
                  setEditingRatings(prev => {
                    if (!Object.prototype.hasOwnProperty.call(prev, p.id)) return prev
                    const { [p.id]: _, ...rest } = prev
                    return rest
                  })
                }}
                style={{ background: colorForRating(colorBase) }}
              />
              <button className="btn ghost" aria-label="Retirer" title="Retirer" onClick={() => onRemove(p.id)}>−</button>
            </div>
          </div>
        )})}
        {Array.from({ length: Math.max(0, 5 - players.length) }).map((_, i) => (
          <InlineAddRow key={`ph-${i}`} datalistId={datalistId} onAdd={onAdd} />
        ))}
        {players.length === 0 && <div className="list-item">Aucun joueur.</div>}
      </div>
    </div>
  )
}

function InlineAddRow({ datalistId, onAdd }) {
  const [value, setValue] = useState('')
  return (
    <div className="list-item placeholder">
      <input
        list={datalistId}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            const [n, r] = String(value).split('|')
            onAdd(n, r)
            setValue('')
          }
        }}
        placeholder="Nom | Note"
        style={{ flex: 1 }}
      />
      <button className="btn" aria-label="Ajouter" title="Ajouter" onClick={() => { const [n, r] = String(value).split('|'); onAdd(n, r); setValue('') }}>+</button>
    </div>
  )
}