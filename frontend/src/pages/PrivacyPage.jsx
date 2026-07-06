import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Database, Download, EyeOff, FolderOpen, Lock, Shield, Trash2, Wand2,
  Brain, History, Plug, AlertTriangle, CheckCircle, Eye, Clock, MessageSquare,
  Search, FileText, Volume2, Mic
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
    memory, conversations, tasks, notes, contacts, calendar,
    clearMemory, clearAllConversations, saveTasks, saveContacts, saveCalendar,
    saveSettings, settings, deleteMemory, pinMemory,
  } = useApp()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [confirmTarget, setConfirmTarget] = useState(null) // { title, desc, action }
  const [memSearch, setMemSearch] = useState('')

  const permissions = settings.permissions || {}
  const totalRecords = memory.length + conversations.length + tasks.length + notes.length + contacts.length + calendar.length
  const totalMessages = conversations.reduce((sum, c) => sum + (c.messages?.length || 0), 0)

  const updatePermission = async (key, value) => {
    await saveSettings({ permissions: { ...permissions, [key]: value } })
    toast.success('Permission updated')
  }

  const exportData = async () => {
    const data = {
      memory, conversations, tasks, notes, contacts, calendar, settings,
      exportedAt: new Date().toISOString(),
    }
    const ok = await window.luna.saveFileDialog('luna-backup.json', JSON.stringify(data, null, 2))
    if (ok) toast.success('Data exported successfully')
  }

  const filteredMemory = useMemo(() => {
    const q = memSearch.toLowerCase()
    return memory
      .filter((m) => m.content.toLowerCase().includes(q))
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
  }, [memory, memSearch])

  const activityLog = useMemo(() => {
    const items = []
    conversations.forEach((c) => {
      items.push({
        type: 'conversation',
        title: c.title || 'Chat',
        detail: `${c.messages?.length || 0} messages`,
        date: c.updatedAt || c.createdAt,
        icon: MessageSquare,
      })
    })
    memory.slice(0, 20).forEach((m) => {
      items.push({
        type: 'memory',
        title: m.content.slice(0, 60),
        detail: m.pinned ? 'Pinned' : 'Learned fact',
        date: m.createdAt,
        icon: Brain,
      })
    })
    return items.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 40)
  }, [conversations, memory])

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
    { key: 'files', icon: FolderOpen, title: 'File Access', desc: 'Read files you select through the system picker.', risk: 'medium' },
    { key: 'clipboard', icon: Download, title: 'Clipboard', desc: 'Copy generated text to your clipboard.', risk: 'low' },
    { key: 'notifications', icon: Shield, title: 'Notifications', desc: 'Show system-level desktop notifications.', risk: 'low' },
    { key: 'automation', icon: Wand2, title: 'Desktop Automation', desc: 'Launch apps and organise folders on your behalf.', risk: 'high' },
  ]

  const connectionsList = [
    { name: 'Ollama (Local AI)', status: 'active', desc: `Model inference at ${settings.ollamaUrl}`, icon: '🧠' },
    { name: 'Local File System', status: permissions.files ? 'active' : 'inactive', desc: 'Read-only via file picker dialog', icon: '📁' },
    { name: 'System Clipboard', status: permissions.clipboard ? 'active' : 'inactive', desc: 'Copy-only, never reads', icon: '📋' },
    { name: 'OS Notifications', status: permissions.notifications ? 'active' : 'inactive', desc: 'Desktop alert delivery', icon: '🔔' },
    { name: 'App Launcher', status: permissions.automation ? 'active' : 'inactive', desc: 'Start registered desktop apps', icon: '🚀' },
    { name: 'Speech Recognition', status: settings.wakeWord || settings.voice ? 'active' : 'inactive', desc: 'Browser Web Speech API (local)', icon: '🎤' },
  ]

  const grantedCount = permissionItems.filter((p) => !!permissions[p.key]).length
  const deniedCount = permissionItems.length - grantedCount

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1>Privacy & Transparency</h1>
        <p>Full visibility into what Luna can access. Everything runs locally on your device.</p>
      </div>

      {/* Tab Navigation */}
      <div className="tabs" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`tab ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}>
            <Icon size={13} style={{ marginRight: 5 }} /> {label}
          </button>
        ))}
      </div>

      {/* ─── OVERVIEW TAB ──────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="fade-in">
          {/* Stats row */}
          <div className="grid-3" style={{ marginBottom: 24 }}>
            {[
              { label: 'Permissions Granted', value: `${grantedCount} / ${permissionItems.length}`, icon: Lock, color: 'var(--accent)' },
              { label: 'Memory Items', value: memory.length, icon: Brain, color: '#a78bfa' },
              { label: 'Total Records', value: totalRecords, icon: Database, color: '#f97316' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card" style={{ textAlign: 'center', padding: '20px 16px' }}>
                <Icon size={22} color={color} style={{ margin: '0 auto 10px' }} />
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>

          <div className="grid-2" style={{ gap: 20, alignItems: 'start' }}>
            {/* Privacy Guarantees */}
            <div className="card">
              <div className="settings-section-title"><EyeOff size={14} /> Privacy Guarantees</div>
              {[
                { icon: Lock, title: 'Local-only storage', desc: 'All data lives in your OS app data directory.' },
                { icon: EyeOff, title: 'Zero telemetry', desc: 'No analytics, tracking, or usage events are sent.' },
                { icon: Shield, title: 'Local AI inference', desc: 'Ollama runs on your machine — no cloud APIs.' },
                { icon: AlertTriangle, title: 'Permission-gated actions', desc: 'Destructive tasks always require explicit consent.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="setting-row">
                  <CheckCircle size={15} color="var(--accent)" style={{ flexShrink: 0 }} />
                  <div className="setting-info" style={{ marginLeft: 8 }}>
                    <div className="setting-name">{title}</div>
                    <div className="setting-desc">{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col gap-3">
              <div className="card">
                <div className="settings-section-title"><Database size={14} /> Quick Actions</div>
                <div className="flex flex-col gap-3">
                  <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={exportData}>
                    <Download size={13} /> Export All Data as JSON
                  </button>
                  <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setActiveTab('permissions')}>
                    <Lock size={13} /> Review Permissions
                  </button>
                  <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setActiveTab('delete')}>
                    <Trash2 size={13} /> Manage & Delete Data
                  </button>
                </div>
              </div>
              <div className="card" style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  <strong style={{ color: 'var(--text-secondary)' }}>Data footprint:</strong> {totalRecords} records,{' '}
                  {totalMessages} messages, {contacts.length} contacts, {calendar.length} events.
                  Everything is stored as local JSON files.
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
            <div className="settings-section-title"><Lock size={14} /> Granted Permissions</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              {grantedCount} of {permissionItems.length} permissions are currently enabled. Toggle any permission to revoke or grant access instantly.
            </div>
            {permissionItems.map(({ key, icon: Icon, title, desc, risk }) => (
              <div key={key} className="setting-row" style={{ padding: '12px 0' }}>
                <Icon size={16} color="var(--accent)" style={{ flexShrink: 0 }} />
                <div className="setting-info" style={{ marginLeft: 10, flex: 1 }}>
                  <div className="setting-name" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {title}
                    <span style={{
                      fontSize: 9,
                      padding: '1px 6px',
                      borderRadius: 4,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      background: risk === 'high' ? 'rgba(239,68,68,0.12)' : risk === 'medium' ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.12)',
                      color: risk === 'high' ? '#ef4444' : risk === 'medium' ? '#f59e0b' : '#22c55e',
                    }}>
                      {risk} risk
                    </span>
                  </div>
                  <div className="setting-desc">{desc}</div>
                </div>
                <Toggle checked={!!permissions[key]} onChange={(v) => updatePermission(key, v)} />
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Luna always asks before performing destructive operations like organising folders, regardless of
                these permission settings. Revoking <strong>Desktop Automation</strong> prevents Luna from launching any external applications.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── CONNECTIONS TAB ───────────────────────────────────────────── */}
      {activeTab === 'connections' && (
        <div className="fade-in">
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="settings-section-title"><Plug size={14} /> Connected Services</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Luna only connects to local services. No external cloud APIs are used.
            </div>
            <div className="flex flex-col gap-2">
              {connectionsList.map((conn) => (
                <div
                  key={conn.name}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: conn.status === 'active' ? 'rgba(39,199,184,0.04)' : 'transparent',
                  }}
                >
                  <span style={{ fontSize: 20 }}>{conn.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{conn.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{conn.desc}</div>
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 11, fontWeight: 600,
                    color: conn.status === 'active' ? 'var(--accent)' : 'var(--text-muted)',
                  }}>
                    <div style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: conn.status === 'active' ? 'var(--accent)' : 'var(--text-muted)',
                    }} />
                    {conn.status === 'active' ? 'Active' : 'Inactive'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <EyeOff size={16} color="var(--accent)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                All connections are <strong>local-only</strong>. Ollama runs on <code>{settings.ollamaUrl}</code>.
                Speech recognition uses the built-in browser Web Speech API — no audio is sent externally.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MEMORIES TAB ──────────────────────────────────────────────── */}
      {activeTab === 'memories' && (
        <div className="fade-in">
          <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {memory.length} memories stored locally. Luna uses these to personalize responses.
            </div>
            <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => navigate('/memory')}>
              Open Full Manager
            </button>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="flex gap-2 items-center" style={{ padding: '2px 0' }}>
              <Search size={14} color="var(--text-muted)" />
              <input
                className="input-field"
                style={{ flex: 1, border: 'none', background: 'transparent', padding: '6px 0' }}
                placeholder="Search memories..."
                value={memSearch}
                onChange={(e) => setMemSearch(e.target.value)}
              />
            </div>
          </div>

          {filteredMemory.length === 0 ? (
            <div className="empty-state card" style={{ padding: 32 }}>
              <Brain size={36} color="var(--text-muted)" />
              <p style={{ fontSize: 13, marginTop: 8, color: 'var(--text-muted)' }}>
                {memory.length === 0 ? 'No memories stored yet.' : 'No matches found.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2" style={{ maxHeight: 400, overflowY: 'auto' }}>
              {filteredMemory.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderRadius: 8,
                    border: `1px solid ${item.pinned ? 'var(--accent)' : 'var(--border)'}`,
                    background: item.pinned ? 'rgba(39,199,184,0.04)' : 'var(--bg-card)',
                  }}
                >
                  <Eye size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>
                    {item.content}
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
                      {fmtDate(item.createdAt)} {item.pinned && '• 📌 Pinned'}
                    </div>
                  </div>
                  <button
                    className="btn btn-icon btn-ghost"
                    onClick={async () => { await deleteMemory(item.id); toast.success('Deleted') }}
                    title="Delete memory"
                  >
                    <Trash2 size={12} color="var(--danger)" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── ACTIVITY TAB ──────────────────────────────────────────────── */}
      {activeTab === 'activity' && (
        <div className="fade-in">
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Recent activity across conversations and memory. All data stays on-device.
          </div>

          {activityLog.length === 0 ? (
            <div className="empty-state card" style={{ padding: 32 }}>
              <History size={36} color="var(--text-muted)" />
              <p style={{ fontSize: 13, marginTop: 8, color: 'var(--text-muted)' }}>No activity yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {activityLog.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-card)',
                  }}
                >
                  <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: item.type === 'conversation' ? 'rgba(99,102,241,0.1)' : 'rgba(168,85,247,0.1)',
                    flexShrink: 0,
                  }}>
                    <item.icon size={14} color={item.type === 'conversation' ? '#6366f1' : '#a855f7'} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.detail}</div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    <Clock size={10} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                    {fmtDate(item.date)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── DELETE DATA TAB ───────────────────────────────────────────── */}
      {activeTab === 'delete' && (
        <div className="fade-in">
          <div className="card" style={{ marginBottom: 20, borderColor: 'rgba(239,68,68,0.2)' }}>
            <div className="settings-section-title" style={{ color: '#ef4444' }}>
              <AlertTriangle size={14} /> Danger Zone
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              These actions permanently delete your data. This cannot be undone.
            </div>

            {[
              {
                title: 'Clear All Memories',
                desc: `${memory.length} memory items will be permanently deleted.`,
                count: memory.length,
                action: async () => { await clearMemory(); toast.success('All memories cleared') },
              },
              {
                title: 'Clear All Conversations',
                desc: `${conversations.length} conversations (${totalMessages} messages) will be permanently deleted.`,
                count: conversations.length,
                action: async () => { await clearAllConversations(); toast.success('All conversations cleared') },
              },
              {
                title: 'Clear All Tasks',
                desc: `${tasks.length} tasks will be permanently deleted.`,
                count: tasks.length,
                action: async () => { await saveTasks([]); toast.success('All tasks cleared') },
              },
              {
                title: 'Clear All Contacts',
                desc: `${contacts.length} contacts will be permanently deleted.`,
                count: contacts.length,
                action: async () => { await saveContacts([]); toast.success('All contacts cleared') },
              },
              {
                title: 'Clear Calendar Events',
                desc: `${calendar.length} events will be permanently deleted.`,
                count: calendar.length,
                action: async () => { await saveCalendar([]); toast.success('All events cleared') },
              },
            ].map((item) => (
              <div key={item.title} className="flex items-center justify-between" style={{
                padding: '12px 0',
                borderBottom: '1px solid var(--border)',
              }}>
                <div>
                  <div className="setting-name">{item.title}</div>
                  <div className="setting-desc">{item.desc}</div>
                </div>
                <button
                  className="btn btn-danger"
                  style={{ fontSize: 12, padding: '5px 12px', flexShrink: 0 }}
                  disabled={item.count === 0}
                  onClick={() => setConfirmTarget({
                    title: item.title + '?',
                    desc: item.desc + ' This cannot be undone.',
                    action: item.action,
                  })}
                >
                  <Trash2 size={12} /> Clear
                </button>
              </div>
            ))}

            <div style={{ marginTop: 20 }}>
              <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={exportData}>
                <Download size={13} /> Export Everything Before Deleting
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <Shield size={16} color="var(--accent)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Deleting data only affects your local device. Since Luna never sends data externally,
                there is nothing to delete from remote servers. Your privacy is absolute.
              </div>
            </div>
          </div>
        </div>
      )}

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
    </div>
  )
}
