import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Inbox } from 'lucide-react'
import { useApp } from '../context/AppContext'
import ConversationCard from '../components/ConversationCard'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import { toast } from '../components/Toast'

export default function HistoryPage() {
  const { conversations, setActiveConvId, deleteConversation } = useApp()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [range, setRange] = useState('all') // 'all' | 'today' | 'week' | 'older'
  const [sort, setSort] = useState('newest') // 'newest' | 'oldest' | 'messages'
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  // Date helper functions
  const isToday = (dateStr) => {
    const d = new Date(dateStr)
    const today = new Date()
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear()
  }

  const isThisWeek = (dateStr) => {
    const d = new Date(dateStr)
    const today = new Date()
    const diffTime = Math.abs(today - d)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= 7 && !isToday(dateStr)
  }

  const matchesRange = (conv, selectedRange) => {
    if (selectedRange === 'all') return true
    if (selectedRange === 'today') return isToday(conv.updatedAt)
    if (selectedRange === 'week') return isToday(conv.updatedAt) || isThisWeek(conv.updatedAt)
    if (selectedRange === 'older') {
      const d = new Date(conv.updatedAt)
      const today = new Date()
      const diffTime = Math.abs(today - d)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays > 7
    }
    return true
  }

  const matchesQuery = (conv, searchQuery) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    const titleMatch = (conv.title || '').toLowerCase().includes(q)
    const messageMatch = conv.messages?.some(m => (m.content || '').toLowerCase().includes(q))
    return titleMatch || messageMatch
  }

  const sortComparator = (selectedSort) => {
    return (a, b) => {
      if (selectedSort === 'newest') {
        return new Date(b.updatedAt) - new Date(a.updatedAt)
      }
      if (selectedSort === 'oldest') {
        return new Date(a.updatedAt) - new Date(b.updatedAt)
      }
      if (selectedSort === 'messages') {
        return (b.messages?.length || 0) - (a.messages?.length || 0)
      }
      return 0
    }
  }

  const filtered = useMemo(() => {
    return conversations
      .filter(c => matchesRange(c, range))
      .filter(c => matchesQuery(c, query))
      .sort(sortComparator(sort))
  }, [conversations, query, range, sort])

  const handleOpen = (id) => {
    setActiveConvId(id)
    navigate('/chat')
  }

  const handleDelete = async () => {
    if (!confirmDeleteId) return
    try {
      await deleteConversation(confirmDeleteId)
      toast.success('Conversation deleted')
    } catch {
      toast.error('Failed to delete conversation')
    } finally {
      setConfirmDeleteId(null)
    }
  }

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1>Conversation History</h1>
        <p>Search and reopen any past conversation.</p>
      </div>

      <div className="history-filters">
        <div className="history-search-wrapper">
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            className="input-field" 
            placeholder="Search conversation titles or messages..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-2 items-center">
          <div className="tabs">
            <button className={`tab ${range === 'all' ? 'active' : ''}`} onClick={() => setRange('all')}>All</button>
            <button className={`tab ${range === 'today' ? 'active' : ''}`} onClick={() => setRange('today')}>Today</button>
            <button className={`tab ${range === 'week' ? 'active' : ''}`} onClick={() => setRange('week')}>This Week</button>
            <button className={`tab ${range === 'older' ? 'active' : ''}`} onClick={() => setRange('older')}>Older</button>
          </div>

          <select 
            className="input-field" 
            style={{ width: 'auto', minHeight: 36, padding: '0 12px', fontSize: 12 }} 
            value={sort} 
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="messages">Most messages</option>
          </select>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="conversation-list">
          {filtered.map(conv => (
            <ConversationCard 
              key={conv.id} 
              conversation={conv} 
              onOpen={handleOpen} 
              onDelete={(id) => setConfirmDeleteId(id)} 
            />
          ))}
        </div>
      ) : (
        <div className="empty-state card">
          <Inbox size={48} className="text-muted" />
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>No conversations found</h3>
          <p className="text-sm">
            {conversations.length === 0 
              ? "You haven't started any conversations yet." 
              : "Try adjusting your filters or search term."}
          </p>
        </div>
      )}

      <ConfirmDeleteModal 
        open={confirmDeleteId !== null}
        title="Delete conversation?"
        desc="This will delete this conversation history. This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}
