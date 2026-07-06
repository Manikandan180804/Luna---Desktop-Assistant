import React, { useState, useMemo } from 'react'
import { Plus, Trash2, Calendar, MapPin, Tag, Clock, AlignLeft, X, Check, Filter } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { toast } from '../components/Toast'

export default function CalendarPage() {
  const { calendar, saveCalendar, settings } = useApp()
  const [isAdding, setIsAdding] = useState(false)
  const [filter, setFilter] = useState('upcoming') // 'today' | 'upcoming' | 'all'

  // Form states
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('Work')
  const [notes, setNotes] = useState('')

  const categories = ['Work', 'Personal', 'Meeting', 'Reminder', 'Social']

  const sortedEvents = useMemo(() => {
    // Sort chronologically
    const sorted = [...calendar].sort((a, b) => {
      const dateTimeA = new Date(`${a.date}T${a.time || '00:00'}`)
      const dateTimeB = new Date(`${b.date}T${b.time || '00:00'}`)
      return dateTimeA - dateTimeB
    })

    const nowStr = new Date().toISOString().split('T')[0]
    const today = new Date(nowStr)

    return sorted.filter(event => {
      const eventDate = new Date(event.date)
      if (filter === 'today') {
        return event.date === nowStr
      } else if (filter === 'upcoming') {
        return eventDate >= today
      }
      return true
    })
  }, [calendar, filter])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!title.trim() || !date) {
      toast.error('Title and Date are required')
      return
    }

    const newEvent = {
      id: Date.now().toString(),
      title: title.trim(),
      date,
      time: time || '12:00',
      location: location.trim(),
      category,
      notes: notes.trim(),
      createdAt: new Date().toISOString()
    }

    const updated = [newEvent, ...calendar]
    await saveCalendar(updated)
    toast.success('Event scheduled')
    
    // Automatically set a reminder timer if notifications are enabled and event is today
    const now = new Date()
    const eventTime = new Date(`${date}T${time || '12:00'}`)
    const diffMs = eventTime - now
    if (diffMs > 0 && diffMs < 86400000) { // scheduled within next 24 hours
      setTimeout(async () => {
        if (settings.notifications) {
          await window.luna.notify(`Calendar Alert: ${newEvent.title}`, `Starting at ${newEvent.time} - ${newEvent.location || ''}`)
        }
        toast.info(`EVENT ALARM: ${newEvent.title} is starting now!`)
      }, diffMs)
    }

    setTitle('')
    setDate('')
    setTime('')
    setLocation('')
    setCategory('Work')
    setNotes('')
    setIsAdding(false)
  }

  const handleDelete = async (id) => {
    const updated = calendar.filter(event => event.id !== id)
    await saveCalendar(updated)
    toast.success('Event deleted')
  }

  const formatDate = (dateStr) => {
    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }
    return new Date(dateStr).toLocaleDateString(undefined, options)
  }

  const getCategoryColor = (cat) => {
    const colors = {
      Work: '#27c7b8',
      Personal: '#8f94fb',
      Meeting: '#ff8e53',
      Reminder: '#ff6b6b',
      Social: '#38ef7d',
    }
    return colors[cat] || 'var(--primary)'
  }

  return (
    <div className="page">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1>Calendar & Schedule</h1>
          <p>Organize meetings, local tasks, and receive native alerts for scheduled events.</p>
        </div>
        {!isAdding && (
          <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
            <Plus size={14} /> Schedule Event
          </button>
        )}
      </div>

      {isAdding ? (
        <form onSubmit={handleSave} className="card fade-in" style={{ maxWidth: 600, margin: '0 auto' }}>
          <div className="settings-section-title" style={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
            <span>New Schedule Event</span>
            <button type="button" className="btn btn-icon btn-ghost" onClick={() => setIsAdding(false)}>
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-col gap-4" style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Event Title *</label>
              <div className="flex gap-2 items-center">
                <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
                <input
                  className="input-field"
                  style={{ flex: 1 }}
                  placeholder="e.g. Sync with team"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid-2" style={{ gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Date *</label>
                <input
                  type="date"
                  className="input-field"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Time</label>
                <input
                  type="time"
                  className="input-field"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Location / URL</label>
              <div className="flex gap-2 items-center">
                <MapPin size={16} style={{ color: 'var(--text-muted)' }} />
                <input
                  className="input-field"
                  style={{ flex: 1 }}
                  placeholder="e.g. Conference Room A, or Meet Link"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Category</label>
              <div className="flex gap-2 items-center">
                <Tag size={16} style={{ color: 'var(--text-muted)' }} />
                <select className="input-field" style={{ flex: 1 }} value={category} onChange={e => setCategory(e.target.value)}>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Notes</label>
              <div className="flex gap-2 items-start">
                <AlignLeft size={16} style={{ color: 'var(--text-muted)', marginTop: 8 }} />
                <textarea
                  className="input-field"
                  style={{ flex: 1, minHeight: 80, resize: 'vertical' }}
                  placeholder="Details, dial-ins, or guidelines..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end" style={{ marginTop: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsAdding(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                <Check size={14} /> Schedule Event
              </button>
            </div>
          </div>
        </form>
      ) : (
        <>
          <div className="tabs" style={{ marginBottom: 16, width: 'fit-content' }}>
            {['upcoming', 'today', 'all'].map((item) => (
              <button key={item} type="button" className={`tab ${filter === item ? 'active' : ''}`} onClick={() => setFilter(item)}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>

          {sortedEvents.length === 0 ? (
            <div className="empty-state">
              <Calendar size={40} />
              <p>No scheduled events found.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {sortedEvents.map(event => (
                <div key={event.id} className="card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: getCategoryColor(event.category),
                          display: 'inline-block'
                        }}
                      />
                      <span style={{ fontWeight: 600, fontSize: 15 }}>{event.title}</span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 500,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: 'rgba(255,255,255,0.05)',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        {event.category}
                      </span>
                    </div>
                    <button className="btn btn-icon btn-ghost" onClick={() => handleDelete(event.id)} title="Delete Event">
                      <Trash2 size={13} color="var(--danger)" />
                    </button>
                  </div>

                  <div className="flex gap-4" style={{ flexWrap: 'wrap', marginTop: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                      <Calendar size={12} style={{ color: 'var(--text-muted)' }} /> {formatDate(event.date)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                      <Clock size={12} style={{ color: 'var(--text-muted)' }} /> {event.time}
                    </div>
                    {event.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                        <MapPin size={12} style={{ color: 'var(--text-muted)' }} /> {event.location}
                      </div>
                    )}
                  </div>

                  {event.notes && (
                    <div
                      style={{
                        marginTop: 4,
                        padding: 8,
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        background: 'rgba(255,255,255,0.01)',
                        borderLeft: '2px solid var(--border)',
                        borderRadius: '0 var(--radius) var(--radius) 0'
                      }}
                    >
                      {event.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
