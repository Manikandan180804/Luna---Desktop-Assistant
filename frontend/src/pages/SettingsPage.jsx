import React, { useState } from 'react'
import { Cpu, RefreshCw, Save, Settings, Sparkles } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { toast } from '../components/Toast'
import { getTranslation } from '../services/translations'

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
      French: 'Êtes-vous sûr de vouloir lancer à nouveau l\'assistant de configuration ? Vos discussions et votre mémoire ne seront pas supprimées.',
      German: 'Sind Sie sicher, dass Sie den Einrichtungsassistenten erneut ausführen möchten? Ihre Chats und Ihr Speicher werden nicht gelöscht.',
      Chinese: '您确定要重新运行设置向导吗？您的聊天记录和本地记忆不会被删除。',
      Hindi: 'क्या आप वाकई सेटअप विज़ार्ड फिर से चलाना चाहते हैं? आपके चैट और मेमोरी डिलीट नहीं होंगे।',
      Portuguese: 'Tem certeza de que deseja executar o assistente de configuração novamente? Seus chats e memória não serão excluídos.',
      Japanese: 'セットアップウィザードを再実行してもよろしいですか？チャット履歴やメモリは削除されません。'
    }

    const currentLang = settings?.language || 'English'
    if (confirm(confirmMsg[currentLang] || confirmMsg.English)) {
      await saveSettings({ ...settings, onboardingComplete: false })
    }
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
        <div>
          <div className="settings-section">
            <div className="settings-section-title">
              <Settings size={14} /> {t.settingsTitle}
            </div>
            <div className="form-group">
              <label className="input-label">{t.assistantName}</label>
              <input className="input-field" value={local.assistantName} onChange={(event) => update('assistantName', event.target.value)} />
            </div>
            <div className="form-group">
              <label className="input-label">{t.userNameLabel}</label>
              <input className="input-field" value={local.userName} onChange={(event) => update('userName', event.target.value)} />
            </div>
            <div className="form-group">
              <label className="input-label">{t.systemPromptLabel}</label>
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
              <Sparkles size={14} /> {t.experienceTitle}
            </div>
            <div className="setting-row">
              <div className="setting-info">
                <div className="setting-name">{t.notificationsLabel}</div>
                <div className="setting-desc">{t.notificationsDesc}</div>
              </div>
              <Toggle checked={!!local.notifications} onChange={(value) => update('notifications', value)} />
            </div>
            <div className="setting-row">
              <div className="setting-info">
                <div className="setting-name">{t.mockOfflineLabel}</div>
                <div className="setting-desc">{t.mockOfflineDesc}</div>
              </div>
              <Toggle checked={local.mockWhenOffline !== false} onChange={(value) => update('mockWhenOffline', value)} />
            </div>
            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="input-label">{t.colorThemeLabel}</label>
              <select className="input-field" value={local.theme || 'dark'} onChange={(event) => update('theme', event.target.value)}>
                <option value="dark">{t.themeDark}</option>
                <option value="light">{t.themeLight}</option>
                <option value="system">{t.themeSystem}</option>
              </select>
            </div>
            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="input-label">{t.languageLabel}</label>
              <select className="input-field" value={local.language || 'English'} onChange={(event) => update('language', event.target.value)}>
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
            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="input-label">{t.inferenceModeLabel}</label>
              <select className="input-field" value={local.inferenceMode || 'auto'} onChange={(event) => update('inferenceMode', event.target.value)}>
                <option value="auto">{t.inferenceAuto}</option>
                <option value="ollama">{t.inferenceOllama}</option>
                <option value="mock">{t.inferenceMock}</option>
              </select>
            </div>
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
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
        </div>

        <div>
          <div className="settings-section">
            <div className="settings-section-title">
              <Cpu size={14} /> {t.localAiTitle}
            </div>
            <div className="form-group">
              <label className="input-label">{t.ollamaUrlLabel}</label>
              <div className="flex gap-2">
                <input className="input-field" style={{ flex: 1 }} value={local.ollamaUrl} onChange={(event) => update('ollamaUrl', event.target.value)} />
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
              <input className="input-field" value={local.model} onChange={(event) => update('model', event.target.value)} placeholder="llama3.2" />
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
