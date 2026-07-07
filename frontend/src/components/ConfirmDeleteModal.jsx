import React, { useEffect, useRef } from 'react'

export default function ConfirmDeleteModal({ open, modelName, title, desc, onConfirm, onCancel }) {
  const cancelBtnRef = useRef(null)

  useEffect(() => {
    if (open) {
      cancelBtnRef.current?.focus()
    }
  }, [open])

  if (!open) return null

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onCancel()
    }
  }

  const modalTitle = modelName ? `Remove ${modelName}?` : (title || 'Are you sure?')
  const modalDesc = modelName 
    ? 'This deletes the local model files. You can re-download it later.' 
    : (desc || 'This action cannot be undone.')

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onCancel} onKeyDown={handleKeyDown}>
      <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{modalTitle}</h3>
        <p className="text-sm text-muted" style={{ marginBottom: 20 }}>{modalDesc}</p>
        <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
          <button ref={cancelBtnRef} className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
