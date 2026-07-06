import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Cpu, RefreshCw, Save, Settings, Sparkles, Volume2,
  Brain, Sliders, Type, User, Trash2
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { toast } from '../components/Toast'
import { getTranslation } from '../services/translations'
import { getAvailableVoices } from '../services/voiceService'

const MODEL_SHORTLIST = [
  { name: 'llama3.2', quality: 'Good', speed: 'Fast', ram: '4-6 GB', bestFor: 'Everyday chat and planning' },
  { name: 'phi3', quality: 'Good', speed: 'Fast', ram: '6-8 GB', bestFor: 'Compact reasoning' },
  { name: 'qwen2.5', quality: 'Strong', speed: 'Medium', ram: '6-12 GB', bestFor: 'Multilingual work' },
  { name: 'mistral', quality: 'Strong', speed: 'Medium', ram: '8-12 GB', bestFor: 'Drafting and summaries' },
]

const PERSONALITY_PRESETS = [
  {
    id: 'friendly',
    label: '😊 Friendly',
    desc: 'Warm, helpful, empathetic',
    prompt: 'You are Luna, a warm, friendly, and empathetic AI desktop assistant. You run entirely locally, keep responses helpful and conversational, and always make the user feel supported.',
  },
  {
    id: 'professional',
    label: '💼 Professional',
    desc: 'Formal, precise, analytical',
    prompt: 'You are Luna, a professional AI desktop assistant. You run entirely locally, provide accurate and analytical responses, maintain a formal tone, and deliver concise actionable information.',
  },
  {
    id: 'technical',
    label: '⚙️ Technical',
    desc: 'Detailed, code-focused, precise',
    prompt: 'You are Luna, a technical AI desktop assistant. You run entirely locally, favor precision, include code snippets and configuration details when relevant, and use accurate technical terminology.',
  },
  {
    id: 'creative',
    label: '🎨 Creative',
    desc: 'Expressive, imaginative, engaging',
    prompt: 'You are Luna, a creative and enthusiastic AI desktop assistant. You run entirely locally, embrace imaginative thinking, use vivid language, and approach every task with curiosity and flair.',
  },
]

function Toggle({ checked, onChange }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="toggle-slider" />
    </label>
  )
}

