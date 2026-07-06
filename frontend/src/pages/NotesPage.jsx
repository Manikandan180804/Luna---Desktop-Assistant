import React, { useState } from 'react'
import { FileText, Plus, Trash2, Save, ArrowLeft } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { useApp } from '../context/AppContext'
import { toast } from '../components/Toast'

export default function NotesPage() {
  const { notes, saveNote, deleteNote } = useApp()
  const [active, setActive] = useState(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const openNote = (note) => {
    setActive(note)
    setTitle(note.title)
    setBody(note.body)
  }

  const newNote = () => {
    const note = {
      id: uuidv4(),
      title: 'Untitled Note',
      body: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setActive(note)
    setTitle(note.title)
    setBody(note.body)
  }

  const handleSave = async () => {
    if (!active) return
    const updated = { ...active, title: title.trim() || 'Untitled', body }
    await saveNote(updated)
    setActive(updated)
    toast.success('Note saved')
  }

  const handleDelete = async (id) => {
    await deleteNote(id)
    if (active?.id === id) {
      setActive(null)
      setTitle('')
      setBody('')
    }
    toast.success('Note deleted')
  }

  const handleExport = async () => {
    if (!active) return
    const safeTitle = (title || 'note').replace(/[\\/:*?"<>|]/g, '-')
    const ok = await window.luna.saveFileDialog(`${safeTitle}.md`, `# ${title}\n\n${body}`)
    if (ok) toast.success('Note exported')
  }

  if (active) {
    return (
      <div className="page note-editor">
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <button className="btn btn-ghost" onClick={() => setActive(null)}>
            <ArrowLeft size={14} /> Back
          </button>
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={handleExport}>
              <FileText size={13} /> Export
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              <Save size={13} /> Save
            </button>
          </div>
        </div>
        <input className="note-editor-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Note title..." />
        <textarea className="note-editor-body" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Start writing..." />
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1>Notes</h1>
          <p>Capture local drafts, summaries, and automation outputs.</p>
        </div>
        <button className="btn btn-primary" onClick={newNote}>
          <Plus size={14} /> New Note
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="empty-state">
          <FileText size={40} />
          <p>No notes yet.</p>
        </div>
      ) : (
        <div className="grid-3">
          {notes.map((note) => (
            <div key={note.id} className="note-card" onClick={() => openNote(note)}>
              <div className="note-title">{note.title}</div>
              <div className="note-preview">{note.body || 'Empty note...'}</div>
              <div className="flex items-center justify-between mt-2">
                <span className="note-date">{new Date(note.updatedAt).toLocaleDateString()}</span>
                <button className="btn btn-icon btn-ghost" onClick={(event) => { event.stopPropagation(); handleDelete(note.id) }} title="Delete note">
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
