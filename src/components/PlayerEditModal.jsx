import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export default function PlayerEditModal({ player, onClose, onSave }) {
  const [name, setName] = useState(player?.name || '')
  const [baseRating, setBaseRating] = useState(player?.baseRating ?? 3)

  useEffect(() => {
    setName(player?.name || '')
    setBaseRating(player?.baseRating ?? 3)
  }, [player])

  if (!player) return null

  const submit = (e) => {
    e?.preventDefault?.()
    const trimmed = name.trim()
    if (!trimmed) return
    onSave({ id: player.id, name: trimmed, baseRating: Number(baseRating) })
  }

  return createPortal(
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal card fade-in" style={{ maxWidth: 420, width: '100%' }}>
        <h3 style={{ marginTop: 0 }}>Modifier le joueur</h3>
        <form className="grid" onSubmit={submit}>
          <div className="field">
            <label>Nom</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du joueur" />
          </div>
          <div className="field">
            <label>Note de base (1 = + fort, 5 = - fort)</label>
            <input type="number" min={1} step="1" value={baseRating} onChange={(e) => setBaseRating(e.target.value)} />
          </div>
          <div className="btn-row" style={{ marginTop: 4 }}>
            <button className="btn" type="submit">Enregistrer</button>
            <button type="button" className="btn secondary" onClick={onClose}>Annuler</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