function SegmentedControl({ options, value, onChange }) {
  return (
    <div style={{
      display: 'flex',
      gap: 2,
      background: 'var(--bg-tertiary)',
      borderRadius: 8,
      padding: 3,
      border: '1px solid var(--border)',
    }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          style={{
            flex: 1,
            padding: '5px 10px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: value === opt.value ? 600 : 400,
            color: value === opt.value ? 'var(--accent-light)' : 'var(--text-secondary)',
            background: value === opt.value ? 'var(--bg-card)' : 'transparent',
            border: value === opt.value ? '1px solid var(--accent)' : '1px solid transparent',
            boxShadow: value === opt.value ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
            transition: 'all 0.15s ease',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export default function SettingsPage() {
  const { settings, saveSettings, availableModels, checkOllama, ollamaStatus, memory, clearMemory } = useApp()
  const [local, setLocal] = useState({ ...settings })
  const [voices, setVoices] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    if (settings) setLocal(settings)
  }, [settings])

  useEffect(() => {
    const load = () => setVoices(getAvailableVoices())
    load()
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = load
    }
  }, [])

  const t = getTranslation(settings?.language || 'English')
  const update = (key, value) => setLocal((current) => ({ ...current, [key]: value }))

  const handleSave = async () => {
    await saveSettings(local)
    toast.success(t.settingsSaved)
  }

  const handleTestOllama = async () => {
    await saveSettings({ ollamaUrl: local.ollamaUrl })
    await checkOllama({ ollamaUrl: local.ollamaUrl })
    toast.info(t.ollamaChecked)
  }

  const handleResetOnboarding = async () => {
    const confirmMsg = {
      English: 'Are you sure you want to run the setup wizard again? Your chats and memory will not be deleted.',
      Spanish: '¿Estás seguro de que quieres ejecutar el asistente de configuración de nuevo? Tus chats y memoria no se borrarán.',
      French: "Êtes-vous sûr de vouloir lancer à nouveau l'assistant de configuration ? Vos discussions et votre mémoire ne seront pas supprimées.",
      German: 'Sind Sie sicher, dass Sie den Einrichtungsassistenten erneut ausführen möchten? Ihre Chats und Ihr Speicher werden nicht gelöscht.',
      Chinese: '您确定要重新运行设置向导吗？您的聊天记录和本地记忆不会被删除。',
      Hindi: 'क्या आप वाकई सेटअप विज़ार्ड फिर से चलाना चाहते हैं? आपके चैट और मेमोरी डिलीट नहीं होंगे।',
      Portuguese: 'Tem certeza de que deseja executar o assistente de configuração novamente? Seus chats e memória não serão excluídos.',
      Japanese: 'セットアップウィザードを再実行してもよろしいですか？チャット履歴やメモリは削除されません。',
    }
    const currentLang = settings?.language || 'English'
    if (confirm(confirmMsg[currentLang] || confirmMsg.English)) {
      await saveSettings({ ...settings, onboardingComplete: false })
    }
  }

  const handleClearAllMemory = async () => {
    if (!confirm('Are you sure you want to delete ALL saved memories? This cannot be undone.')) return
    await clearMemory()
    toast.success('All memories cleared.')
  }

  const applyPersonality = (preset) => {
    update('aiPersonality', preset.id)
    update('systemPrompt', preset.prompt)
  }

  return (
    <div className="page">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1>{t.settingsTitle}</h1>
          <p>{t.settingsDesc}</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave}>
          <Save size={13} /> {t.saveChanges}
        </button>
      </div>

      <div className="grid-2" style={{ gap: 24, alignItems: 'start' }}>

        {/* ── LEFT COLUMN ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Assistant Identity */}
          <div className="settings-section">
            <div className="settings-section-title">
              <User size={14} /> Assistant Identity
            </div>
            <div className="form-group">
              <label className="input-label">{t.assistantName}</label>
              <input className="input-field" value={local.assistantName} onChange={(e) => update('assistantName', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="input-label">{t.userNameLabel}</label>
              <input className="input-field" value={local.userName} onChange={(e) => update('userName', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="input-label">{t.systemPromptLabel}</label>
              <textarea
                className="input-field"
                rows={4}
                value={local.systemPrompt}
                onChange={(e) => update('systemPrompt', e.target.value)}
                style={{ resize: 'vertical' }}
              />
              <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                Tip: Selecting a personality preset below will auto-fill this field.
              </div>
            </div>
          </div>

          {/* AI Personality Presets */}
          <div className="settings-section">
            <div className="settings-section-title">
              <Sparkles size={14} /> AI Personality
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {PERSONALITY_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPersonality(preset)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    textAlign: 'left',
                    border: `1px solid ${local.aiPersonality === preset.id ? 'var(--accent)' : 'var(--border)'}`,
                    background: local.aiPersonality === preset.id
                      ? 'var(--accent-glow)'
                      : 'var(--bg-tertiary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: local.aiPersonality === preset.id ? 'var(--accent-light)' : 'var(--text-primary)',
                  }}>
                    {preset.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {preset.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Response Behaviour */}
          <div className="settings-section">
            <div className="settings-section-title">
              <Sliders size={14} /> Response Behaviour
            </div>
            <div className="form-group">
              <label className="input-label" style={{ marginBottom: 8 }}>Response Length</label>
              <SegmentedControl
                value={local.responseLength || 'balanced'}
                onChange={(v) => update('responseLength', v)}
                options={[
                  { label: '⚡ Concise', value: 'concise' },
                  { label: '⚖️ Balanced', value: 'balanced' },
                  { label: '📖 Detailed', value: 'detailed' },
                ]}
              />
              <div className="text-xs text-muted" style={{ marginTop: 6 }}>
                {local.responseLength === 'concise' && 'Luna answers in 1–3 sentences. Great for quick lookups.'}
                {local.responseLength === 'balanced' && 'Luna gives standard responses. The default experience.'}
                {local.responseLength === 'detailed' && 'Luna provides thorough, comprehensive explanations.'}
              </div>
            </div>
          </div>

          {/* Voice Assistant */}
          <div className="settings-section">
            <div className="settings-section-title">
              <Volume2 size={14} /> Voice Assistant
            </div>
            <div className="setting-row">
              <div className="setting-info">
                <div className="setting-name">Enable Voice Output</div>
                <div className="setting-desc">Read assistant messages out loud.</div>
              </div>
              <Toggle checked={!!local.voice} onChange={(v) => update('voice', v)} />
            </div>
            <div className="setting-row">
              <div className="setting-info">
                <div className="setting-name">Wake Word Detection</div>
                <div className="setting-desc">Listen for "Luna" in the background.</div>
              </div>
              <Toggle checked={!!local.wakeWord} onChange={(v) => update('wakeWord', v)} />
            </div>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="input-label">Assistant Voice</label>
              <select className="input-field" value={local.voiceName || ''} onChange={(e) => update('voiceName', e.target.value)}>
                <option value="">Default Language Voice</option>
                {voices.map((v) => (
                  <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                ))}
              </select>
            </div>
          </div>

        </div>

        {/* ── RIGHT COLUMN ────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Appearance */}
          <div className="settings-section">
            <div className="settings-section-title">
              <Type size={14} /> Appearance
            </div>
            <div className="form-group">
              <label className="input-label" style={{ marginBottom: 8 }}>Font Size</label>
              <SegmentedControl
                value={local.fontSize || 'medium'}
                onChange={(v) => update('fontSize', v)}
                options={[
                  { label: 'Small', value: 'small' },
                  { label: 'Medium', value: 'medium' },
                  { label: 'Large', value: 'large' },
                ]}
              />
            </div>
            <div className="form-group" style={{ marginTop: 14 }}>
              <label className="input-label">{t.colorThemeLabel}</label>
              <select className="input-field" value={local.theme || 'dark'} onChange={(e) => update('theme', e.target.value)}>
                <option value="dark">{t.themeDark}</option>
                <option value="light">{t.themeLight}</option>
                <option value="system">{t.themeSystem}</option>
              </select>
            </div>
            <div className="form-group" style={{ marginTop: 14 }}>
              <label className="input-label">{t.languageLabel}</label>
              <select className="input-field" value={local.language || 'English'} onChange={(e) => update('language', e.target.value)}>
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
          </div>

          {/* Experience toggles */}
          <div className="settings-section">
            <div className="settings-section-title">
              <Settings size={14} /> {t.experienceTitle}
            </div>
            <div className="setting-row">
              <div className="setting-info">
                <div className="setting-name">{t.notificationsLabel}</div>
                <div className="setting-desc">{t.notificationsDesc}</div>
              </div>
              <Toggle checked={!!local.notifications} onChange={(v) => update('notifications', v)} />
            </div>
            <div className="setting-row">
              <div className="setting-info">
                <div className="setting-name">{t.mockOfflineLabel}</div>
                <div className="setting-desc">{t.mockOfflineDesc}</div>
              </div>
              <Toggle checked={local.mockWhenOffline !== false} onChange={(v) => update('mockWhenOffline', v)} />
            </div>
            <div className="form-group" style={{ marginTop: 14 }}>
              <label className="input-label">{t.inferenceModeLabel}</label>
              <select className="input-field" value={local.inferenceMode || 'auto'} onChange={(e) => update('inferenceMode', e.target.value)}>
                <option value="auto">{t.inferenceAuto}</option>
                <option value="ollama">{t.inferenceOllama}</option>
                <option value="mock">{t.inferenceMock}</option>
              </select>
            </div>
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'center', color: 'var(--text-secondary)' }}
                onClick={handleResetOnboarding}
              >
                {t.runSetupAgain}
              </button>
            </div>
          </div>

          {/* Memory Management */}
          <div className="settings-section">
            <div className="settings-section-title">
              <Brain size={14} /> Memory Management
            </div>
            <div className="setting-row">
              <div className="setting-info">
                <div className="setting-name">Auto-Extract Memories</div>
                <div className="setting-desc">Luna automatically learns your preferences from chat.</div>
              </div>
              <Toggle checked={local.autoExtractMemory !== false} onChange={(v) => update('autoExtractMemory', v)} />
            </div>
            <div style={{
              marginTop: 12,
              padding: '10px 12px',
              background: 'var(--bg-tertiary)',
              borderRadius: 8,
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                  {memory?.length ?? 0} memories stored
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  All data is stored locally on your device.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: 12, padding: '5px 10px' }}
                  onClick={() => navigate('/memory')}
                >
                  Manage
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: 12, padding: '5px 10px', color: 'var(--danger)' }}
                  onClick={handleClearAllMemory}
                  disabled={!memory?.length}
                >
                  <Trash2 size={12} /> Clear All
                </button>
              </div>
            </div>
          </div>

          {/* Local AI */}
          <div className="settings-section">
            <div className="settings-section-title">
              <Cpu size={14} /> {t.localAiTitle}
            </div>
            <div className="form-group">
              <label className="input-label">{t.ollamaUrlLabel}</label>
              <div className="flex gap-2">
                <input className="input-field" style={{ flex: 1 }} value={local.ollamaUrl} onChange={(e) => update('ollamaUrl', e.target.value)} />
                <button className="btn btn-secondary" onClick={handleTestOllama} title={t.testConn}>
                  <RefreshCw size={13} />
                </button>
              </div>
              <div className="flex items-center gap-2" style={{ marginTop: 8 }}>
                <div className={`status-dot ${ollamaStatus}`} />
                <span className="text-xs text-muted">
                  {t.ollamaStatusLabel ? t.ollamaStatusLabel.replace('{status}', ollamaStatus) : `Ollama is ${ollamaStatus}`}
                </span>
              </div>
            </div>
            <div className="form-group">
              <label className="input-label">{t.modelLabel}</label>
              <input className="input-field" value={local.model} onChange={(e) => update('model', e.target.value)} placeholder="llama3.2" />
            </div>
            {availableModels.length > 0 && (
              <div>
                <label className="input-label">{t.detectedModels}</label>
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

          {/* Model Comparison Matrix */}
          <div className="card">
            <div className="settings-section-title">{t.modelMatrix}</div>
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
              {t.modelText}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
