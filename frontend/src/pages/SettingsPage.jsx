import React, { useState } from 'react'
import { Cpu, RefreshCw, Save, Settings, Sparkles } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { toast } from '../components/Toast'

const MODEL_SHORTLIST = [
  { name: 'llama3.2', quality: 'Good', speed: 'Fast', ram: '4-6 GB', bestFor: 'Everyday chat and planning' },
  { name: 'phi3', quality: 'Good', speed: 'Fast', ram: '6-8 GB', bestFor: 'Compact reasoning' },
  { name: 'qwen2.5', quality: 'Strong', speed: 'Medium', ram: '6-12 GB', bestFor: 'Multilingual work' },
  { name: 'mistral', quality: 'Strong', speed: 'Medium', ram: '8-12 GB', bestFor: 'Drafting and summaries' },
]

function Toggle({ checked, onChange }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="toggle-slider" />
    </label>
  )
}

export default function SettingsPage() {
  const { settings, saveSettings, availableModels, checkOllama, ollamaStatus } = useApp()
  const [local, setLocal] = useState({ ...settings })

  React.useEffect(() => {
    if (settings) {
      setLocal(settings)
    }
  }, [settings])

  const update = (key, value) => setLocal((current) => ({ ...current, [key]: value }))

  const handleSave = async () => {
    await saveSettings(local)
    toast.success('Settings saved')
  }

  const handleTestOllama = async () => {
    await saveSettings({ ollamaUrl: local.ollamaUrl })
    await checkOllama({ ollamaUrl: local.ollamaUrl })
    toast.info('Ollama connection checked')
  }

  return (
    <div className="page">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1>Settings</h1>
          <p>Configure Luna, local inference, and prototype behavior.</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave}>
          <Save size={13} /> Save Changes
        </button>
      </div>

      <div className="grid-2" style={{ gap: 24, alignItems: 'start' }}>
        <div>
          <div className="settings-section">
            <div className="settings-section-title">
              <Settings size={14} /> Assistant
            </div>
            <div className="form-group">
              <label className="input-label">Assistant name</label>
              <input className="input-field" value={local.assistantName} onChange={(event) => update('assistantName', event.target.value)} />
            </div>
            <div className="form-group">
              <label className="input-label">Your name</label>
              <input className="input-field" value={local.userName} onChange={(event) => update('userName', event.target.value)} />
            </div>
            <div className="form-group">
              <label className="input-label">System prompt</label>
              <textarea
                className="input-field"
                rows={5}
                value={local.systemPrompt}
                onChange={(event) => update('systemPrompt', event.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">
              <Sparkles size={14} /> Experience
            </div>
            <div className="setting-row">
              <div className="setting-info">
                <div className="setting-name">Notifications</div>
                <div className="setting-desc">Allow reminder notifications from Luna.</div>
              </div>
              <Toggle checked={!!local.notifications} onChange={(value) => update('notifications', value)} />
            </div>
            <div className="setting-row">
              <div className="setting-info">
                <div className="setting-name">Mock responses when Ollama is offline</div>
                <div className="setting-desc">Keep the prototype usable without a downloaded model.</div>
              </div>
              <Toggle checked={local.mockWhenOffline !== false} onChange={(value) => update('mockWhenOffline', value)} />
            </div>
            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="input-label">Color Theme</label>
              <select className="input-field" value={local.theme || 'dark'} onChange={(event) => update('theme', event.target.value)}>
                <option value="dark">Dark Theme</option>
                <option value="light">Light Theme</option>
                <option value="system">System Default</option>
              </select>
            </div>
            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="input-label">Inference mode</label>
              <select className="input-field" value={local.inferenceMode || 'auto'} onChange={(event) => update('inferenceMode', event.target.value)}>
                <option value="auto">Auto: Ollama when online, mock when offline</option>
                <option value="ollama">Ollama only</option>
                <option value="mock">Mock only</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <div className="settings-section">
            <div className="settings-section-title">
              <Cpu size={14} /> Local AI
            </div>
            <div className="form-group">
              <label className="input-label">Ollama server URL</label>
              <div className="flex gap-2">
                <input className="input-field" style={{ flex: 1 }} value={local.ollamaUrl} onChange={(event) => update('ollamaUrl', event.target.value)} />
                <button className="btn btn-secondary" onClick={handleTestOllama} title="Test connection">
                  <RefreshCw size={13} />
                </button>
              </div>
              <div className="flex items-center gap-2" style={{ marginTop: 8 }}>
                <div className={`status-dot ${ollamaStatus}`} />
                <span className="text-xs text-muted">Ollama is {ollamaStatus}</span>
              </div>
            </div>
            <div className="form-group">
              <label className="input-label">Model</label>
              <input className="input-field" value={local.model} onChange={(event) => update('model', event.target.value)} placeholder="llama3.2" />
            </div>
            {availableModels.length > 0 && (
              <div>
                <label className="input-label">Detected models</label>
                <div className="flex gap-2" style={{ flexWrap: 'wrap', marginTop: 4 }}>
                  {availableModels.map((model) => (
                    <button key={model.name} className="model-tag" onClick={() => update('model', model.name)}>
                      {model.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="settings-section-title">Model Decision Matrix</div>
            <div className="decision-table">
              <div className="decision-row decision-head">
                <span>Model</span>
                <span>Quality</span>
                <span>Speed</span>
                <span>RAM</span>
              </div>
              {MODEL_SHORTLIST.map((model) => (
                <button key={model.name} type="button" className="decision-row" onClick={() => update('model', model.name)}>
                  <span className="font-600">{model.name}</span>
                  <span>{model.quality}</span>
                  <span>{model.speed}</span>
                  <span>{model.ram}</span>
                </button>
              ))}
            </div>
            <div className="text-xs text-muted" style={{ marginTop: 10 }}>
              Recommended MVP default: llama3.2 for low memory use and quick startup on consumer hardware.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
