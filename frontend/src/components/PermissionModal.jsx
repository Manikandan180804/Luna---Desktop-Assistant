import React, { useEffect, useRef } from 'react'
import { ShieldAlert, Check, X } from 'lucide-react'

export default function PermissionModal({ open, actionType, actionTarget, onConfirm, onCancel }) {
  const confirmBtnRef = useRef(null)

  useEffect(() => {
    if (open) {
      confirmBtnRef.current?.focus()
    }
  }, [open])

  if (!open) return null

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onCancel()
    }
  }

  // Generate a user-friendly description of the action
  const getFriendlyDesc = () => {
    switch (actionType) {
      case 'OPEN_URL':
        return `Luna wants to open your web browser to access the website: "${actionTarget}".`
      case 'MAILTO':
        return `Luna wants to open your default system email client to draft a mail to: "${actionTarget.replace('mailto:', '')}".`
      case 'APP':
        return `Luna wants to launch the local system application: "${actionTarget}".`
      default:
        return `Luna is requesting access to execute: "${actionTarget}".`
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onCancel} onKeyDown={handleKeyDown}>
      <div className="card modal-card fade-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, padding: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'start' }}>
          <div
            style={{
              padding: 8,
              background: 'rgba(255, 142, 83, 0.1)',
              borderRadius: '50%',
              color: '#ff8e53',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <ShieldAlert size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
              Security Confirmation Required
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.4 }}>
              {getFriendlyDesc()}
            </p>
          </div>
        </div>
        <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onCancel} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <X size={14} /> Deny
          </button>
          <button ref={confirmBtnRef} className="btn btn-primary" onClick={onConfirm} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Check size={14} /> Allow Access
          </button>
        </div>
      </div>
    </div>
  )
}
