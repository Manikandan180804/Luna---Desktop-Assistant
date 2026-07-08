import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  Users, Calendar, Music, Command, Mail, Globe, Plus, Search, Trash2, Phone,
  User, Briefcase, FileText, Edit2, X, Check, Clock, MapPin, Tag, Play, Pause,
  SkipForward, Volume2, ListMusic, ExternalLink, Sparkles, Home, Lightbulb,
  Power, Cpu, Radio, Sliders, Activity, Database
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { toast } from '../components/Toast'
import PermissionModal from '../components/PermissionModal'

export default function ConnectorsPage() {
  const {
    contacts, saveContacts, calendar, saveCalendar, settings, saveSettings,
    smartDevices, saveSmartDevices, controlSmartDevice, iotLogs, refreshIotLogs, clearIotLogs
  } = useApp()
  const [activeTab, setActiveTab] = useState('apps') // 'apps' | 'contacts' | 'calendar' | 'music' | 'smarthome'

  const [permissionOpen, setPermissionOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)

  // --- CONTACTS STATE ---
  const [contactSearch, setContactSearch] = useState('')
  const [isAddingContact, setIsAddingContact] = useState(false)
  const [editingContactId, setEditingContactId] = useState(null)
  const [cName, setCName] = useState('')
  const [cEmail, setCEmail] = useState('')
  const [cPhone, setCPhone] = useState('')
  const [cCompany, setCCompany] = useState('')
  const [cNotes, setCNotes] = useState('')

  // --- CALENDAR STATE ---
  const [isAddingEvent, setIsAddingEvent] = useState(false)
  const [calendarFilter, setCalendarFilter] = useState('upcoming')
  const [eTitle, setETitle] = useState('')
  const [eDate, setEDate] = useState('')
  const [eTime, setETime] = useState('')
  const [eLocation, setELocation] = useState('')
  const [eCategory, setECategory] = useState('Work')
  const [eNotes, setENotes] = useState('')

  // --- MUSIC PLAYER STATE ---
  const [playlist, setPlaylist] = useState([
    { id: '1', name: 'Ambient Chill Out', artist: 'Luna AI', duration: '3:45', url: '' },
    { id: '2', name: 'Cyberpunk Focus Beats', artist: 'Synthetic Echo', duration: '4:12', url: '' }
  ])
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)

  // --- SMART HOME STATE ---
  const [isAddingDevice, setIsAddingDevice] = useState(false)
  const [haOpen, setHaOpen] = useState(false)
  const [mqttOpen, setMqttOpen] = useState(false)
  
  // Settings values initialized with fallback
  const [haEnabled, setHaEnabled] = useState(settings?.iot?.homeAssistant?.enabled || false)
  const [haUrl, setHaUrl] = useState(settings?.iot?.homeAssistant?.url || 'http://localhost:8123')
  const [haToken, setHaToken] = useState(settings?.iot?.homeAssistant?.token || '')

  const [mqttEnabled, setMqttEnabled] = useState(settings?.iot?.mqtt?.enabled || false)
  const [mqttBroker, setMqttBroker] = useState(settings?.iot?.mqtt?.broker || 'mqtt://localhost:1883')
  const [mqttPrefix, setMqttPrefix] = useState(settings?.iot?.mqtt?.topicPrefix || 'luna/home')

  const [devName, setDevName] = useState('')
  const [devType, setDevType] = useState('light')
  const [devRoom, setDevRoom] = useState('Living Room')
  const [devIntegration, setDevIntegration] = useState('mock')
  const [devEntityId, setDevEntityId] = useState('')
  const [devTopic, setDevTopic] = useState('')

  const handleSaveIotSettings = async () => {
    const nextIot = {
      homeAssistant: { enabled: haEnabled, url: haUrl.trim(), token: haToken.trim() },
      mqtt: { enabled: mqttEnabled, broker: mqttBroker.trim(), topicPrefix: mqttPrefix.trim() },
      philipsHue: settings?.iot?.philipsHue || { enabled: false, ip: '', username: '' },
      homebridge: settings?.iot?.homebridge || { enabled: false, url: '', token: '' }
    }
    await saveSettings({ iot: nextIot })
    toast.success('IoT Platform configurations saved')
  }

  const handleTestHaConnection = async () => {
    if (!haUrl.trim()) {
      toast.error('Home Assistant URL is required')
      return
    }
    toast.info('Testing Home Assistant connection...')
    try {
      const res = await fetch(`${haUrl.trim()}/api/`, {
        headers: {
          'Authorization': `Bearer ${haToken.trim()}`
        },
        signal: AbortSignal.timeout(4000)
      })
      if (res.ok) {
        toast.success('Connected to Home Assistant successfully!')
      } else {
        toast.error(`HA Server returned status ${res.status}`)
      }
    } catch (err) {
      toast.error(`Home Assistant connection failed: ${err.message}`)
    }
  }

  const handleAddDevice = async (e) => {
    e.preventDefault()
    if (!devName.trim()) {
      toast.error('Device name is required')
      return
    }
    const newDevice = {
      id: `${devType}-${Date.now()}`,
      name: devName.trim(),
      type: devType,
      room: devRoom,
      integration: devIntegration,
      entityId: devEntityId.trim() || undefined,
      topic: devTopic.trim() || undefined,
      state: devType === 'speaker' ? 'paused' : (devType === 'thermostat' ? 'cool' : 'off')
    }
    if (devType === 'light') {
      newDevice.brightness = 80
    } else if (devType === 'thermostat') {
      newDevice.temperature = 72
      newDevice.targetTemperature = 70
    } else if (devType === 'speaker') {
      newDevice.volume = 50
      newDevice.track = 'Simulated Stream'
    } else if (devType === 'plug') {
      newDevice.powerWatts = 0
    }

    const updatedDevices = [...smartDevices, newDevice]
    await saveSmartDevices(updatedDevices)
    toast.success(`${devName} added successfully`)

    // Reset device form
    setDevName('')
    setDevType('light')
    setDevRoom('Living Room')
    setDevIntegration('mock')
    setDevEntityId('')
    setDevTopic('')
    setIsAddingDevice(false)
  }

  const handleDeleteDevice = async (id, name) => {
    const updated = smartDevices.filter(d => d.id !== id)
    await saveSmartDevices(updated)
    toast.success(`Removed ${name}`)
  }

  const toggleDevicePower = async (device) => {
    const action = (device.state === 'on' || device.state === 'playing' || device.state === 'heat') ? 'turn_off' : 'turn_on'
    await controlSmartDevice(device.id, action)
  }

  const setDeviceSliderValue = async (device, val) => {
    await controlSmartDevice(device.id, 'set_value', val)
  }

  const audioRef = useRef(null)
  const fileInputRef = useRef(null)
  const currentTrack = playlist[currentTrackIdx] || null

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  // --- CONTACTS HANDLERS ---
  const filteredContacts = useMemo(() => {
    const q = contactSearch.toLowerCase()
    return contacts.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q)
    )
  }, [contacts, contactSearch])

  const resetContactForm = () => {
    setCName('')
    setCEmail('')
    setCPhone('')
    setCCompany('')
    setCNotes('')
    setIsAddingContact(false)
    setEditingContactId(null)
  }

  const handleSaveContact = async (e) => {
    e.preventDefault()
    if (!cName.trim()) {
      toast.error('Name is required')
      return
    }
    let updated
    if (editingContactId) {
      updated = contacts.map(c =>
        c.id === editingContactId
          ? { ...c, name: cName.trim(), email: cEmail.trim(), phone: cPhone.trim(), company: cCompany.trim(), notes: cNotes.trim() }
          : c
      )
      toast.success('Contact updated')
    } else {
      const newContact = {
        id: Date.now().toString(),
        name: cName.trim(),
        email: cEmail.trim(),
        phone: cPhone.trim(),
        company: cCompany.trim(),
        notes: cNotes.trim(),
        createdAt: new Date().toISOString()
      }
      updated = [newContact, ...contacts]
      toast.success('Contact added')
    }
    await saveContacts(updated)
    resetContactForm()
  }

  const handleEditContact = (contact) => {
    setEditingContactId(contact.id)
    setCName(contact.name)
    setCEmail(contact.email)
    setCPhone(contact.phone)
    setCCompany(contact.company)
    setCNotes(contact.notes || '')
    setIsAddingContact(true)
  }

  const handleDeleteContact = async (id) => {
    const updated = contacts.filter(c => c.id !== id)
    await saveContacts(updated)
    toast.success('Contact deleted')
  }

  const handleEmailAction = (email) => {
    if (!email) return
    setPendingAction({
      type: 'MAILTO',
      target: `mailto:${email}`,
      execute: async () => {
        await window.luna.openExternal(`mailto:${email}`)
        toast.success('Launching email client...')
      }
    })
    setPermissionOpen(true)
  }

  // --- CALENDAR HANDLERS ---
  const sortedEvents = useMemo(() => {
    const sorted = [...calendar].sort((a, b) => {
      const dateTimeA = new Date(`${a.date}T${a.time || '00:00'}`)
      const dateTimeB = new Date(`${b.date}T${b.time || '00:00'}`)
      return dateTimeA - dateTimeB
    })
    const nowStr = new Date().toISOString().split('T')[0]
    const today = new Date(nowStr)
    return sorted.filter(event => {
      const eventDate = new Date(event.date)
      if (calendarFilter === 'today') return event.date === nowStr
      if (calendarFilter === 'upcoming') return eventDate >= today
      return true
    })
  }, [calendar, calendarFilter])

  const handleSaveEvent = async (e) => {
    e.preventDefault()
    if (!eTitle.trim() || !eDate) {
      toast.error('Title and Date are required')
      return
    }
    const newEvent = {
      id: Date.now().toString(),
      title: eTitle.trim(),
      date: eDate,
      time: eTime || '12:00',
      location: eLocation.trim(),
      category: eCategory,
      notes: eNotes.trim(),
      createdAt: new Date().toISOString()
    }
    const updated = [newEvent, ...calendar]
    await saveCalendar(updated)
    toast.success('Event scheduled')

    // Alarm scheduler
    const now = new Date()
    const eventTime = new Date(`${eDate}T${eTime || '12:00'}`)
    const diffMs = eventTime - now
    if (diffMs > 0 && diffMs < 86400000) {
      setTimeout(async () => {
        if (settings?.notifications) {
          await window.luna.notify(`Calendar Alert: ${newEvent.title}`, `Starting at ${newEvent.time}`)
        }
        toast.info(`EVENT ALARM: ${newEvent.title} is starting now!`)
      }, diffMs)
    }

    setETitle('')
    setEDate('')
    setETime('')
    setELocation('')
    setECategory('Work')
    setENotes('')
    setIsAddingEvent(false)
  }

  const handleDeleteEvent = async (id) => {
    const updated = calendar.filter(ev => ev.id !== id)
    await saveCalendar(updated)
    toast.success('Event deleted')
  }

  // --- MUSIC HANDLERS ---
  const handlePlayPause = () => {
    if (!audioRef.current) return
    if (!currentTrack?.url) {
      toast.info('Please select or upload local audio tracks!')
      return
    }
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(() => toast.error('Error playing track'))
    }
    setIsPlaying(!isPlaying)
  }

  const playTrack = (idx) => {
    setCurrentTrackIdx(idx)
    setIsPlaying(false)
    setCurrentTime(0)
    setTimeout(() => {
      if (audioRef.current && playlist[idx]?.url) {
        audioRef.current.load()
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(() => toast.error('Playback error'))
      }
    }, 50)
  }

  const handleSeek = (e) => {
    const val = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = val
      setCurrentTime(val)
    }
  }

  const handleAddLocalMusic = (e) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const newTracks = Array.from(files).map((file, idx) => {
      const url = URL.createObjectURL(file)
      return {
        id: (Date.now() + idx).toString(),
        name: file.name.replace(/\.[^/.]+$/, ""),
        artist: 'Local Track',
        duration: '--:--',
        url
      }
    })
    setPlaylist(prev => [...prev, ...newTracks])
    toast.success(`Loaded ${newTracks.length} track(s)`)
    if (!currentTrack?.url && newTracks.length > 0) {
      setCurrentTrackIdx(playlist.length)
    }
  }

  // --- APP LAUNCHER & SEARCH ACTIONS ---
  const handleLaunch = (appName) => {
    setPendingAction({
      type: 'APP',
      target: appName,
      execute: async () => {
        const res = await window.luna.launchApp(appName)
        if (res.success) {
          toast.success(`Launched ${appName}`)
        } else {
          toast.error(`Launch failed: ${res.error}`)
        }
      }
    })
    setPermissionOpen(true)
  }

  const handleOpenLink = (url) => {
    setPendingAction({
      type: 'OPEN_URL',
      target: url,
      execute: async () => {
        await window.luna.openExternal(url)
        toast.success(`Opening URL...`)
      }
    })
    setPermissionOpen(true)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Connectors Control Center</h1>
          <p>Configure local tools, contacts, calendar agendas, and play offline media.</p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        <button className={`tab ${activeTab === 'apps' ? 'active' : ''}`} onClick={() => setActiveTab('apps')}>
          <Command size={14} style={{ marginRight: 6 }} /> System & Web
        </button>
        <button className={`tab ${activeTab === 'contacts' ? 'active' : ''}`} onClick={() => setActiveTab('contacts')}>
          <Users size={14} style={{ marginRight: 6 }} /> Contacts
        </button>
        <button className={`tab ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>
          <Calendar size={14} style={{ marginRight: 6 }} /> Calendar
        </button>
        <button className={`tab ${activeTab === 'music' ? 'active' : ''}`} onClick={() => setActiveTab('music')}>
          <Music size={14} style={{ marginRight: 6 }} /> Music Player
        </button>
        <button className={`tab ${activeTab === 'smarthome' ? 'active' : ''}`} onClick={() => setActiveTab('smarthome')}>
          <Home size={14} style={{ marginRight: 6 }} /> Smart Home
        </button>
      </div>

      <audio
        ref={audioRef}
        src={currentTrack?.url}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
        onEnded={() => playlist.length > 1 && playTrack((currentTrackIdx + 1) % playlist.length)}
      />

      {/* TAB CONTENT: SYSTEM & WEB CONNECTIONS */}
      {activeTab === 'apps' && (
        <div className="flex flex-col gap-6 fade-in">
          {/* Native System App Launchers */}
          <div className="card">
            <div className="settings-section-title">
              <Command size={16} /> Native Desktop App Connectors
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
              Click to launch pre-registered desktop applications directly from Luna's environment.
            </p>
            <div className="grid-4" style={{ gap: 12 }}>
              {[
                { name: 'Notepad', key: 'notepad', desc: 'Plain text writer' },
                { name: 'Calculator', key: 'calc', desc: 'Basic calculations' },
                { name: 'Google Chrome', key: 'chrome', desc: 'Browse the web' },
                { name: 'MS Paint', key: 'paint', desc: 'Draw and sketch' },
              ].map(app => (
                <div
                  key={app.key}
                  className="card flex flex-col justify-between"
                  style={{ padding: 14, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', cursor: 'pointer' }}
                  onClick={() => handleLaunch(app.key)}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{app.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{app.desc}</div>
                  </div>
                  <div style={{ alignSelf: 'flex-end', marginTop: 12, fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>
                    Launch &rarr;
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Web Browser Shortcuts */}
          <div className="card">
            <div className="settings-section-title">
              <Globe size={16} /> Web Applications & Shortcuts
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
              Quick links to trigger your default browser to launch common social, media, or reference platforms.
            </p>
            <div className="grid-3" style={{ gap: 12 }}>
              {[
                { name: 'Google Search', url: 'https://google.com', desc: 'Perform web searches' },
                { name: 'YouTube Player', url: 'https://youtube.com', desc: 'Stream videos' },
                { name: 'Wikipedia', url: 'https://wikipedia.org', desc: 'Find information' },
                { name: 'Spotify Music', url: 'https://open.spotify.com', desc: 'Listen to music' },
                { name: 'Instagram', url: 'https://instagram.com', desc: 'Social network' },
                { name: 'Luna Onboarding', url: 'http://localhost:5173', desc: 'Local dev link' },
              ].map(link => (
                <div
                  key={link.name}
                  className="card flex items-center justify-between"
                  style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', cursor: 'pointer' }}
                  onClick={() => handleOpenLink(link.url)}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{link.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{link.desc}</div>
                  </div>
                  <ExternalLink size={14} style={{ color: 'var(--text-muted)' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Email Integration Shortcut */}
          <div className="card">
            <div className="settings-section-title">
              <Mail size={16} /> Native Email Composer
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                id="direct-email-input"
                className="input-field"
                style={{ flex: 1, minWidth: 200 }}
                placeholder="Enter recipient email address..."
              />
              <button
                className="btn btn-primary"
                onClick={() => {
                  const val = document.getElementById('direct-email-input')?.value
                  if (val) handleEmailAction(val)
                  else toast.error('Enter a valid email address first')
                }}
              >
                Draft Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: CONTACTS */}
      {activeTab === 'contacts' && (
        <div className="fade-in">
          <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
            <h3>Contacts List ({contacts.length})</h3>
            {!isAddingContact && (
              <button className="btn btn-primary" onClick={() => setIsAddingContact(true)}>
                <Plus size={14} /> Add Contact
              </button>
            )}
          </div>

          {isAddingContact ? (
            <form onSubmit={handleSaveContact} className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
              <div className="settings-section-title" style={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                <span>{editingContactId ? 'Edit Contact' : 'New Contact'}</span>
                <button type="button" className="btn btn-icon btn-ghost" onClick={resetContactForm}>
                  <X size={16} />
                </button>
              </div>
              <div className="flex flex-col gap-4" style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Full Name *</label>
                  <input
                    className="input-field"
                    placeholder="Full Name"
                    value={cName}
                    onChange={e => setCName(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Email Address</label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="Email Address"
                    value={cEmail}
                    onChange={e => setCEmail(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Phone</label>
                  <input
                    className="input-field"
                    placeholder="Phone"
                    value={cPhone}
                    onChange={e => setCPhone(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Company</label>
                  <input
                    className="input-field"
                    placeholder="Company"
                    value={cCompany}
                    onChange={e => setCCompany(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Notes</label>
                  <textarea
                    className="input-field"
                    style={{ minHeight: 80 }}
                    placeholder="Preferences, tags..."
                    value={cNotes}
                    onChange={e => setCNotes(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 justify-end" style={{ marginTop: 8 }}>
                  <button type="button" className="btn btn-secondary" onClick={resetContactForm}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Contact
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
                    placeholder="Search contacts..."
                    value={contactSearch}
                    onChange={e => setContactSearch(e.target.value)}
                  />
                </div>
              </div>

              {filteredContacts.length === 0 ? (
                <div className="empty-state">No contacts found.</div>
              ) : (
                <div className="grid-2" style={{ gap: 12 }}>
                  {filteredContacts.map(contact => (
                    <div key={contact.id} className="card flex items-center justify-between" style={{ padding: 14 }}>
                      <div className="flex gap-3 items-center">
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700
                          }}
                        >
                          {contact.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{contact.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {contact.email} {contact.phone && `• ${contact.phone}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {contact.email && (
                          <button className="btn btn-icon btn-ghost" onClick={() => handleEmailAction(contact.email)}>
                            <Mail size={13} color="var(--primary)" />
                          </button>
                        )}
                        <button className="btn btn-icon btn-ghost" onClick={() => handleEditContact(contact)}>
                          <Edit2 size={13} />
                        </button>
                        <button className="btn btn-icon btn-ghost" onClick={() => handleDeleteContact(contact.id)}>
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
      )}

      {/* TAB CONTENT: CALENDAR */}
      {activeTab === 'calendar' && (
        <div className="fade-in">
          <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
            <h3>Calendar Schedule</h3>
            {!isAddingEvent && (
              <button className="btn btn-primary" onClick={() => setIsAddingEvent(true)}>
                <Plus size={14} /> Schedule Event
              </button>
            )}
          </div>

          {isAddingEvent ? (
            <form onSubmit={handleSaveEvent} className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
              <div className="settings-section-title" style={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                <span>Schedule Event</span>
                <button type="button" className="btn btn-icon btn-ghost" onClick={() => setIsAddingEvent(false)}>
                  <X size={16} />
                </button>
              </div>
              <div className="flex flex-col gap-4" style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Event Title *</label>
                  <input
                    className="input-field"
                    placeholder="Event Title"
                    value={eTitle}
                    onChange={e => setETitle(e.target.value)}
                    required
                  />
                </div>
                <div className="grid-2" style={{ gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Date</label>
                    <input
                      type="date"
                      className="input-field"
                      value={eDate}
                      onChange={e => setEDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Time</label>
                    <input
                      type="time"
                      className="input-field"
                      value={eTime}
                      onChange={e => setETime(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Location / Link</label>
                  <input
                    className="input-field"
                    placeholder="Location"
                    value={eLocation}
                    onChange={e => setELocation(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 justify-end" style={{ marginTop: 8 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsAddingEvent(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Schedule
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <>
              <div className="tabs" style={{ marginBottom: 14, width: 'fit-content' }}>
                {['upcoming', 'today', 'all'].map(item => (
                  <button
                    key={item}
                    className={`tab ${calendarFilter === item ? 'active' : ''}`}
                    onClick={() => setCalendarFilter(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>

              {sortedEvents.length === 0 ? (
                <div className="empty-state">No scheduled events.</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {sortedEvents.map(event => (
                    <div key={event.id} className="card flex flex-col gap-2" style={{ padding: 14 }}>
                      <div className="flex justify-between items-center">
                        <div style={{ fontWeight: 650, fontSize: 14 }}>{event.title}</div>
                        <button className="btn btn-icon btn-ghost" onClick={() => handleDeleteEvent(event.id)}>
                          <Trash2 size={13} color="var(--danger)" />
                        </button>
                      </div>
                      <div className="flex gap-3" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        <Clock size={11} /> {event.date} • {event.time}
                        {event.location && `• ${event.location}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB CONTENT: MUSIC PLAYER */}
      {activeTab === 'music' && (
        <div className="grid-2 fade-in" style={{ gap: 16 }}>
          <div className="card flex flex-col items-center justify-center" style={{ padding: 24, textAlign: 'center' }}>
            <div style={{ display: 'flex', gap: 4, height: 40, alignItems: 'flex-end', marginBottom: 16 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 5,
                    background: 'var(--primary)',
                    borderRadius: 2,
                    height: isPlaying ? `${Math.floor(Math.random() * 30) + 10}px` : '4px',
                    transition: 'height 0.15s ease-in-out',
                    opacity: 0.8
                  }}
                />
              ))}
            </div>

            <div style={{ fontWeight: 600, fontSize: 15, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentTrack?.name || 'No Track Selected'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
              {currentTrack?.artist}
            </div>

            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              style={{ width: '100%', accentColor: 'var(--primary)', height: 4, cursor: 'pointer', marginBottom: 12 }}
            />

            <div className="flex gap-3 items-center">
              <button className="btn btn-primary" onClick={handlePlayPause}>
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <button className="btn btn-secondary btn-icon" onClick={() => playlist.length > 1 && playTrack((currentTrackIdx + 1) % playlist.length)}>
                <SkipForward size={14} />
              </button>
              <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
                Import audio
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="audio/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleAddLocalMusic}
            />
          </div>

          <div className="card" style={{ padding: 14 }}>
            <div className="settings-section-title">
              <ListMusic size={14} /> Music Playlist
            </div>
            <div className="flex flex-col gap-2" style={{ maxHeight: 240, overflowY: 'auto', marginTop: 10 }}>
              {playlist.map((track, idx) => (
                <div
                  key={track.id}
                  onClick={() => track.url && playTrack(idx)}
                  className={`task-item ${idx === currentTrackIdx ? 'active' : ''}`}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius)',
                    cursor: track.url ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 12
                  }}
                >
                  <div>{track.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{track.artist}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: SMART HOME / IoT */}
      {activeTab === 'smarthome' && (
        <div className="flex flex-col gap-6 fade-in" style={{ marginTop: 20 }}>
          {/* Platforms Integrations Config Card */}
          <div className="card">
            <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Cpu size={16} /> IoT Platform Integrations
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
              Enable and configure local REST or broker links. Luna communicates directly over your local network.
            </p>

            <div className="flex flex-col gap-4">
              {/* Home Assistant Config */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                <div 
                  onClick={() => setHaOpen(!haOpen)}
                  style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    padding: '12px 16px', background: 'rgba(255,255,255,0.01)', cursor: 'pointer' 
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: haEnabled ? 'var(--primary)' : 'var(--text-muted)' }} />
                    <span style={{ fontWeight: 600, fontSize: 14 }}>Home Assistant REST API</span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--primary)' }}>{haOpen ? 'Collapse ▲' : 'Configure ▼'}</span>
                </div>

                {haOpen && (
                  <div style={{ padding: 16, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="ha-enabled-checkbox" 
                        checked={haEnabled} 
                        onChange={(e) => setHaEnabled(e.target.checked)} 
                        style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
                      />
                      <label htmlFor="ha-enabled-checkbox" style={{ fontSize: 13, fontWeight: 500 }}>Enable Home Assistant Integration</label>
                    </div>

                    <div className="grid-2" style={{ gap: 12 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Server URL</label>
                        <input 
                          className="input-field" 
                          placeholder="http://192.168.1.50:8123" 
                          value={haUrl} 
                          onChange={(e) => setHaUrl(e.target.value)}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Long-Lived Access Token</label>
                        <input 
                          type="password" 
                          className="input-field" 
                          placeholder="ey..." 
                          value={haToken} 
                          onChange={(e) => setHaToken(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end" style={{ marginTop: 6 }}>
                      <button type="button" className="btn btn-secondary" onClick={handleTestHaConnection}>Test Connection</button>
                      <button type="button" className="btn btn-primary" onClick={handleSaveIotSettings}>Save HA Settings</button>
                    </div>
                  </div>
                )}
              </div>

              {/* MQTT Broker Config */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                <div 
                  onClick={() => setMqttOpen(!mqttOpen)}
                  style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    padding: '12px 16px', background: 'rgba(255,255,255,0.01)', cursor: 'pointer' 
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: mqttEnabled ? 'var(--primary)' : 'var(--text-muted)' }} />
                    <span style={{ fontWeight: 600, fontSize: 14 }}>MQTT Message Broker</span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--primary)' }}>{mqttOpen ? 'Collapse ▲' : 'Configure ▼'}</span>
                </div>

                {mqttOpen && (
                  <div style={{ padding: 16, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="mqtt-enabled-checkbox" 
                        checked={mqttEnabled} 
                        onChange={(e) => setMqttEnabled(e.target.checked)} 
                        style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
                      />
                      <label htmlFor="mqtt-enabled-checkbox" style={{ fontSize: 13, fontWeight: 500 }}>Enable MQTT Brokering</label>
                    </div>

                    <div className="grid-2" style={{ gap: 12 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Broker Host (tcp/ws)</label>
                        <input 
                          className="input-field" 
                          placeholder="mqtt://localhost:1883" 
                          value={mqttBroker} 
                          onChange={(e) => setMqttBroker(e.target.value)}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Base Topic Prefix</label>
                        <input 
                          className="input-field" 
                          placeholder="luna/home" 
                          value={mqttPrefix} 
                          onChange={(e) => setMqttPrefix(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end" style={{ marginTop: 6 }}>
                      <button type="button" className="btn btn-primary" onClick={handleSaveIotSettings}>Save MQTT Settings</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Smart Devices Grid Board */}
          <div>
            <div className="flex justify-between items-center" style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Lightbulb size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0 }}>Smart Device Panel</h3>
              </div>
              <button className="btn btn-primary" onClick={() => setIsAddingDevice(true)}>
                <Plus size={14} /> Add Device
              </button>
            </div>

            {isAddingDevice && (
              <form onSubmit={handleAddDevice} className="card" style={{ maxWidth: 600, margin: '0 auto 20px auto', border: '1px solid var(--primary)' }}>
                <div className="settings-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Configure New Smart Device</span>
                  <button type="button" className="btn btn-icon btn-ghost" onClick={() => setIsAddingDevice(false)}>
                    <X size={16} />
                  </button>
                </div>

                <div className="flex flex-col gap-4" style={{ marginTop: 12 }}>
                  <div className="grid-2" style={{ gap: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 500 }}>Device Name *</label>
                      <input 
                        className="input-field" 
                        placeholder="e.g. Kitchen Light" 
                        value={devName} 
                        onChange={(e) => setDevName(e.target.value)} 
                        required 
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 500 }}>Room Location</label>
                      <input 
                        className="input-field" 
                        placeholder="e.g. Kitchen" 
                        value={devRoom} 
                        onChange={(e) => setDevRoom(e.target.value)} 
                      />
                    </div>
                  </div>

                  <div className="grid-3" style={{ gap: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 500 }}>Device Type</label>
                      <select 
                        className="input-field" 
                        value={devType} 
                        onChange={(e) => setDevType(e.target.value)}
                        style={{ background: 'var(--card-bg)' }}
                      >
                        <option value="light">Smart Light</option>
                        <option value="plug">Smart Plug</option>
                        <option value="thermostat">Smart Thermostat</option>
                        <option value="speaker">Smart Speaker</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 500 }}>Integration Source</label>
                      <select 
                        className="input-field" 
                        value={devIntegration} 
                        onChange={(e) => setDevIntegration(e.target.value)}
                        style={{ background: 'var(--card-bg)' }}
                      >
                        <option value="mock">Simulated (Mock)</option>
                        <option value="ha">Home Assistant Entity</option>
                        <option value="mqtt">MQTT Client</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 500 }}>Binding Identifier</label>
                      <input 
                        className="input-field" 
                        placeholder={devIntegration === 'ha' ? 'light.kitchen_lamp' : (devIntegration === 'mqtt' ? 'luna/home/light/kitchen' : 'N/A (Mock)')} 
                        value={devIntegration === 'ha' ? devEntityId : devTopic}
                        onChange={(e) => {
                          if (devIntegration === 'ha') {
                            setDevEntityId(e.target.value)
                          } else {
                            setDevTopic(e.target.value)
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end" style={{ marginTop: 8 }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setIsAddingDevice(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Save Device</button>
                  </div>
                </div>
              </form>
            )}

            {smartDevices.length === 0 ? (
              <div className="empty-state">No configured smart devices. Add one to get started!</div>
            ) : (
              <div className="grid-2" style={{ gap: 16 }}>
                {smartDevices.map(device => {
                  const isPowerOn = device.state === 'on' || device.state === 'playing' || device.state === 'heat';
                  
                  return (
                    <div 
                      key={device.id} 
                      className="card" 
                      style={{ 
                        padding: 16, 
                        border: isPowerOn ? '1px solid var(--primary-glow)' : '1px solid var(--border)',
                        background: isPowerOn ? 'rgba(39, 199, 184, 0.02)' : 'rgba(255,255,255,0.01)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 12
                      }}
                    >
                      {/* Device Header */}
                      <div className="flex justify-between items-start">
                        <div className="flex gap-3 items-center">
                          <div 
                            style={{ 
                              width: 36, height: 36, borderRadius: '50%',
                              background: isPowerOn ? 'var(--primary-glow)' : 'rgba(255,255,255,0.05)',
                              color: isPowerOn ? 'var(--primary)' : 'var(--text-secondary)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                          >
                            {device.type === 'light' ? <Lightbulb size={18} /> : 
                             device.type === 'plug' ? <Power size={18} /> : 
                             device.type === 'thermostat' ? <Sliders size={18} /> : 
                             <Volume2 size={18} />}
                          </div>
                          <div>
                            <div style={{ fontWeight: 650, fontSize: 14 }}>{device.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{device.room} • {device.integration.toUpperCase()}</div>
                          </div>
                        </div>

                        <div className="flex gap-1 items-center">
                          <button 
                            type="button"
                            className="btn btn-icon btn-ghost" 
                            onClick={() => toggleDevicePower(device)}
                            title={isPowerOn ? 'Power Off' : 'Power On'}
                            style={{ color: isPowerOn ? 'var(--accent)' : 'var(--text-muted)' }}
                          >
                            <Power size={14} />
                          </button>
                          <button 
                            type="button"
                            className="btn btn-icon btn-ghost" 
                            onClick={() => handleDeleteDevice(device.id, device.name)}
                            title="Remove Device"
                          >
                            <Trash2 size={13} color="var(--danger)" />
                          </button>
                        </div>
                      </div>

                      {/* Device Controls Body */}
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, fontSize: 12 }}>
                        {device.type === 'light' && (
                          <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                              <span>Brightness</span>
                              <span style={{ fontWeight: 600 }}>{isPowerOn ? `${device.brightness || 0}%` : 'Off'}</span>
                            </div>
                            <input 
                              type="range"
                              min="0"
                              max="100"
                              value={device.brightness || 0}
                              onChange={(e) => setDeviceSliderValue(device, parseInt(e.target.value))}
                              disabled={!isPowerOn}
                              style={{ width: '100%', accentColor: 'var(--primary)', height: 3, cursor: isPowerOn ? 'pointer' : 'not-allowed' }}
                            />
                          </div>
                        )}

                        {device.type === 'plug' && (
                          <div className="flex justify-between items-center">
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Current Draw</span>
                            <span style={{ fontWeight: 600, color: isPowerOn ? 'var(--accent)' : 'var(--text-muted)' }}>
                              {isPowerOn ? `${device.powerWatts || 120} W` : '0 W'}
                            </span>
                          </div>
                        )}

                        {device.type === 'thermostat' && (
                          <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Current Temp / Target</span>
                              <span style={{ fontWeight: 600 }}>{device.temperature || 72}°F &rarr; <span style={{ color: 'var(--primary)' }}>{device.targetTemperature || 70}°F</span></span>
                            </div>
                            <div className="flex gap-2 justify-end" style={{ marginTop: 2 }}>
                              <button 
                                type="button"
                                className="btn btn-secondary" 
                                style={{ padding: '2px 8px', fontSize: 11 }}
                                onClick={() => setDeviceSliderValue(device, (device.targetTemperature || 70) - 1)}
                              >
                                -1°
                              </button>
                              <button 
                                type="button"
                                className="btn btn-secondary" 
                                style={{ padding: '2px 8px', fontSize: 11 }}
                                onClick={() => setDeviceSliderValue(device, (device.targetTemperature || 70) + 1)}
                              >
                                +1°
                              </button>
                            </div>
                          </div>
                        )}

                        {device.type === 'speaker' && (
                          <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>
                                {isPowerOn ? `Playing: ${device.track || 'Audio Stream'}` : 'Idle'}
                              </span>
                              <span style={{ fontWeight: 600 }}>Vol: {device.volume || 50}%</span>
                            </div>
                            <input 
                              type="range"
                              min="0"
                              max="100"
                              value={device.volume || 0}
                              onChange={(e) => setDeviceSliderValue(device, parseInt(e.target.value))}
                              disabled={!isPowerOn}
                              style={{ width: '100%', accentColor: 'var(--primary)', height: 3, cursor: isPowerOn ? 'pointer' : 'not-allowed' }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* IoT Logs/Terminal console */}
          <div className="card">
            <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
              <div className="settings-section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Activity size={16} /> Live IoT Logs Broker Console
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={refreshIotLogs}>
                  Refresh Logs
                </button>
                <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={clearIotLogs}>
                  Clear Console
                </button>
              </div>
            </div>

            <div 
              style={{ 
                height: 180, overflowY: 'auto', background: '#07080d', border: '1px solid var(--border)',
                borderRadius: 8, padding: 12, fontFamily: 'monospace', fontSize: 11, color: '#3cd070' 
              }}
            >
              {iotLogs.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Console idle. Awaiting smart device packets...</div>
              ) : (
                iotLogs.map(log => {
                  let badgeColor = '#94a3b8'; // gray
                  if (log.type === 'MQTT_PUB') badgeColor = '#38bdf8'; // blue
                  if (log.type === 'HA_API') badgeColor = '#a855f7'; // purple
                  if (log.type === 'CONTROL') badgeColor = '#3cd070'; // green

                  return (
                    <div key={log.id} style={{ marginBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: 4 }}>
                      <div className="flex justify-between" style={{ color: '#64748b', marginBottom: 2 }}>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span style={{ color: badgeColor, fontWeight: 700 }}>[{log.type}]</span>
                      </div>
                      <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{log.message}</div>
                      {log.details && <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 1 }}>{log.details}</div>}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      <PermissionModal
        open={permissionOpen}
        actionType={pendingAction?.type}
        actionTarget={pendingAction?.target}
        onConfirm={async () => {
          setPermissionOpen(false)
          if (pendingAction?.execute) {
            await pendingAction.execute()
          }
          setPendingAction(null)
        }}
        onCancel={() => {
          setPermissionOpen(false)
          setPendingAction(null)
          toast.info('Action permission denied')
        }}
      />
    </div>
  )
}
