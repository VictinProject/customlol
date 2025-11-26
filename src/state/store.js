const KEY_PLAYERS = 'lol_custom_players'
const KEY_MATCHES = 'lol_custom_matches'

// --- Cookie helpers (mirror persistence) ---
function setCookie(name, value, days = 365) {
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString()
    // Encode value; guard size (approx limit ~4KB per cookie)
    const enc = encodeURIComponent(value)
    if (enc.length > 3500) {
      // Too large for a single cookie; skip cookie write (localStorage remains source of truth)
      return
    }
    document.cookie = `${name}=${enc}; expires=${expires}; path=/`;
  } catch { /* ignore */ }
}

function getCookie(name) {
  try {
    const parts = document.cookie.split(';').map(c => c.trim())
    const prefix = name + '='
    const found = parts.find(p => p.startsWith(prefix))
    if (!found) return null
    return decodeURIComponent(found.slice(prefix.length))
  } catch { return null }
}

function read(key) {
  // Prefer cookie if available
  const c = getCookie(key)
  if (c) {
    try { return JSON.parse(c) } catch { /* fall back */ }
  }
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}
function write(key, value) {
  const json = JSON.stringify(value)
  localStorage.setItem(key, json)
  setCookie(key, json)
}

export function getPlayers() {
  const players = read(KEY_PLAYERS)
  return players.sort((a, b) => a.name.localeCompare(b.name))
}

export function findPlayerByName(name) {
  if (!name) return null
  const lower = name.trim().toLowerCase()
  return getPlayers().find(p => p.name.trim().toLowerCase() === lower) || null
}

export function addPlayer({ name, baseRating = 3 }) {
  const existing = findPlayerByName(name)
  if (existing) return existing
  const id = (crypto?.randomUUID && crypto.randomUUID()) || String(Date.now() + Math.random())
  const player = { id, name: String(name).trim(), baseRating: Number(baseRating) }
  const players = getPlayers()
  players.push(player)
  write(KEY_PLAYERS, players)
  return player
}

export function updatePlayer(id, patch) {
  const players = getPlayers()
  const idx = players.findIndex(p => p.id === id)
  if (idx === -1) return null
  players[idx] = { ...players[idx], ...patch }
  write(KEY_PLAYERS, players)
  return players[idx]
}

export function getMatches() {
  const matches = read(KEY_MATCHES)
  return matches.sort((a, b) => (b.dateTimeISO || '').localeCompare(a.dateTimeISO || ''))
}

export function addMatch(match) {
  const matches = getMatches()
  matches.push(match)
  write(KEY_MATCHES, matches)
  return match
}

export function ratePlayerInMatch(matchId, playerId, rating) {
  const matches = getMatches()
  const idx = matches.findIndex(m => m.id === matchId)
  if (idx === -1) return null
  const m = { ...matches[idx] }
  m.playerRatings = m.playerRatings || {}
  m.playerRatings[playerId] = Number(rating)
  matches[idx] = m
  write(KEY_MATCHES, matches)
  return m
}

export function getPlayerStats() {
  const players = getPlayers()
  const matches = getMatches()
  const stats = players.map(p => ({
    player: p,
    gamesPlayed: 0,
    ratings: [],
    lastPlayed: null,
  }))

  const index = Object.fromEntries(stats.map(s => [s.player.id, s]))

  for (const m of matches) {
    const ids = new Set([...(m.teamA?.playerIds || []), ...(m.teamB?.playerIds || [])])
    const when = m.dateTimeISO ? new Date(m.dateTimeISO) : null
    ids.forEach(pid => {
      if (!index[pid]) return
      index[pid].gamesPlayed += 1
      const r = m.playerRatings?.[pid]
      if (typeof r === 'number') index[pid].ratings.push(r)
      if (when) {
        if (!index[pid].lastPlayed || when > new Date(index[pid].lastPlayed)) {
          index[pid].lastPlayed = when.toISOString()
        }
      }
    })
  }

  return stats.map(s => {
    const avg =
      s.ratings.length
        ? s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length
        : s.player.baseRating
    const min = s.ratings.length ? Math.min(...s.ratings) : s.player.baseRating
    const max = s.ratings.length ? Math.max(...s.ratings) : s.player.baseRating
    return {
      ...s,
      avgRating: Number(avg.toFixed(2)),
      minRating: min,
      maxRating: max,
    }
  }).sort((a, b) => a.avgRating - b.avgRating)
}

export const store = {
  getPlayers,
  findPlayerByName,
  addPlayer,
  updatePlayer,
  getMatches,
  addMatch,
  ratePlayerInMatch,
  getPlayerStats,
}