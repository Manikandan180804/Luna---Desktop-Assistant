import React from 'react'
import { Database, Download, EyeOff, FolderOpen, Lock, Shield, Trash2, Wand2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { toast } from '../components/Toast'

function Toggle({ checked, onChange }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="toggle-slider" />
    </label>
  )
}

export default function PrivacyPage() {
  const { memory, conversations, tasks, notes, clearMemory, saveSettings, settings } = useApp()
  const permissions = settings.permissions || {}
  const totalData = memory.length + conversations.length + tasks.length + notes.length

  const updatePermission = async (key, value) => {
    await saveSettings({ permissions: { ...permissions, [key]: value } })
    toast.success('Permission updated')
  }

  const handleClearMemory = async () => {
    await clearMemory()
    toast.success('All memory cleared')
  }

  const exportData = async () => {
    const data = { memory, conversations, tasks, notes, settings, exportedAt: new Date().toISOString() }
    const ok = await window.luna.saveFileDialog('luna-backup.json', JSON.stringify(data, null, 2))
    if (ok) toast.success('Data exported')
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Privacy & Data</h1>
        <p>Luna is local-first. Cloud AI APIs are disabled in this prototype.</p>
      </div>

      <div className="grid-3" style={{ marginBottom: 24 }}>
        {[
          { label: 'Memory Items', value: memory.length, icon: Database },
          { label: 'Conversations', value: conversations.length, icon: Shield },
          { label: 'Total Records', value: totalData, icon: Lock },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="card" style={{ textAlign: 'center' }}>
            <Icon size={22} color="var(--accent-light)" style={{ margin: '0 auto 10px' }} />
            <div className="privacy-stat-value">{value}</div>
            <div className="privacy-stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ gap: 20, alignItems: 'start' }}>
        <div className="card">
          <div className="settings-section-title">Permission Model</div>
          {[
            { key: 'files', icon: FolderOpen, title: 'Files', desc: 'Read chosen files through the system file picker.' },
            { key: 'clipboard', icon: Download, title: 'Clipboard', desc: 'Copy generated drafts when you request it.' },
            { key: 'notifications', icon: Shield, title: 'Notifications', desc: 'Show reminders through the operating system.' },
            { key: 'automation', icon: Wand2, title: 'Desktop automation', desc: 'Stage local actions before execution.' },
          ].map(({ key, icon: Icon, title, desc }) => (
            <div key={key} className="setting-row">
              <Icon size={16} color="var(--accent-light)" style={{ flexShrink: 0 }} />
              <div className="setting-info" style={{ marginLeft: 8 }}>
                <div className="setting-name">{title}</div>
                <div className="setting-desc">{desc}</div>
              </div>
              <Toggle checked={!!permissions[key]} onChange={(value) => updatePermission(key, value)} />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <div className="card">
            <div className="settings-section-title">Data Management</div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="setting-name">Clear all memory</div>
                  <div className="setting-desc">{memory.length} items stored</div>
                </div>
                <button className="btn btn-danger" onClick={handleClearMemory}>
                  <Trash2 size={13} /> Clear
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="setting-name">Export all data</div>
                  <div className="setting-desc">Create a local JSON backup.</div>
                </div>
                <button className="btn btn-secondary" onClick={exportData}>
                  <Database size={13} /> Export
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="settings-section-title">Storage & Network</div>
            {[
              { icon: Lock, title: 'Local JSON storage', desc: 'Data is written under the operating system app data directory.' },
              { icon: EyeOff, title: 'No telemetry', desc: 'The app does not send analytics or product usage events.' },
              { icon: Shield, title: 'Local inference policy', desc: 'Ollama is the primary AI bridge; mock mode is local and deterministic.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="setting-row">
                <Icon size={16} color="var(--accent-light)" style={{ flexShrink: 0 }} />
                <div className="setting-info" style={{ marginLeft: 8 }}>
                  <div className="setting-name">{title}</div>
                  <div className="setting-desc">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
