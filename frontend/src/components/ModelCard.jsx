import React from 'react'
import { Download, Trash2, Check, X } from 'lucide-react'

export default function ModelCard({ 
  model, 
  installed = false, 
  active = false, 
  pullPercent = null, 
  onDownload, 
  onUse, 
  onDelete,
  onCancel
}) {
  const { name, quality, speed, ram, bestFor } = model
  const isPulling = pullPercent !== null && pullPercent !== undefined

  return (
    <div className="model-card">
      <div>
        <div className="model-card-header">
          <span className="model-card-title">{name}</span>
          {active && (
            <span className="model-tag active" style={{ fontWeight: 600 }}>
              <Check size={11} style={{ marginRight: 2 }} /> Active
            </span>
          )}
        </div>
        
        <div className="model-card-tags">
          {ram && <span className="model-tag">RAM: {ram}</span>}
          {quality && <span className="model-tag">Quality: {quality}</span>}
          {speed && <span className="model-tag">Speed: {speed}</span>}
        </div>

        {bestFor && <p className="model-card-desc">{bestFor}</p>}
      </div>

      <div style={{ marginTop: 'auto' }}>
        {isPulling ? (
          <div className="pull-progress-container">
            <div className="pull-progress-text">
              <span>Downloading...</span>
              <span>{pullPercent}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="pull-progress-bar" style={{ flex: 1 }}>
                <div className="pull-progress-fill" style={{ width: `${pullPercent}%` }} />
              </div>
              <button 
                className="btn btn-icon btn-ghost" 
                style={{ width: 24, height: 24, borderRadius: '50%' }} 
                onClick={() => onCancel(name)}
                title="Cancel download"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="model-card-actions">
            {installed ? (
              <>
                {active ? (
                  <span className="text-xs text-muted" style={{ fontWeight: 550 }}>Active Model</span>
                ) : (
                  <button className="btn btn-secondary" style={{ padding: '6px 12px', minHeight: 30 }} onClick={() => onUse(name)}>
                    Use model
                  </button>
                )}
                {!active && (
                  <button 
                    className="btn btn-icon btn-ghost" 
                    style={{ width: 30, height: 30 }} 
                    onClick={() => onDelete(name)}
                    title="Delete model files"
                  >
                    <Trash2 size={13} color="var(--danger)" />
                  </button>
                )}
              </>
            ) : (
              <button className="btn btn-primary" style={{ padding: '6px 14px', minHeight: 30, width: '100%', justifyContent: 'center' }} onClick={() => onDownload(name)}>
                <Download size={13} /> Download
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
