import React from 'react'
import {
  CheckCircle, XCircle, Clock, FolderOpen, Search, FileText,
  Bell, ExternalLink, Play, Loader, AlertCircle, ChevronRight,
  Folder, File, HardDrive
} from 'lucide-react'

const STATUS_ICON = {
  pending:  <Loader size={15} className="spin" />,
  success:  <CheckCircle size={15} style={{ color: 'var(--accent)' }} />,
  error:    <XCircle size={15} style={{ color: 'var(--danger)' }} />,
  info:     <AlertCircle size={15} style={{ color: '#f59e0b' }} />,
}

const ACTION_META = {
  SUMMARIZE_PDF:    { icon: FileText,    color: '#6366f1', label: 'PDF Summary' },
  CREATE_REMINDER:  { icon: Bell,        color: '#f59e0b', label: 'Reminder' },
  SEARCH_FILES:     { icon: Search,      color: '#27c7b8', label: 'File Search' },
  ORGANIZE_FOLDER:  { icon: FolderOpen,  color: '#10b981', label: 'Folder Organizer' },
  OPEN_APP:         { icon: Play,        color: '#8b5cf6', label: 'App Launch' },
  OPEN_URL:         { icon: ExternalLink,color: '#3b82f6', label: 'Open Link' },
  COMPOSE_EMAIL:    { icon: FileText,    color: '#ec4899', label: 'Email Draft' },
}

// ─── Search result row ────────────────────────────────────────────────────────
function FileRow({ file, onOpen }) {
  const ext = file.name.split('.').pop().toLowerCase()
  const isDir = file.isDir
  const sizeKB = file.size ? (file.size / 1024).toFixed(1) : null
  return (
    <div
      onClick={() => onOpen && onOpen(file)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '7px 10px',
        borderRadius: 8,
        cursor: onOpen ? 'pointer' : 'default',
        transition: 'background 0.15s',
        border: '1px solid transparent',
      }}
      className="file-row-item"
    >
      {isDir
        ? <Folder size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
        : <File size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {file.name}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {file.path}
        </div>
      </div>
      {sizeKB && <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{sizeKB} KB</span>}
      {onOpen && <ChevronRight size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
    </div>
  )
}

// ─── Main ActionCard ──────────────────────────────────────────────────────────
export default function ActionCard({ action }) {
  if (!action) return null
  const {
    type,
    status = 'pending',
    label,
    detail,
    results,       // for SEARCH_FILES
    movedCount,    // for ORGANIZE_FOLDER
    dueLabel,      // for CREATE_REMINDER
    topic,         // for CREATE_REMINDER
    url,           // for OPEN_URL
    appLabel,      // for OPEN_APP
    error,
    onOpenFile,    // callback when a search result is clicked
  } = action

  const meta = ACTION_META[type] || ACTION_META.OPEN_APP
  const IconComponent = meta.icon

  return (
    <div
      className="action-card"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid ${meta.color}33`,
        borderLeft: `3px solid ${meta.color}`,
        borderRadius: 12,
        padding: '12px 14px',
        marginTop: 8,
        maxWidth: 460,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: `${meta.color}22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <IconComponent size={14} style={{ color: meta.color }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {label || meta.label}
          </div>
          {detail && (
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
              {detail}
            </div>
          )}
        </div>
        <div style={{ flexShrink: 0 }}>
          {STATUS_ICON[status] || STATUS_ICON.info}
        </div>
      </div>

      {/* Body: Status-specific content */}
      {status === 'error' && error && (
        <div style={{
          fontSize: 11, color: '#f87171',
          background: 'rgba(239,68,68,0.08)',
          borderRadius: 6, padding: '6px 8px', marginTop: 4,
        }}>
          {error}
        </div>
      )}

      {/* Reminder detail */}
      {type === 'CREATE_REMINDER' && status === 'success' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <Clock size={12} style={{ color: '#f59e0b' }} />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            Alerting you <strong style={{ color: 'var(--text-primary)' }}>{dueLabel}</strong>
            {topic ? ` – "${topic}"` : ''}
          </span>
        </div>
      )}

      {/* Folder organizer detail */}
      {type === 'ORGANIZE_FOLDER' && status === 'success' && movedCount !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <HardDrive size={12} style={{ color: '#10b981' }} />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            Moved <strong style={{ color: 'var(--text-primary)' }}>{movedCount}</strong> files into categorized subfolders
          </span>
        </div>
      )}

      {/* File search results */}
      {type === 'SEARCH_FILES' && status === 'success' && results && (
        <div style={{ marginTop: 6 }}>
          {results.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No files found matching that query.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                Found {results.length} result{results.length !== 1 ? 's' : ''}
              </div>
              <div style={{
                maxHeight: 160, overflowY: 'auto',
                display: 'flex', flexDirection: 'column', gap: 2,
                borderRadius: 8, border: '1px solid var(--border)',
                background: 'rgba(255,255,255,0.02)',
              }}>
                {results.slice(0, 8).map((file, idx) => (
                  <FileRow key={idx} file={file} onOpen={onOpenFile} />
                ))}
                {results.length > 8 && (
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', padding: '4px 0' }}>
                    + {results.length - 8} more results
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* URL opened */}
      {type === 'OPEN_URL' && status === 'success' && url && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <ExternalLink size={12} style={{ color: '#3b82f6' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {url}
          </span>
        </div>
      )}

      {/* App launched */}
      {type === 'OPEN_APP' && status === 'success' && appLabel && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <Play size={12} style={{ color: '#8b5cf6' }} />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            Launched <strong style={{ color: 'var(--text-primary)' }}>{appLabel}</strong>
          </span>
        </div>
      )}
    </div>
  )
}
