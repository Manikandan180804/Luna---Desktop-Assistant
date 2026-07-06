import React, { useState, useMemo } from 'react'
import { Plus, Search, Trash2, Mail, Phone, User, Briefcase, FileText, Edit2, X, Check } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { toast } from '../components/Toast'

export default function ContactsPage() {
  const { contacts, saveContacts } = useApp()
  const [searchQuery, setSearchQuery] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)

  // Form states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [notes, setNotes] = useState('')

  const filteredContacts = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return contacts.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q)
    )
  }, [contacts, searchQuery])

  const resetForm = () => {
    setName('')
    setEmail('')
    setPhone('')
    setCompany('')
    setNotes('')
    setIsAdding(false)
    setEditingId(null)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }

    let updated
    if (editingId) {
      updated = contacts.map(c =>
        c.id === editingId
          ? { ...c, name: name.trim(), email: email.trim(), phone: phone.trim(), company: company.trim(), notes: notes.trim() }
          : c
      )
      toast.success('Contact updated')
    } else {
      const newContact = {
        id: Date.now().toString(),
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        company: company.trim(),
        notes: notes.trim(),
        createdAt: new Date().toISOString()
      }
      updated = [newContact, ...contacts]
      toast.success('Contact added')
    }

    await saveContacts(updated)
    resetForm()
  }

  const handleEdit = (contact) => {
    setEditingId(contact.id)
    setName(contact.name)
    setEmail(contact.email)
    setPhone(contact.phone)
    setCompany(contact.company)
    setNotes(contact.notes || '')
    setIsAdding(true)
  }

  const handleDelete = async (id) => {
    const updated = contacts.filter(c => c.id !== id)
    await saveContacts(updated)
    toast.success('Contact deleted')
  }

  const handleEmail = async (contactEmail) => {
    if (!contactEmail) return
    const success = await window.luna.openExternal(`mailto:${contactEmail}`)
    if (!success) {
      toast.error('Failed to launch email application')
    }
  }

  const getInitials = (n) => {
    return n
      .split(' ')
      .map(part => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  // Generate a distinct gradient for avatars based on name length
  const getAvatarGradient = (n) => {
    const gradients = [
      'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
      'linear-gradient(135deg, #4E54C8 0%, #8F94FB 100%)',
      'linear-gradient(135deg, #11998E 0%, #38EF7D 100%)',
      'linear-gradient(135deg, #FC466B 0%, #3F5EFB 100%)',
      'linear-gradient(135deg, #1F1C2C 0%, #928DAB 100%)',
      'linear-gradient(135deg, #00C6FF 0%, #0072FF 100%)',
    ]
    return gradients[n.length % gradients.length]
  }

  return (
    <div className="page">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1>Contacts</h1>
          <p>Manage your address book locally and launch actions directly.</p>
        </div>
        {!isAdding && (
          <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
            <Plus size={14} /> Add Contact
          </button>
        )}
      </div>

      {isAdding ? (
        <form onSubmit={handleSave} className="card fade-in" style={{ maxWidth: 600, margin: '0 auto' }}>
          <div className="settings-section-title" style={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
            <span>{editingId ? 'Edit Contact' : 'New Contact'}</span>
            <button type="button" className="btn btn-icon btn-ghost" onClick={resetForm}>
              <X size={16} />
            </button>
          </div>
          <div className="flex flex-col gap-4" style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Full Name *</label>
              <div className="flex gap-2 items-center">
                <User size={16} style={{ color: 'var(--text-muted)' }} />
                <input
                  className="input-field"
                  style={{ flex: 1 }}
                  placeholder="e.g. Rishi Vardhan"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Email Address</label>
              <div className="flex gap-2 items-center">
                <Mail size={16} style={{ color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  className="input-field"
                  style={{ flex: 1 }}
                  placeholder="e.g. rishi@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Phone Number</label>
              <div className="flex gap-2 items-center">
                <Phone size={16} style={{ color: 'var(--text-muted)' }} />
                <input
                  className="input-field"
                  style={{ flex: 1 }}
                  placeholder="e.g. +1 555-0199"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Company / Org</label>
              <div className="flex gap-2 items-center">
                <Briefcase size={16} style={{ color: 'var(--text-muted)' }} />
                <input
                  className="input-field"
                  style={{ flex: 1 }}
                  placeholder="e.g. Acme Corp"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Notes</label>
              <div className="flex gap-2 items-start">
                <FileText size={16} style={{ color: 'var(--text-muted)', marginTop: 8 }} />
                <textarea
                  className="input-field"
                  style={{ flex: 1, minHeight: 80, resize: 'vertical' }}
                  placeholder="Additional context or preferences..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end" style={{ marginTop: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                <Check size={14} /> Save Contact
              </button>
            </div>
          </div>
        </form>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="flex gap-2 items-center">
              <Search size={16} style={{ color: 'var(--text-muted)' }} />
              <input
                className="input-field"
                style={{ flex: 1 }}
                placeholder="Search contacts by name, email, or company..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {filteredContacts.length === 0 ? (
            <div className="empty-state">
              <User size={40} />
              <p>No contacts found.</p>
            </div>
          ) : (
            <div className="grid-2" style={{ gap: 12 }}>
              {filteredContacts.map(contact => (
                <div key={contact.id} className="card fade-in" style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 14 }}>
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: '50%',
                      background: getAvatarGradient(contact.name),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 14,
                      textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                    }}
                  >
                    {getInitials(contact.name)}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {contact.name}
                      {contact.company && (
                        <span style={{ fontSize: 10, fontWeight: 500, padding: '1px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: 10, color: 'var(--text-secondary)' }}>
                          {contact.company}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
                      {contact.email && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Mail size={11} /> {contact.email}
                        </div>
                      )}
                      {contact.phone && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Phone size={11} /> {contact.phone}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1" style={{ alignSelf: 'center' }}>
                    {contact.email && (
                      <button className="btn btn-icon btn-ghost" onClick={() => handleEmail(contact.email)} title="Send Email">
                        <Mail size={13} color="var(--primary)" />
                      </button>
                    )}
                    <button className="btn btn-icon btn-ghost" onClick={() => handleEdit(contact)} title="Edit Contact">
                      <Edit2 size={13} />
                    </button>
                    <button className="btn btn-icon btn-ghost" onClick={() => handleDelete(contact.id)} title="Delete Contact">
                      <Trash2 size={13} color="var(--danger)" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
