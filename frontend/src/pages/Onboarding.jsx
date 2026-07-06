import React, { useState, useRef } from 'react'
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
  const [mockWhenOffline, setMockWhenOffline] = useState(settings.mockWhenOffline !== false)
  const [language, setLanguage] = useState(settings.language || 'English')
  const [theme, setTheme] = useState(settings.theme || 'dark')

  // Use refs to make all text inputs completely uncontrolled
  // This eliminates React render cycle delays/locks entirely during typing
  const userNameRef = useRef(settings.userName || 'User')
  const assistantNameRef = useRef(settings.assistantName || 'Luna')
  const ollamaUrlRef = useRef(settings.ollamaUrl || 'http://localhost:11434')
  const modelRef = useRef(settings.model || 'llama3.2')
  
  const modelInputRef = useRef(null)

  const handleThemeChange = async (selectedTheme) => {
    setTheme(selectedTheme)
    await saveSettings({ theme: selectedTheme })
  }

  const finish = async () => {
    await saveSettings({
      userName: userNameRef.current.trim() || 'User',
      assistantName: assistantNameRef.current.trim() || 'Luna',
      ollamaUrl: ollamaUrlRef.current.trim() || 'http://localhost:11434',
      model: modelRef.current.trim() || 'llama3.2',
      mockWhenOffline,
      language,
      theme,
      onboardingComplete: true,
    })
  }

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <div key="welcome">
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div className="onboarding-logo">
                <Sparkles size={30} />
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 700 }}>Intelligent desktop automation</h2>
              <div style={{ 
                marginTop: 12, 
                color: 'var(--text-secondary)', 
                fontSize: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                alignItems: 'center'
              }}>
                <div>• Personalized conversations</div>
                <div>• Control your digital workspace</div>
              </div>
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
          </div>
        )
      case 1:
        return (
          <div key="profile">
            <h3 style={{ fontWeight: 700, marginBottom: 6 }}>Personalize Luna</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: 13 }}>
              These preferences are stored locally and can be changed later.
            </p>
            <div className="form-group">
              <label className="input-label" htmlFor="user-name-input">Your name</label>
              <input
                id="user-name-input"
                className="input-field"
                placeholder="Alex"
                defaultValue={userNameRef.current}
                onChange={(event) => { userNameRef.current = event.target.value }}
              />
            </div>
            <div className="form-group">
              <label className="input-label" htmlFor="assistant-name-input">Assistant name</label>
              <input
                id="assistant-name-input"
                className="input-field"
                placeholder="Luna"
                defaultValue={assistantNameRef.current}
                onChange={(event) => { assistantNameRef.current = event.target.value }}
              />
            </div>
            <div className="grid-2" style={{ gap: 12, marginTop: 12 }}>
              <div className="form-group">
                <label className="input-label" htmlFor="lang-select">Preferred Language</label>
                <select id="lang-select" className="input-field" value={language} onChange={(event) => setLanguage(event.target.value)}>
                  <option value="English">English</option>
                  <option value="Spanish">Spanish (Español)</option>
                  <option value="French">French (Français)</option>
                  <option value="German">German (Deutsch)</option>
                  <option value="Chinese">Chinese (中文)</option>
                  <option value="Hindi">Hindi (हिन्दी)</option>
                  <option value="Portuguese">Portuguese (Português)</option>
                  <option value="Japanese">Japanese (日本語)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="input-label" htmlFor="theme-select">Color Theme</label>
                <select id="theme-select" className="input-field" value={theme} onChange={(event) => handleThemeChange(event.target.value)}>
                  <option value="dark">Dark Theme</option>
                  <option value="light">Light Theme</option>
                  <option value="system">System Default</option>
                </select>
              </div>
            </div>
          </div>
        )
      case 2:
        return (
          <div key="model">
            <h3 style={{ fontWeight: 700, marginBottom: 6 }}>Choose a local model path</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 13 }}>
              Luna talks to Ollama when it is running and uses a built-in mock responder when it is not.
            </p>
            <div className="form-group">
              <label className="input-label" htmlFor="ollama-url-input">Ollama URL</label>
              <input
                id="ollama-url-input"
                className="input-field"
                defaultValue={ollamaUrlRef.current}
                onChange={(event) => { ollamaUrlRef.current = event.target.value }}
              />
            </div>
            <div className="form-group">
              <label className="input-label" htmlFor="model-name-input">Model name</label>
              <input
                ref={modelInputRef}
                id="model-name-input"
                className="input-field"
                placeholder="llama3.2"
                defaultValue={modelRef.current}
                onChange={(event) => { modelRef.current = event.target.value }}
              />
            </div>
            <div className="model-table">
              {MODEL_OPTIONS.map((option) => (
                <button
                  key={option.name}
                  type="button"
                  className="model-row"
                  onClick={() => {
                    modelRef.current = option.name
                    if (modelInputRef.current) {
                      modelInputRef.current.value = option.name
                    }
                  }}
                >
                  <span className="font-600">{option.name}</span>
                  <span>{option.size}</span>
                  <span>{option.ram}</span>
                  <span>{option.fit}</span>
                </button>
              ))}
            </div>
          </div>
        )
      case 3:
        return (
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
          </div>
        )
      case 4:
        return (
          <div key="ready" style={{ textAlign: 'center' }}>
            <div className="onboarding-logo">
              <CheckCircle size={30} />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>Luna is ready</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: 8, marginBottom: 24 }}>
              {assistantNameRef.current || 'Luna'} can chat, remember preferences, create notes, capture tasks, and preview safe desktop actions.
            </p>
            <div className="ready-panel">
              <div className="font-600" style={{ marginBottom: 6 }}>Recommended first run</div>
              <div className="text-secondary">Open Chat, ask for a short plan, then save useful details to Memory.</div>
            </div>
          </div>
        )
      default:
        return null
    }
  }

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

          {renderStepContent()}

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
