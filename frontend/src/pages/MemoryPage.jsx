import React, { useState } from 'react'
import { Brain, Pin, Trash2, Search, Plus } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { toast } from '../components/Toast'

export default function MemoryPage() {
  const { memory, addMemory, deleteMemory, pinMemory } = useApp()
  const [search, setSearch] = useState('')
  const [newItem, setNewItem] = useState('')
  const [adding, setAdding] = useState(false)

  const filtered = memory
    .filter((item) => item.content.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))

  const handleAdd = async () => {
    if (!newItem.trim()) return
    await addMemory(newItem.trim())
    setNewItem('')
    setAdding(false)
    toast.success('Memory saved')
  }

  const handleDelete = async (id) => {
    await deleteMemory(id)
    toast.success('Memory deleted')
  }

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="page">
      <div className="page-header">
        <h1>Memory</h1>
        <p>Review the local facts Luna can use for future answers.</p>
      </div>

      <div className="flex gap-2" style={{ marginBottom: 16 }}>
        <div className="flex items-center gap-2 input-field" style={{ flex: 1, padding: '8px 12px' }}>
          <Search size={14} color="var(--text-muted)" />
          <input placeholder="Search memories..." value={search} onChange={(event) => setSearch(event.target.value)} style={{ flex: 1, fontSize: 13 }} />
        </div>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>
          <Plus size={14} /> Add
        </button>
      </div>

      {adding && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="form-group">
            <label className="input-label">New memory entry</label>
            <textarea
              className="input-field"
              rows={3}
              placeholder="Example: I prefer concise technical explanations."
              value={newItem}
              onChange={(event) => setNewItem(event.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={handleAdd}>Save Memory</button>
            <button className="btn btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state">
          <Brain size={40} />
          <p>{search ? 'No memories match your search.' : 'No memories saved yet.'}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((item) => (
            <div key={item.id} className={`memory-item ${item.pinned ? 'pinned' : ''}`}>
              {item.pinned && <Pin size={13} color="var(--accent-light)" style={{ flexShrink: 0, marginTop: 2 }} />}
              <div className="memory-content">
                <div>{item.content}</div>
                <div className="memory-meta">{formatDate(item.createdAt)}</div>
              </div>
              <div className="memory-actions">
                <button className="btn btn-icon btn-ghost" onClick={() => pinMemory(item.id)} title={item.pinned ? 'Unpin' : 'Pin'}>
                  <Pin size={13} color={item.pinned ? 'var(--accent-light)' : undefined} />
                </button>
                <button className="btn btn-icon btn-ghost" onClick={() => handleDelete(item.id)} title="Delete">
                  <Trash2 size={13} color="var(--danger)" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
