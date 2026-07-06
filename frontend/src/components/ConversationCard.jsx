import React from 'react'
import { MessageSquare, Trash2 } from 'lucide-react'

export default function ConversationCard({ conversation, onOpen, onDelete }) {
  const preview = conversation.messages?.at(-1)?.content?.slice(0, 90) ?? 'No messages yet'
  
  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return ''
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  return (
    <button className="conversation-card" onClick={() => onOpen(conversation.id)}>
      <MessageSquare size={16} className="text-muted" style={{ marginRight: 4 }} />
      <div className="conversation-card-main">
        <span className="conversation-card-title">{conversation.title || 'Untitled Chat'}</span>
        <span className="conversation-card-preview">{preview}</span>
      </div>
      <span className="badge" style={{ marginRight: 8 }}>{conversation.messages?.length || 0}</span>
      <span className="text-xs text-muted" style={{ marginRight: 8 }}>{formatDate(conversation.updatedAt)}</span>
      <button 
        className="btn btn-icon btn-ghost" 
        style={{ width: 28, height: 28 }}
        onClick={(e) => { 
          e.stopPropagation()
          onDelete(conversation.id) 
        }}
        title="Delete conversation"
      >
        <Trash2 size={13} color="var(--danger)" />
      </button>
    </button>
  )
}
