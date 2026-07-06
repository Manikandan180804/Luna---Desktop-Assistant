import React, { useState } from 'react'
import { ArrowLeft, ArrowRight, Brain, CheckCircle, Cpu, FileText, Shield, Sparkles, X } from 'lucide-react'
import { useApp } from '../context/AppContext'

const STEPS = ['Welcome', 'Profile', 'Model', 'Privacy', 'Ready']

const MODEL_OPTIONS = [
  { name: 'llama3.2', size: '2B', ram: '4-6 GB', fit: 'Fast general chat' },
  { name: 'phi3', size: '3.8B', ram: '6-8 GB', fit: 'Small reasoning tasks' },
  { name: 'mistral', size: '7B', ram: '8-12 GB', fit: 'Higher quality drafting' },
  { name: 'qwen2.5', size: '3B/7B', ram: '6-12 GB', fit: 'Multilingual work' },
]

function Toggle({ checked, onChange }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="toggle-slider" />
    </label>
  )
}

export default function Onboarding() {
  const { saveSettings, settings } = useApp()
  const [step, setStep] = useState(0)
  const [userName, setUserName] = useState(settings.userName || '')
  const [assistantName, setAssistantName] = useState(settings.assistantName || 'Luna')
  const [ollamaUrl, setOllamaUrl] = useState(settings.ollamaUrl || 'http://localhost:11434')
  const [model, setModel] = useState(settings.model || 'llama3.2')
  const [mockWhenOffline, setMockWhenOffline] = useState(settings.mockWhenOffline !== false)

  const finish = async () => {
    await saveSettings({
      userName: userName.trim() || 'User',
      assistantName: assistantName.trim() || 'Luna',
      ollamaUrl,
      model,
      mockWhenOffline,
      onboardingComplete: true,
    })
  }

  const stepContent = [
    <div key="welcome">
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div className="onboarding-logo">
          <Sparkles size={30} />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700 }}>Meet Luna</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
          A local desktop AI assistant for chat, memory, notes, tasks, and permission-aware automation.
        </p>
      </div>
      <div className="grid-3" style={{ gap: 10, marginBottom: 8 }}>
        {[
          { icon: Shield, label: 'Local first' },
          { icon: Cpu, label: 'Ollama ready' },
          { icon: Brain, label: 'Editable memory' },
          { icon: FileText, label: 'Notes and files' },
          { icon: CheckCircle, label: 'Task capture' },
          { icon: Sparkles, label: 'Offline mock mode' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="feature-tile">
            <Icon size={16} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>,

    <div key="profile">
      <h3 style={{ fontWeight: 700, marginBottom: 6 }}>Personalize Luna</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 13 }}>
        These names are stored locally and can be changed later.
      </p>
      <div className="form-group">
        <label className="input-label">Your name</label>
        <input className="input-field" placeholder="Alex" value={userName} onChange={(event) => setUserName(event.target.value)} />
      </div>
      <div className="form-group">
        <label className="input-label">Assistant name</label>
        <input
          className="input-field"
          placeholder="Luna"
          value={assistantName}
          onChange={(event) => setAssistantName(event.target.value)}
        />
      </div>
    </div>,

    <div key="model">
      <h3 style={{ fontWeight: 700, marginBottom: 6 }}>Choose a local model path</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 13 }}>
        Luna talks to Ollama when it is running and uses a built-in mock responder when it is not.
      </p>
      <div className="form-group">
        <label className="input-label">Ollama URL</label>
        <input className="input-field" value={ollamaUrl} onChange={(event) => setOllamaUrl(event.target.value)} />
      </div>
      <div className="form-group">
        <label className="input-label">Model name</label>
        <input className="input-field" placeholder="llama3.2" value={model} onChange={(event) => setModel(event.target.value)} />
      </div>
      <div className="model-table">
        {MODEL_OPTIONS.map((option) => (
          <button key={option.name} type="button" className="model-row" onClick={() => setModel(option.name)}>
            <span className="font-600">{option.name}</span>
            <span>{option.size}</span>
            <span>{option.ram}</span>
            <span>{option.fit}</span>
          </button>
        ))}
      </div>
    </div>,

    <div key="privacy">
      <h3 style={{ fontWeight: 700, marginBottom: 6 }}>Privacy defaults</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 13 }}>
        Luna starts with conservative permissions and keeps data in the app data folder.
      </p>
      {[
        ['Local AI only', 'No hosted AI API is used by the prototype.'],
        ['Editable memory', 'Every saved memory can be viewed, pinned, or deleted.'],
        ['Permission prompts', 'File, clipboard, and automation capabilities are visible in Privacy.'],
        ['Exportable data', 'You can create a local JSON backup of Luna data.'],
      ].map(([title, desc]) => (
        <div key={title} className="setting-row">
          <Shield size={16} color="var(--accent-light)" />
          <div className="setting-info" style={{ marginLeft: 8 }}>
            <div className="setting-name">{title}</div>
            <div className="setting-desc">{desc}</div>
          </div>
        </div>
      ))}
      <div className="setting-row" style={{ marginTop: 8 }}>
        <div className="setting-info">
          <div className="setting-name">Use mock responses when Ollama is offline</div>
          <div className="setting-desc">Keeps the prototype useful on computers without a model installed.</div>
        </div>
        <Toggle checked={mockWhenOffline} onChange={setMockWhenOffline} />
      </div>
    </div>,

    <div key="ready" style={{ textAlign: 'center' }}>
      <div className="onboarding-logo">
        <CheckCircle size={30} />
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700 }}>Luna is ready</h2>
      <p style={{ color: 'var(--text-secondary)', marginTop: 8, marginBottom: 24 }}>
        {assistantName || 'Luna'} can chat, remember preferences, create notes, capture tasks, and preview safe desktop actions.
      </p>
      <div className="ready-panel">
        <div className="font-600" style={{ marginBottom: 6 }}>Recommended first run</div>
        <div className="text-secondary">Open Chat, ask for a short plan, then save useful details to Memory.</div>
      </div>
    </div>,
  ]

  return (
    <div style={{ background: 'var(--bg-primary)', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="titlebar">
        <div className="titlebar-left">
          <div className="titlebar-logo">
            <Sparkles size={13} />
          </div>
          <span className="titlebar-title">Luna AI Assistant Setup</span>
        </div>
        <div className="titlebar-controls">
          <button className="titlebar-btn close" onClick={() => window.luna.close()} title="Close">
            <X size={12} />
          </button>
        </div>
      </div>

      <div className="onboarding">
        <div className="onboarding-card">
          <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
            {STEPS.map((label, index) => (
              <div
                key={label}
                className={`step-dot ${index === step ? 'active' : index < step ? 'done' : ''}`}
                style={{ flex: 1, height: 4, borderRadius: 99 }}
              />
            ))}
          </div>

          {stepContent[step]}

          <div className="flex items-center justify-between" style={{ marginTop: 24 }}>
            {step > 0 ? (
              <button className="btn btn-secondary" onClick={() => setStep((current) => current - 1)}>
                <ArrowLeft size={14} /> Back
              </button>
            ) : (
              <div />
            )}
            {step < STEPS.length - 1 ? (
              <button className="btn btn-primary" onClick={() => setStep((current) => current + 1)}>
                {step === 0 ? 'Get Started' : 'Continue'} <ArrowRight size={14} />
              </button>
            ) : (
              <button className="btn btn-primary" onClick={finish}>
                Launch Luna <Sparkles size={14} />
              </button>
            )}
          </div>
        </div>

        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Luna AI Assistant v1.0 local prototype</div>
      </div>
    </div>
  )
}
