import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Database, Download, EyeOff, FolderOpen, Lock, Shield, Trash2, Wand2,
  Brain, History, Plug, AlertTriangle, CheckCircle, Eye, Clock, MessageSquare,
  Search, FileText, Filter, XCircle, HardDrive, RefreshCw, Info, LockKeyhole
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { toast } from '../components/Toast'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'

function Toggle({ checked, onChange }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-slider" />
    </label>
  )
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: Shield },
  { id: 'permissions', label: 'Permissions', icon: Lock },
  { id: 'connections', label: 'Connections', icon: Plug },
  { id: 'memories', label: 'Memories', icon: Brain },
  { id: 'activity', label: 'Activity', icon: History },
  { id: 'delete', label: 'Delete Data', icon: Trash2 },
]

export default function PrivacyPage() {
  const {
    memory, conversations, tasks, notes = [], contacts, calendar,
    clearMemory, clearAllConversations, saveTasks, saveContacts, saveCalendar,
    saveSettings, settings, deleteMemory, pinMemory, deleteNote
  } = useApp()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [confirmTarget, setConfirmTarget] = useState(null) // { title, desc, action }
  const [nuclearStep, setNuclearStep] = useState(0) // 0: none, 1: first check, 2: final warning
  const [memSearch, setMemSearch] = useState('')
  const [activitySearch, setActivitySearch] = useState('')
  const [activityFilter, setActivityFilter] = useState('all') // 'all' | 'conversation' | 'memory'

  const permissions = settings.permissions || {}
  const totalRecords = memory.length + conversations.length + tasks.length + notes.length + contacts.length + calendar.length
  const totalMessages = conversations.reduce((sum, c) => sum + (c.messages?.length || 0), 0)

  // Calculate Privacy Health Score
  const scorePercent = useMemo(() => {
    let score = 100
    if (permissions.automation) score -= 25  // high risk
    if (permissions.files) score -= 15       // medium risk
    if (permissions.clipboard) score -= 5     // low risk
    if (permissions.notifications) score -= 5 // low risk
    return score
  }, [permissions])

  const scoreStatus = useMemo(() => {
    if (scorePercent === 100) return { label: 'Strict Isolation', desc: 'Ultimate security and air-gapped protection.', color: 'var(--success)' }
    if (scorePercent >= 80) return { label: 'Secured Boundary', desc: 'Highly secure, minimal access features.', color: 'var(--accent)' }
    if (scorePercent >= 60) return { label: 'Balanced Access', desc: 'Typical desktop productivity configuration.', color: 'var(--amber)' }
    return { label: 'Permissive Integration', desc: 'Elevated system access permissions active.', color: 'var(--danger)' }
  }, [scorePercent])

  const updatePermission = async (key, value) => {
    await saveSettings({ permissions: { ...permissions, [key]: value } })
    toast.success('Permission updated successfully')
  }

  const exportData = async () => {
    const data = {
      memory, conversations, tasks, notes, contacts, calendar, settings,
      exportedAt: new Date().toISOString(),
    }
    const ok = await window.luna.saveFileDialog('luna-backup.json', JSON.stringify(data, null, 2))
    if (ok) toast.success('Data exported successfully')
  }

  const performNuclearReset = async () => {
    try {
      // Clear memory
      await clearMemory()
      // Clear chats
      await clearAllConversations()
      // Clear tasks
      await saveTasks([])
      // Clear contacts
      await saveContacts([])
      // Clear calendar
      await saveCalendar([])
      // Clear notes
      for (const n of notes) {
        if (n && n.id) await deleteNote(n.id)
      }
      // Reset settings to factory defaults
      const DEFAULT_SETTINGS = {
        assistantName: 'Luna',
        userName: 'User',
        ollamaUrl: 'http://localhost:11434',
        model: 'qwen2.5:1.5b',
        inferenceMode: 'auto',
        onboardingComplete: false,
        voice: false,
        voiceName: '',
        wakeWord: false,
        fontSize: 'medium',
        aiPersonality: 'friendly',
        responseLength: 'balanced',
        autoExtractMemory: true,
        notifications: true,
        mockWhenOffline: true,
        theme: 'dark',
        language: 'English',
        permissions: {
          files: false,
          clipboard: true,
          notifications: true,
          automation: false,
        },
        systemPrompt: 'You are Luna, a helpful, friendly, and privacy-focused AI desktop assistant. You run locally, ask before sensitive actions, and keep responses concise.',
        accentColor: '#27c7b8',
      }
      await saveSettings(DEFAULT_SETTINGS)
      toast.success(' Luna factory reset complete.')
      setNuclearStep(0)
      navigate('/')
    } catch (err) {
      toast.error('An error occurred during reset.')
      console.error(err)
    }
  }

  const filteredMemory = useMemo(() => {
    const q = memSearch.toLowerCase()
    return memory
      .filter((m) => m.content.toLowerCase().includes(q))
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
  }, [memory, memSearch])

  const deleteFilteredMemories = async () => {
    if (filteredMemory.length === 0) return
    if (confirm(`Are you sure you want to delete all ${filteredMemory.length} matching memory items?`)) {
      for (const item of filteredMemory) {
        await deleteMemory(item.id)
      }
      toast.success('Filtered memories deleted')
      setMemSearch('')
    }
  }

  const activityLog = useMemo(() => {
    const items = []
    conversations.forEach((c) => {
      items.push({
        type: 'conversation',
        title: c.title || 'Chat Session',
        detail: `${c.messages?.length || 0} messages exchange`,
        date: c.updatedAt || c.createdAt,
        icon: MessageSquare,
      })
    })
    memory.forEach((m) => {
      items.push({
        type: 'memory',
        title: m.content.slice(0, 70) + (m.content.length > 70 ? '...' : ''),
        detail: m.pinned ? 'Pinned Memory Fact' : 'Auto-learned Fact',
        date: m.createdAt,
        icon: Brain,
      })
    })
    return items.sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [conversations, memory])

  const filteredActivityLog = useMemo(() => {
    const q = activitySearch.toLowerCase()
    return activityLog.filter((item) => {
      const matchesType = activityFilter === 'all' || item.type === activityFilter
      const matchesQuery = item.title.toLowerCase().includes(q) || item.detail.toLowerCase().includes(q)
      return matchesType && matchesQuery
    }).slice(0, 40)
  }, [activityLog, activitySearch, activityFilter])

  const fmtDate = (iso) => {
    if (!iso) return '—'
    const d = new Date(iso)
    const now = new Date()
    const diff = now - d
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
  }

  const permissionItems = [
    { key: 'files', icon: FolderOpen, title: 'File System Access', desc: 'Read files you select through the native system picker dialog.', risk: 'medium' },
    { key: 'clipboard', icon: Download, title: 'Clipboard Operations', desc: 'Direct copy generated code and responses to your system clipboard.', risk: 'low' },
    { key: 'notifications', icon: Shield, title: 'System Notifications', desc: 'Deliver instant notifications and alert updates on your OS desktop.', risk: 'low' },
    { key: 'automation', icon: Wand2, title: 'Desktop Automation', desc: 'Launch applications, navigate local files, and run tasks on request.', risk: 'high' },
  ]

  const connectionsList = [
    { name: 'Ollama Engine', status: 'active', desc: `Local LLM Inference Running at ${settings.ollamaUrl}`, icon: '🧠' },
    { name: 'Native File System', status: permissions.files ? 'active' : 'inactive', desc: 'Secure, local file reading via browser-dialog picker', icon: '📁' },
    { name: 'Clipboard manager', status: permissions.clipboard ? 'active' : 'inactive', desc: 'Local clipboard content copying pipeline', icon: '📋' },
    { name: 'Desktop Alerts', status: permissions.notifications ? 'active' : 'inactive', desc: 'On-device desktop notifications', icon: '🔔' },
    { name: 'Application Launcher', status: permissions.automation ? 'active' : 'inactive', desc: 'Launches native applications locally', icon: '🚀' },
    { name: 'Web Speech API', status: settings.wakeWord || settings.voice ? 'active' : 'inactive', desc: 'Local voice processing (does not upload audio)', icon: '🎤' },
  ]

  const grantedCount = permissionItems.filter((p) => !!permissions[p.key]).length

  // Circular progress dimensions
  const radius = 50
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (scorePercent / 100) * circumference

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1>Privacy & Transparency</h1>
        <p>Full visibility into what Luna can access. Everything runs locally and securely on your computer.</p>
      </div>

      {/* Tab Navigation */}
      <div className="tabs" style={{ marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`tab ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}>
            <Icon size={13} style={{ marginRight: 5 }} /> {label}
          </button>
        ))}
      </div>

      {/* ─── OVERVIEW TAB ──────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="fade-in flex flex-col gap-4">
          <div className="grid-3">
            {/* Circular Privacy Score Dashboard */}
            <div className="card privacy-score-card">
              <div className="privacy-score-circle">
                <svg>
                  <defs>
                    <linearGradient id="privacy-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#27c7b8" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                  <circle className="bg-circle" cx="60" cy="60" r={radius} />
                  <circle
                    className="fg-circle"
                    cx="60"
                    cy="60"
                    r={radius}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                  />
                </svg>
                <div className="privacy-score-value">{scorePercent}%</div>
              </div>
              <div className="privacy-score-status" style={{ color: scoreStatus.color }}>
                {scoreStatus.label}
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 4, lineHeight: 1.4 }}>
                {scoreStatus.desc}
              </p>
            </div>

            {/* Quick Stats */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 24 }}>
              <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
                <div style={{ padding: 8, borderRadius: 8, background: 'rgba(39, 199, 184, 0.08)', color: 'var(--accent)' }}>
                  <Brain size={20} />
                </div>
                <div>
                  <div className="privacy-stat-value">{memory.length}</div>
                  <div className="privacy-stat-label">Stored Memory Items</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div style={{ padding: 8, borderRadius: 8, background: 'rgba(139, 92, 246, 0.08)', color: 'var(--accent-purple)' }}>
                  <Database size={20} />
                </div>
                <div>
                  <div className="privacy-stat-value">{totalRecords}</div>
                  <div className="privacy-stat-label">Total Local Records</div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 }}>
              <div className="settings-section-title" style={{ fontSize: 13, marginBottom: 0, paddingBottom: 6 }}>
                <LockKeyhole size={13} /> Privacy Controls
              </div>
              <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={exportData}>
                <Download size={13} /> Export Backup (JSON)
              </button>
              <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => setActiveTab('permissions')}>
                <Lock size={13} /> Manage System Access
              </button>
              <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--danger)', borderColor: 'rgba(244, 63, 94, 0.15)' }} onClick={() => setActiveTab('delete')}>
                <Trash2 size={13} /> Danger Zone Control
              </button>
            </div>
          </div>

          <div className="grid-2" style={{ gap: 20, alignItems: 'start' }}>
            {/* Core Privacy Guarantees */}
            <div className="card">
              <div className="settings-section-title"><EyeOff size={14} /> Core Privacy Protections</div>
              {[
                { icon: Lock, title: 'Local Storage Architecture', desc: 'All memories, settings, files, and chat logs are stored strictly inside your local system application data directories.' },
                { icon: EyeOff, title: 'Absolute Telemetry Blocking', desc: 'No tracking tags, crash logs, diagnostic metrics, or usage behaviors are ever sent to remote cloud platforms.' },
                { icon: HardDrive, title: 'Self-Hosted AI Modeling', desc: 'LLM inference is powered directly by local Ollama engines. Your prompt vectors and file text never pass to third-party endpoints.' },
                { icon: AlertTriangle, title: 'Security Confirmation', desc: 'Potentially destructive scripts or folder organizing actions always demand explicit visual dialog validation.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="setting-row" style={{ alignItems: 'flex-start', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ marginTop: 2, padding: 6, borderRadius: 6, background: 'rgba(39, 199, 184, 0.08)', color: 'var(--accent)', flexShrink: 0 }}>
                    <Icon size={14} />
                  </div>
                  <div className="setting-info" style={{ marginLeft: 12 }}>
                    <div className="setting-name" style={{ fontSize: 13, fontWeight: 650 }}>{title}</div>
                    <div className="setting-desc" style={{ fontSize: 11.5, marginTop: 2 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Local Sandbox Info */}
            <div className="card" style={{ padding: 20 }}>
              <div className="settings-section-title" style={{ color: 'var(--accent)' }}><Info size={14} /> Zero Cloud Connectivity</div>
              <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Luna operates inside a local hardware sandbox. All files are hosted on-disk:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                <div style={{ fontSize: 11.5, display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--bg-tertiary)', borderRadius: 6 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Local Data Folder</span>
                  <code style={{ color: 'var(--accent-light)', fontFamily: 'monospace' }}>%AppData%/luna-app</code>
                </div>
                <div style={{ fontSize: 11.5, display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--bg-tertiary)', borderRadius: 6 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Connection Node</span>
                  <code style={{ color: 'var(--accent-light)', fontFamily: 'monospace' }}>localhost (127.0.0.1)</code>
                </div>
                <div style={{ fontSize: 11.5, display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--bg-tertiary)', borderRadius: 6 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Data Footprint</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                    {conversations.length} chats, {memory.length} facts, {notes.length} notes
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── PERMISSIONS TAB ───────────────────────────────────────────── */}
      {activeTab === 'permissions' && (
        <div className="fade-in">
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="settings-section-title"><Lock size={14} /> System Access Permissions</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              {grantedCount} of {permissionItems.length} access policies are active. Toggle below to instantly adjust Luna's integration level.
            </div>
            <div className="flex flex-col gap-3">
              {permissionItems.map(({ key, icon: Icon, title, desc, risk }) => (
                <div key={key} className="setting-row" style={{
                  padding: '16px 20px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-tertiary)',
                  gap: 16
                }}>
                  <div style={{
                    padding: 8,
                    borderRadius: 8,
                    background: risk === 'high' ? 'rgba(244,63,94,0.08)' : risk === 'medium' ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)',
                    color: risk === 'high' ? 'var(--danger)' : risk === 'medium' ? 'var(--warning)' : 'var(--success)',
                    flexShrink: 0
                  }}>
                    <Icon size={18} />
                  </div>
                  <div className="setting-info" style={{ flex: 1 }}>
                    <div className="setting-name" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
                      {title}
                      <span style={{
                        fontSize: 9,
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: risk === 'high' ? 'rgba(244,63,94,0.15)' : risk === 'medium' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                        color: risk === 'high' ? 'var(--danger)' : risk === 'medium' ? 'var(--warning)' : 'var(--success)',
                      }}>
                        {risk} risk
                      </span>
                    </div>
                    <div className="setting-desc" style={{ fontSize: 11.5, marginTop: 4 }}>{desc}</div>
                  </div>
                  <Toggle checked={!!permissions[key]} onChange={(v) => updatePermission(key, v)} />
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <AlertTriangle size={16} color="var(--amber)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Desktop automation features like organizing folders and launching applications are completely offline. Revoking <strong>Desktop Automation</strong> restricts Luna from invoking any native launcher shell utilities.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── CONNECTIONS TAB ───────────────────────────────────────────── */}
      {activeTab === 'connections' && (
        <div className="fade-in flex flex-col gap-4">
          <div className="card">
            <div className="settings-section-title"><Plug size={14} /> Local Data Connections Flow Map</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Luna operates using a completely closed-loop local architecture. Air-gapped pipeline schematic:
            </p>

            {/* Interactive Data Flow Map */}
            <div className="flow-map-container">
              <div className="flow-node active">
                <div className="flow-node-icon"><Database size={16} /></div>
                <span style={{ fontSize: 11, fontWeight: 650, marginTop: 4 }}>User Local Data</span>
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Files / Memories</span>
              </div>
              <div className="flow-connector active"></div>
              <div className="flow-node active" style={{ borderColor: 'var(--accent)', boxShadow: '0 0 10px var(--accent-glow)' }}>
                <div className="flow-node-icon" style={{ color: 'var(--accent)' }}><Shield size={16} /></div>
                <span style={{ fontSize: 11, fontWeight: 650, marginTop: 4 }}>Luna Core App</span>
                <span style={{ fontSize: 9, color: 'var(--accent-light)' }}>100% On-Device</span>
              </div>
              <div className="flow-connector active"></div>
              <div className="flow-node active">
                <div className="flow-node-icon"><Brain size={16} /></div>
                <span style={{ fontSize: 11, fontWeight: 650, marginTop: 4 }}>Local Ollama</span>
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>127.0.0.1:11434</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="settings-section-title"><Info size={14} /> Connected Local Subsystems</div>
            <div className="flex flex-col gap-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {connectionsList.map((conn) => (
                <div
                  key={conn.name}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: conn.status === 'active' ? 'rgba(39,199,184,0.02)' : 'rgba(255,255,255,0.01)',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{conn.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conn.name}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conn.desc}</div>
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: 10, fontWeight: 700,
                    textTransform: 'uppercase',
                    color: conn.status === 'active' ? 'var(--accent)' : 'var(--text-muted)',
                  }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: conn.status === 'active' ? 'var(--accent)' : 'var(--text-muted)',
                    }} />
                    {conn.status === 'active' ? 'Active' : 'Offline'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── MEMORIES TAB ──────────────────────────────────────────────── */}
      {activeTab === 'memories' && (
        <div className="fade-in flex flex-col gap-4">
          <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 650, color: 'var(--text-primary)' }}>Stored Local Knowledge</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {memory.length} facts learned contextually. Select or search facts to manage.
              </div>
            </div>
            <div className="flex gap-2">
              {filteredMemory.length > 0 && (
                <button className="btn btn-secondary" style={{ fontSize: 11.5, color: 'var(--danger)', borderColor: 'rgba(244,63,94,0.2)' }} onClick={deleteFilteredMemories}>
                  <Trash2 size={12} /> Clear Filtered ({filteredMemory.length})
                </button>
              )}
              <button className="btn btn-primary" style={{ fontSize: 11.5 }} onClick={() => navigate('/memory')}>
                Open Memory Hub
              </button>
            </div>
          </div>

          <div className="card">
            <div className="flex gap-2 items-center" style={{ padding: '2px 0' }}>
              <Search size={14} color="var(--text-muted)" />
              <input
                className="input-field"
                style={{ flex: 1, border: 'none', background: 'transparent', padding: '6px 0', minHeight: 'auto' }}
                placeholder="Type to search through learned local memories..."
                value={memSearch}
                onChange={(e) => setMemSearch(e.target.value)}
              />
              {memSearch && (
                <button className="btn btn-icon btn-ghost" onClick={() => setMemSearch('')} style={{ width: 20, height: 20 }}>
                  <XCircle size={12} />
                </button>
              )}
            </div>
          </div>

          {filteredMemory.length === 0 ? (
            <div className="empty-state card" style={{ padding: 40 }}>
              <Brain size={36} color="var(--text-muted)" />
              <p style={{ fontSize: 13, marginTop: 8, color: 'var(--text-muted)' }}>
                {memory.length === 0 ? 'No local memory profiles have been saved yet.' : 'No memory elements match your criteria.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2" style={{ maxHeight: 350, overflowY: 'auto', paddingRight: 4 }}>
              {filteredMemory.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', borderRadius: 8,
                    border: `1px solid ${item.pinned ? 'var(--accent)' : 'var(--border)'}`,
                    background: item.pinned ? 'rgba(39,199,184,0.03)' : 'var(--bg-card)',
                    transition: 'all 0.15s ease'
                  }}
                  className="memory-row-element"
                >
                  <Eye size={13} color="var(--accent)" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 12.5, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    {item.content}
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, display: 'flex', gap: 8 }}>
                      <span>Learned {fmtDate(item.createdAt)}</span>
                      {item.pinned && <span style={{ color: 'var(--accent)' }}>📌 Pinned</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="btn btn-icon btn-ghost"
                      onClick={() => pinMemory(item.id)}
                      style={{ width: 28, height: 28 }}
                      title={item.pinned ? 'Unpin fact' : 'Pin fact'}
                    >
                      <span style={{ fontSize: 11 }}>📌</span>
                    </button>
                    <button
                      className="btn btn-icon btn-ghost"
                      onClick={async () => { await deleteMemory(item.id); toast.success('Memory fact forgotten') }}
                      title="Forget this memory"
                      style={{ width: 28, height: 28 }}
                    >
                      <Trash2 size={12} color="var(--danger)" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── ACTIVITY TAB ──────────────────────────────────────────────── */}
      {activeTab === 'activity' && (
        <div className="fade-in flex flex-col gap-4">
          <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 650, color: 'var(--text-primary)' }}>Local Operation Audit Log</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Audit details of recent conversational queries and memory events.
              </div>
            </div>
            <div className="flex gap-2 items-center" style={{ flexWrap: 'wrap' }}>
              <div className="flex items-center gap-1" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 8, padding: 3 }}>
                {[
                  { id: 'all', label: 'All Operations' },
                  { id: 'conversation', label: 'Conversations' },
                  { id: 'memory', label: 'Memory' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    className={`btn ${activityFilter === opt.id ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: 10.5, padding: '4px 10px', minHeight: 'auto', borderRadius: 6 }}
                    onClick={() => setActivityFilter(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex gap-2 items-center" style={{ padding: '2px 0' }}>
              <Search size={14} color="var(--text-muted)" />
              <input
                className="input-field"
                style={{ flex: 1, border: 'none', background: 'transparent', padding: '6px 0', minHeight: 'auto' }}
                placeholder="Search audit actions..."
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
              />
              {activitySearch && (
                <button className="btn btn-icon btn-ghost" onClick={() => setActivitySearch('')} style={{ width: 20, height: 20 }}>
                  <XCircle size={12} />
                </button>
              )}
            </div>
          </div>

          {filteredActivityLog.length === 0 ? (
            <div className="empty-state card" style={{ padding: 40 }}>
              <History size={36} color="var(--text-muted)" />
              <p style={{ fontSize: 13, marginTop: 8, color: 'var(--text-muted)' }}>No audit events found.</p>
            </div>
          ) : (
            <div className="timeline-container">
              {filteredActivityLog.map((item, idx) => (
                <div key={idx} className={`timeline-item ${item.type}`}>
                  <div className="timeline-dot" style={{ borderColor: item.type === 'memory' ? 'var(--accent-purple)' : 'var(--accent)' }} />
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <div className="timeline-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <item.icon size={12} color={item.type === 'memory' ? 'var(--accent-purple)' : 'var(--accent)'} />
                        <span>{item.title}</span>
                      </div>
                      <span className="timeline-time">{fmtDate(item.date)}</span>
                    </div>
                    <div className="timeline-body">{item.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── DELETE DATA TAB ───────────────────────────────────────────── */}
      {activeTab === 'delete' && (
        <div className="fade-in flex flex-col gap-4">
          <div className="card" style={{ borderColor: 'rgba(244, 63, 94, 0.2)' }}>
            <div className="settings-section-title" style={{ color: 'var(--danger)' }}>
              <AlertTriangle size={14} /> Danger Zone Control Panel
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              Permanently wipe data collections stored on-disk. Reset operations cannot be reversed.
            </div>

            <div className="flex flex-col gap-1">
              {[
                {
                  title: 'Clear Local Memories',
                  desc: `Forget all ${memory.length} contextual facts stored inside index files.`,
                  count: memory.length,
                  action: async () => { await clearMemory(); toast.success('Local memories successfully cleared') },
                },
                {
                  title: 'Wipe Conversations & Messages',
                  desc: `Remove all ${conversations.length} chats containing ${totalMessages} assistant logs.`,
                  count: conversations.length,
                  action: async () => { await clearAllConversations(); toast.success('Conversations history cleared') },
                },
                {
                  title: 'Clear Local Tasks',
                  desc: `Delete all ${tasks.length} task entries.`,
                  count: tasks.length,
                  action: async () => { await saveTasks([]); toast.success('Saved tasks cleared') },
                },
                {
                  title: 'Clear Contacts List',
                  desc: `Wipe all ${contacts.length} saved contact cards.`,
                  count: contacts.length,
                  action: async () => { await saveContacts([]); toast.success('Contacts database cleared') },
                },
                {
                  title: 'Flush Calendar Events',
                  desc: `Clear all ${calendar.length} events scheduled in index files.`,
                  count: calendar.length,
                  action: async () => { await saveCalendar([]); toast.success('Calendar schedule cleared') },
                },
              ].map((item) => (
                <div key={item.title} className="flex items-center justify-between" style={{
                  padding: '14px 0',
                  borderBottom: '1px solid var(--border)',
                }}>
                  <div>
                    <div className="setting-name" style={{ fontSize: 13.5 }}>{item.title}</div>
                    <div className="setting-desc" style={{ fontSize: 11.5, marginTop: 2 }}>{item.desc}</div>
                  </div>
                  <button
                    className="btn btn-danger"
                    style={{ fontSize: 11.5, padding: '5px 12px', flexShrink: 0 }}
                    disabled={item.count === 0}
                    onClick={() => setConfirmTarget({
                      title: item.title + '?',
                      desc: item.desc + ' This action is absolute and cannot be undone.',
                      action: item.action,
                    })}
                  >
                    <Trash2 size={12} /> Wipe
                  </button>
                </div>
              ))}
            </div>

            {/* Clear All Reset & Factory Reset */}
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={exportData}>
                <Download size={13} /> Download Full System Backup Before Clearing
              </button>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
                <button
                  className="btn btn-danger"
                  style={{ width: '100%', justifyContent: 'center', background: 'rgba(244, 63, 94, 0.08)', color: 'var(--danger)', fontWeight: 700 }}
                  onClick={() => setNuclearStep(1)}
                >
                  <AlertTriangle size={13} /> Complete System Reset (Nuclear Factory Option)
                </button>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <Shield size={16} color="var(--accent)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Since Luna runs on a completely offline client pipeline, no data has ever been uploaded to cloud nodes. Factory resetting is local and guarantees absolute deletion from your system drive.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Granular Deletion Confirmation Modal */}
      <ConfirmDeleteModal
        open={!!confirmTarget}
        title={confirmTarget?.title || ''}
        desc={confirmTarget?.desc || ''}
        onConfirm={async () => {
          if (confirmTarget?.action) await confirmTarget.action()
          setConfirmTarget(null)
        }}
        onCancel={() => setConfirmTarget(null)}
      />

      {/* Complete System Nuclear Reset Modal (Multi-step) */}
      {nuclearStep > 0 && (
        <div className="modal-overlay" onClick={() => setNuclearStep(0)}>
          <div className="card modal-card" onClick={(e) => e.stopPropagation()} style={{ borderColor: 'var(--danger)' }}>
            <div className="flex items-center gap-2" style={{ color: 'var(--danger)', marginBottom: 12 }}>
              <AlertTriangle size={18} />
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 700 }}>
                {nuclearStep === 1 ? 'Execute Nuclear Factory Reset?' : 'CRITICAL WARNING: Absolute Reset'}
              </h3>
            </div>
            
            <p className="text-sm text-secondary" style={{ marginBottom: 16, lineHeight: 1.5 }}>
              {nuclearStep === 1 ? (
                'This will instantly erase ALL chats, memories, tasks, contacts, calendar events, personal settings, and custom personality presets. The application will restart back to its factory wizard stage.'
              ) : (
                'Are you absolutely positive? No backup files will be saved, and your local data indices will be deleted. This cannot be undone.'
              )}
            </p>

            <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setNuclearStep(0)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                style={{ background: 'var(--danger)', color: 'white' }}
                onClick={nuclearStep === 1 ? () => setNuclearStep(2) : performNuclearReset}
              >
                {nuclearStep === 1 ? 'Yes, I Understand' : 'Wipe Everything Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
