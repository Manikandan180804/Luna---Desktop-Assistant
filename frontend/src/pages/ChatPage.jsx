import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Paperclip, Brain, Copy, RefreshCw, Sparkles, X, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { v4 as uuidv4 } from 'uuid'
import { useApp } from '../context/AppContext'
import { toast } from '../components/Toast'
import { streamAssistantReply } from '../services/inference'
import { getTranslation } from '../services/translations'
import PermissionModal from '../components/PermissionModal'
import ActionCard from '../components/ActionCard'
import { parseIntent } from '../services/intentHandler'
import { speakText, stopSpeaking, VoiceRecognition } from '../services/voiceService'

function TypingIndicator({ assistantName = 'Luna' }) {
  const { settings } = useApp()
  const language = settings?.language || 'English'

  const getTypingStatuses = (lang, name) => {
    switch (lang) {
      case 'Spanish':
        return [
          `Tu ${name} responderá lo antes posible...`,
          'Consultando la memoria local...',
          'Formulando respuesta...',
          'Casi listo...'
        ]
      case 'French':
        return [
          `Votre ${name} répondra dès que possible...`,
          'Consultation de la mémoire locale...',
          'Formulation de la réponse...',
          'Presque prêt...'
        ]
      case 'German':
        return [
          `Ihr ${name} wird schnellstmöglich antworten...`,
          'Lokalen Speicher konsultieren...',
          'Antwort formulieren...',
          'Fast fertig...'
        ]
      case 'Chinese':
        return [
          `您的 ${name} 将尽快答复...`,
          '正在查询本地记忆...',
          '正在生成回答...',
          '即将完成...'
        ]
      case 'Hindi':
        return [
          `आपका ${name} जल्द ही जवाब देगा...`,
          'लोकल मेमोरी में देख रहे हैं...',
          'उत्तर तैयार कर रहे हैं...',
          'बस तैयार है...'
        ]
      case 'Portuguese':
        return [
          `Sua ${name} responderá o mais rápido possível...`,
          'Consultando a memória local...',
          'Formulando a resposta...',
          'Quase pronto...'
        ]
      case 'Japanese':
        return [
          `${name} がまもなく回答します...`,
          'ローカルメモリを参照中...',
          '回答を生成中...',
          'ほぼ完了しました...'
        ]
      default:
        return [
          `Your ${name} will respond ASAP...`,
          'Consulting local memory...',
          'Formulating response...',
          'Almost ready...'
        ]
    }
  }

  const statuses = React.useMemo(() => getTypingStatuses(language, assistantName), [language, assistantName])
  const [status, setStatus] = React.useState(statuses[0])

  React.useEffect(() => {
    let index = 0
    setStatus(statuses[0])
    const interval = setInterval(() => {
      index = (index + 1) % statuses.length
      setStatus(statuses[index])
    }, 2000)
    return () => clearInterval(interval)
  }, [statuses])

  return (
    <div className="message assistant fade-in">
      <div className="message-avatar">{assistantName[0] || 'L'}</div>
      <div className="typing-indicator" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
        <span style={{ fontSize: 12, marginLeft: 8, color: 'var(--text-secondary)', fontWeight: 500 }}>
          {status}
        </span>
      </div>
    </div>
  )
}

// ─── Action executor ─────────────────────────────────────────────────────────
async function executeIntent(intent, settings, onProgress) {
  const type = intent.type

  // ── Summarize PDF ──────────────────────────────────────────────────────────
  if (type === 'SUMMARIZE_PDF') {
    onProgress({ type, status: 'info', label: 'PDF Summary', detail: 'Attach a PDF, .txt, .md or .docx file using 📎 then ask again.' })
    return
  }

  // ── Create reminder ────────────────────────────────────────────────────────
  if (type === 'CREATE_REMINDER') {
    const { topic, delayMs, dueLabel } = intent
    onProgress({ type, status: 'pending', label: 'Setting Reminder…', detail: topic })
    setTimeout(async () => {
      if (settings?.notifications) {
        await window.luna.notify('⏰ Luna Reminder', topic)
      }
      toast.info(`⏰ REMINDER: ${topic}`)
    }, delayMs)
    onProgress({ type, status: 'success', label: 'Reminder Set', detail: topic, topic, dueLabel })
    return
  }

  // ── Search files ───────────────────────────────────────────────────────────
  if (type === 'SEARCH_FILES') {
    const { query } = intent
    onProgress({ type, status: 'pending', label: 'Searching Files…', detail: `Looking for "${query}"` })
    try {
      // Try to pick folder if not previously set
      let folderPath = null
      try {
        folderPath = await window.luna.openFolderDialog()
      } catch {
        // If openFolderDialog not supported fall back to home
      }
      if (!folderPath) {
        // Fallback: search home/Documents
        try {
          const sysInfo = await window.luna.systemInfo()
          folderPath = sysInfo?.homeDir || null
        } catch {}
      }
      if (!folderPath || folderPath.startsWith('/mock')) {
        onProgress({
          type, status: 'success', label: 'File Search',
          detail: `Search for "${query}"`,
          results: [{ name: 'resume.pdf', path: '/mock/Documents/resume.pdf', size: 204800, updatedAt: new Date().toISOString() }]
        })
        return
      }
      const res = await window.luna.searchFiles(folderPath, query)
      if (res.success) {
        onProgress({
          type, status: 'success',
          label: `File Search — ${res.results.length} result${res.results.length !== 1 ? 's' : ''}`,
          detail: `Searched for "${query}" in ${folderPath}`,
          results: res.results,
        })
      } else {
        onProgress({ type, status: 'error', label: 'File Search Failed', error: res.error })
      }
    } catch (err) {
      onProgress({ type, status: 'error', label: 'File Search Failed', error: err.message })
    }
    return
  }

  // ── Organize folder ────────────────────────────────────────────────────────
  if (type === 'ORGANIZE_FOLDER') {
    const { folder } = intent
    onProgress({ type, status: 'pending', label: `Organizing ${folder}…`, detail: 'Pick a folder to organize' })
    try {
      let folderPath = null
      try {
        folderPath = await window.luna.openFolderDialog()
      } catch {}
      if (!folderPath || folderPath.startsWith('/mock')) {
        // Mock success
        onProgress({ type, status: 'success', label: `${folder} Organized`, detail: `Files sorted into subfolders`, movedCount: 12 })
        return
      }
      const res = await window.luna.organizeFolder(folderPath)
      if (res.success) {
        onProgress({ type, status: 'success', label: `Folder Organized`, detail: folderPath, movedCount: res.movedCount })
        toast.success(`Organized ${res.movedCount} files`)
      } else {
        onProgress({ type, status: 'error', label: 'Organize Failed', error: res.error })
      }
    } catch (err) {
      onProgress({ type, status: 'error', label: 'Organize Failed', error: err.message })
    }
    return
  }

  // ── Open URL ───────────────────────────────────────────────────────────────
  if (type === 'OPEN_URL') {
    const { url, label } = intent
    onProgress({ type, status: 'pending', label: `Opening ${label || url}…` })
    try {
      await window.luna.openExternal(url)
      onProgress({ type, status: 'success', label: `Opened ${label || url}`, url })
      toast.success(`Opened ${label || url}`)
    } catch (err) {
      onProgress({ type, status: 'error', label: 'Failed to Open URL', error: err.message })
    }
    return
  }

  // ── Launch app ─────────────────────────────────────────────────────────────
  if (type === 'OPEN_APP') {
    const { appKey, label } = intent
    onProgress({ type, status: 'pending', label: `Launching ${label}…` })
    try {
      const res = await window.luna.launchApp(appKey)
      if (res.success) {
        onProgress({ type, status: 'success', label: `${label} Launched`, appLabel: label })
        toast.success(`Launched ${label}`)
      } else {
        onProgress({ type, status: 'error', label: `Launch Failed`, error: res.error })
        toast.error(`Failed to launch ${label}: ${res.error}`)
      }
    } catch (err) {
      onProgress({ type, status: 'error', label: 'Launch Failed', error: err.message })
    }
    return
  }

  // ── Compose email ──────────────────────────────────────────────────────────
  if (type === 'COMPOSE_EMAIL') {
    const { to } = intent
    const mailto = `mailto:${to}?subject=Luna%20Follow-up`
    onProgress({ type, status: 'pending', label: 'Opening Email Client…' })
    try {
      await window.luna.openExternal(mailto)
      onProgress({ type, status: 'success', label: 'Email Client Opened', url: mailto })
    } catch (err) {
      onProgress({ type, status: 'error', label: 'Failed to Open Email', error: err.message })
    }
  }

  // ── Smart Device Control ──────────────────────────────────────────────────
  if (type === 'SMART_DEVICE_CONTROL') {
    const { deviceName, action, value } = intent
    onProgress({ type, status: 'pending', label: 'Smart Home Control…', detail: `Connecting to ${deviceName}` })
    try {
      const devices = await window.luna.listSmartDevices()
      const query = deviceName.toLowerCase().trim()
      const device = devices.find(d => 
        d.name.toLowerCase().includes(query) || 
        query.includes(d.name.toLowerCase()) ||
        d.type.toLowerCase().includes(query)
      )

      if (!device) {
        onProgress({ 
          type, 
          status: 'error', 
          label: 'Smart Home Control Failed', 
          error: `Could not find smart device matching "${deviceName}". Configure devices in the Connectors panel.` 
        })
        return
      }

      onProgress({ type, status: 'pending', label: `Controlling ${device.name}…`, detail: `Sending command: ${action === 'set_value' ? `${action} (${value})` : action}` })

      const res = await window.luna.controlSmartDevice(device.id, action, value)

      if (res.success) {
        let actionLabel = action === 'turn_on' ? 'turned on' : (action === 'turn_off' ? 'turned off' : `set to ${value}`)
        if (device.type === 'thermostat' && action === 'set_value') actionLabel = `set temperature to ${value}°F`
        if (device.type === 'light' && action === 'set_value') actionLabel = `set brightness to ${value}%`
        if (device.type === 'speaker' && action === 'set_value') actionLabel = `set volume to ${value}%`

        onProgress({ 
          type, 
          status: 'success', 
          label: `${device.name} Controlled`, 
          detail: `Successfully ${actionLabel}`,
          device: res.device,
          actionLabel,
          haStatus: res.haStatus,
          mqttStatus: res.mqttStatus
        })
        toast.success(`${device.name} ${actionLabel}`)
      } else {
        onProgress({ type, status: 'error', label: 'Smart Home Control Failed', error: res.error })
      }
    } catch (err) {
      onProgress({ type, status: 'error', label: 'Smart Home Control Failed', error: err.message })
    }
  }
}

// ─── Message component ────────────────────────────────────────────────────────
function Message({ msg, onCopy, onRegenerate }) {
  const { settings } = useApp()
  const t = getTranslation(settings?.language || 'English')
  const isUser = msg.role === 'user'
  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`message ${msg.role} fade-in`}>
      <div className="message-avatar">{isUser ? 'You' : 'L'}</div>
      <div className="message-content">
        <div className="message-bubble">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {msg.images && msg.images.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                {msg.images.map((imgBase64, idx) => (
                  <img 
                    key={idx} 
                    src={`data:image/png;base64,${imgBase64}`} 
                    alt="Chat attachment" 
                    style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 6, objectFit: 'contain', border: '1px solid var(--border)' }} 
                  />
                ))}
              </div>
            )}
            {isUser ? (
              <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
            ) : (
              <div className="prose">
                <ReactMarkdown
                  components={{
                    code({ children, ...props }) {
                      return <code {...props}>{children}</code>
                    },
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            )}
            {/* Inline action result card */}
            {msg.actionCard && <ActionCard action={msg.actionCard} />}
          </div>
        </div>
        <div className="message-meta">
          <span className="message-time">{time}</span>
          {msg.provider && <span className="message-time">{msg.provider}</span>}
          <div className="message-actions">
            <button className="msg-action-btn" onClick={() => onCopy(msg.content)}>
              <Copy size={11} /> {t.copy}
            </button>
            {!isUser && (
              <button className="msg-action-btn" onClick={() => onRegenerate(msg.id)}>
                <RefreshCw size={11} /> {t.retry}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ChatPage() {
  const {
    settings,
    activeConvId,
    activeConversation,
    createConversation,
    updateConversation,
    addMemory,
    memory,
    ollamaStatus,
  } = useApp()
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [permissionOpen, setPermissionOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [attachments, setAttachments] = useState([])
  // Map of assistantMessageId -> actionCard state (for live updates)
  const [actionCards, setActionCards] = useState({})
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const activeRecRef = useRef(null)
  const wakeWordRecRef = useRef(null)
  const chatMessagesRef = useRef(null)
  const textareaRef = useRef(null)
  const abortRef = useRef(null)

  const t = getTranslation(settings?.language || 'English')

  // Stop speaking when user navigates or component unmounts
  useEffect(() => {
    return () => {
      stopSpeaking()
    }
  }, [])

  // ── Wake Word Background Listener ─────────────────────────────────────────
  useEffect(() => {
    if (!settings?.wakeWord) {
      if (wakeWordRecRef.current) {
        wakeWordRecRef.current.stop()
        wakeWordRecRef.current = null
      }
      return
    }

    if (isListening || isSpeaking || isStreaming) {
      // Pause wake word when active dialogue is happening
      if (wakeWordRecRef.current) {
        wakeWordRecRef.current.stop()
      }
      return
    }

    const initWakeWord = () => {
      try {
        const rec = new VoiceRecognition({ continuous: true, interimResults: false })
        rec.onResultCallback = ({ final }) => {
          const lower = final.toLowerCase()
          if (lower.includes('luna') || lower.includes('hey luna')) {
            toast.info('Luna is listening...')
            // Active synthesis feedback
            speakText('Yes?', { voiceName: settings?.voiceName, language: settings?.language }).then(() => {
              setIsListening(true)
            })
          }
        };
        rec.onEndCallback = () => {
          // Restart background listening automatically if it times out
          if (settings?.wakeWord && !isListening && !isSpeaking && !isStreaming) {
            rec.start()
          }
        };
        wakeWordRecRef.current = rec
        rec.start()
      } catch (err) {
        console.warn('Wake word system initialization failed:', err)
      }
    }

    initWakeWord()

    return () => {
      if (wakeWordRecRef.current) {
        wakeWordRecRef.current.stop()
        wakeWordRecRef.current = null
      }
    }
  }, [settings?.wakeWord, isListening, isSpeaking, isStreaming, settings?.voiceName, settings?.language])

  // ── Active Speech Recognition ──────────────────────────────────────────────
  useEffect(() => {
    if (!isListening) {
      if (activeRecRef.current) {
        activeRecRef.current.stop()
        activeRecRef.current = null
      }
      return
    }

    // Stop speaking when starting to listen
    stopSpeaking()
    setIsSpeaking(false)

    if (window.luna && window.luna.isElectron) {
      let active = true;
      toast.info('Local voice recognition active. Speak now...');
      
      window.luna.startLocalSpeechRecognition().then((res) => {
        if (!active) return;
        if (res.success) {
          setInput(res.text);
          sendMessage(res.text);
        } else {
          if (res.error === 'No speech detected') {
            toast.error('No speech detected. Please speak clearly into your microphone.');
          } else {
            toast.error(`Speech recognition failed: ${res.error}`);
          }
        }
        setIsListening(false);
      }).catch((err) => {
        if (!active) return;
        toast.error(`Local voice recognition error: ${err.message}`);
        setIsListening(false);
      });

      return () => {
        active = false;
      };
    }

    let startTimeout = null
    let startDelayTimeout = null

    try {
      const rec = new VoiceRecognition({ continuous: false, interimResults: true })
      
      rec.onStartCallback = () => {
        if (startTimeout) clearTimeout(startTimeout)
      };

      rec.onResultCallback = ({ final, interim }) => {
        if (interim) {
          setInput(interim)
        }
        if (final) {
          setInput(final)
          sendMessage(final)
          setIsListening(false)
        }
      };
      rec.onErrorCallback = (err) => {
        console.warn('STT Error:', err)
        setIsListening(false)
        if (startTimeout) clearTimeout(startTimeout)
        if (startDelayTimeout) clearTimeout(startDelayTimeout)
        if (err === 'not-allowed') {
          toast.error('Microphone access denied. Please check your system privacy/security settings.')
        } else if (err === 'network') {
          toast.error('Speech recognition network error. (Note: Electron restricts the Web Speech API; please run in Google Chrome for voice input).')
        } else if (err === 'no-speech') {
          toast.error('No speech detected. Please try again.')
        } else if (err === 'aborted') {
          // ignore
        } else {
          toast.error(`Speech Recognition error: ${err}`)
        }
      };
      rec.onEndCallback = () => {
        setIsListening(false)
        if (startTimeout) clearTimeout(startTimeout)
        if (startDelayTimeout) clearTimeout(startDelayTimeout)
      };
      activeRecRef.current = rec

      startTimeout = setTimeout(() => {
        if (isListening && activeRecRef.current && !activeRecRef.current.hasStarted) {
          console.warn('STT Start Timeout: Microphone not responding.')
          toast.error('Microphone not responding. Please check your system privacy settings and browser permissions.')
          setIsListening(false)
        }
      }, 4500)

      // Add a small 250ms delay to allow any background/wake-word listeners to release the microphone device
      startDelayTimeout = setTimeout(() => {
        if (isListening && activeRecRef.current) {
          rec.start()
        }
      }, 250)
    } catch (err) {
      toast.error('Could not start Speech Recognition')
      setIsListening(false)
      if (startTimeout) clearTimeout(startTimeout)
      if (startDelayTimeout) clearTimeout(startDelayTimeout)
    }

    return () => {
      if (startTimeout) clearTimeout(startTimeout)
      if (startDelayTimeout) clearTimeout(startDelayTimeout)
      if (activeRecRef.current) {
        activeRecRef.current.stop()
      }
    }
  }, [isListening])

  const suggestions = React.useMemo(() => {
    const lang = settings?.language || 'English'
    switch (lang) {
      case 'Spanish':
        return [
          { title: 'Resumir un archivo', desc: 'Adjunta un archivo de texto o markdown' },
          { title: 'Crear lista de tareas', desc: 'Planifica los próximos pasos prácticos' },
          { title: 'Redactar un correo', desc: 'Escribe un borrador claro y editable' },
          { title: 'Recordar preferencia', desc: 'Guarda contexto útil localmente' },
        ]
      case 'French':
        return [
          { title: 'Résumer un fichier', desc: 'Joindre un fichier texte ou markdown' },
          { title: 'Créer des tâches', desc: 'Planifier les prochaines étapes pratiques' },
          { title: 'Rédiger un e-mail', desc: 'Écrire un brouillon clair et modifiable' },
          { title: 'Retenir une préférence', desc: 'Enregistrer du contexte utile localement' },
        ]
      case 'German':
        return [
          { title: 'Datei zusammenfassen', desc: 'Text- oder Markdown-Datei anhängen' },
          { title: 'Aufgabenliste erstellen', desc: 'Planen Sie die nächsten praktischen Schritte' },
          { title: 'E-Mail entwerfen', desc: 'Schreiben Sie einen klaren, editierbaren Entwurf' },
          { title: 'Einstellung merken', desc: 'Nützlichen Kontext lokal speichern' },
        ]
      case 'Chinese':
        return [
          { title: '总结文档', desc: '附加一个纯文本或 Markdown 文件' },
          { title: '创建任务清单', desc: '规划接下来要实行的具体步骤' },
          { title: '起草电子邮件', desc: '撰写一份清晰易编辑的邮件草稿' },
          { title: '保存本地偏好', desc: '保存实用的背景记忆到本地' },
        ]
      case 'Hindi':
        return [
          { title: 'फ़ाइल का सारांश बनाएं', desc: 'एक टेक्स्ट या मार्कडाउन फ़ाइल जोड़ें' },
          { title: 'टास्क सूची बनाएं', desc: 'व्यवहारिक अगले कदमों की योजना बनाएं' },
          { title: 'ईमेल का मसौदा बनाएं', desc: 'एक स्पष्ट और संपादन योग्य मसौदा लिखें' },
          { title: 'प्राथमिकता याद रखें', desc: 'उपयोगी संदर्भ को स्थानीय रूप से सहेजें' },
        ]
      case 'Portuguese':
        return [
          { title: 'Resumir um arquivo', desc: 'Anexar um arquivo de texto ou markdown' },
          { title: 'Criar lista de tarefas', desc: 'Planejar os próximos passos práticos' },
          { title: 'Escrever um e-mail', desc: 'Escrever um rascunho limpo e editável' },
          { title: 'Lembrar de uma preferência', desc: 'Salvar contexto útil localmente' },
        ]
      case 'Japanese':
        return [
          { title: 'ファイルの要約', desc: 'テキストファイルやMarkdownファイルを添付' },
          { title: 'タスクリストの作成', desc: '次に行う具体的な手順を計画' },
          { title: 'メールの下書き', desc: '編集可能で分かりやすい下書きを作成' },
          { title: '好みの記憶', desc: '役立つコンテキストをローカルに保存' },
        ]
      default:
        return [
          { title: 'Summarize this PDF', desc: 'Attach a file and I\'ll extract key points' },
          { title: 'Create a reminder for tomorrow', desc: 'I\'ll alert you at the right time' },
          { title: 'Find my resume', desc: 'Search across your local folders' },
          { title: 'Open Spotify', desc: 'Launch apps or websites by name' },
          { title: 'Organize my Downloads folder', desc: 'Sort files into auto-categories' },
        ]
    }
  }, [settings?.language])

  const messages = activeConversation?.messages || []

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
    }
  }, [messages, isStreaming])

  const autoResize = () => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 140)}px`
  }

  const handleAttach = async () => {
    const files = await window.luna.openFileDialog()
    if (files) setAttachments((prev) => [...prev, ...files])
  }

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, current) => current !== index))
  }

  const getOrCreateConversation = useCallback(async () => {
    if (activeConvId && activeConversation) return activeConversation
    return createConversation()
  }, [activeConvId, activeConversation, createConversation])

  const sendMessage = useCallback(
    async (text) => {
      if (!text.trim() && attachments.length === 0) return
      setInput('')
      setAttachments([])
      if (textareaRef.current) textareaRef.current.style.height = 'auto'

      const conversation = await getOrCreateConversation()

      const imageFiles = attachments.filter(file => {
        const ext = file.name.split('.').pop().toLowerCase()
        return ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)
      })
      const textFiles = attachments.filter(file => !imageFiles.includes(file))

      let userContent = text.trim()
      if (textFiles.length > 0) {
        const fileTexts = textFiles
          .map((file) =>
            file.content
              ? `\n\n[File: ${file.name}]\n${file.content.slice(0, 4000)}`
              : `\n\n[Attached: ${file.name}]`,
          )
          .join('')
        userContent += fileTexts
      }

      const userMessage = {
        id: uuidv4(),
        role: 'user',
        content: userContent,
        timestamp: new Date().toISOString(),
      }

      if (imageFiles.length > 0) {
        userMessage.images = imageFiles.map(img => img.content)
      }

      const updatedMessages = [...(conversation.messages || []), userMessage]
      const nextTitle = conversation.title === 'New Chat' ? text.trim().slice(0, 40) || 'Chat' : conversation.title
      await updateConversation(conversation.id, { messages: updatedMessages, title: nextTitle })

      setIsStreaming(true)
      const assistantMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      }
      let allMessages = [...updatedMessages, assistantMessage]
      await updateConversation(conversation.id, { messages: allMessages }, { persist: false })

      try {
        const controller = new AbortController()
        abortRef.current = controller

        const history = updatedMessages.slice(-12).map((message) => {
          const m = {
            role: message.role,
            content: message.content,
          }
          if (message.images) {
            m.images = message.images
          }
          return m
        })
        let content = ''

        const result = await streamAssistantReply(
          {
            settings,
            ollamaStatus,
            messages: history,
            prompt: userContent,
            memory,
            signal: controller.signal,
          },
          async (token) => {
            content += token
            allMessages = allMessages.map((message) =>
              message.id === assistantMessage.id ? { ...message, content } : message,
            )
            await updateConversation(conversation.id, { messages: allMessages }, { persist: false })
          },
        )

        const finalRawContent = result.content || content
        const actionTagMatch = finalRawContent.match(/\[ACTION:\s*([A-Z_]+)\s*(.*?)\]/)
        let cleanedContent = finalRawContent
        
        if (actionTagMatch) {
          cleanedContent = finalRawContent.replace(/\[ACTION:\s*[A-Z_]+\s*.*?\]/g, '').trim()
        }

        allMessages = allMessages.map((message) =>
          message.id === assistantMessage.id
            ? { ...message, content: cleanedContent, provider: result.provider }
            : message,
        )
        await updateConversation(conversation.id, { messages: allMessages })

        // ── Voice Output Synthesis ───────────────────────────────────────────
        if (settings?.voice && cleanedContent) {
          setIsSpeaking(true)
          speakText(cleanedContent, {
            voiceName: settings?.voiceName,
            language: settings?.language
          }).finally(() => {
            setIsSpeaking(false)
          })
        }

        // ── Intent detection & execution ──────────────────────────────────────
        const intent = parseIntent(userContent)

        if (intent) {
          // Non-destructive actions run immediately (reminder, search, URL, app)
          const safeTypes = ['CREATE_REMINDER', 'SEARCH_FILES', 'OPEN_URL', 'OPEN_APP', 'COMPOSE_EMAIL', 'SUMMARIZE_PDF']
          const sensitiveTypes = ['ORGANIZE_FOLDER']

          const runIntent = async () => {
            const msgId = assistantMessage.id
            await executeIntent(intent, settings, (cardState) => {
              setActionCards(prev => ({ ...prev, [msgId]: cardState }))
            })
          }

          if (sensitiveTypes.includes(intent.type)) {
            // Ask permission before destructive folder operations
            setPendingAction({
              type: intent.type,
              target: intent.folder || intent.path || '',
              execute: runIntent,
            })
            setPermissionOpen(true)
          } else {
            // Run immediately for safe intents
            runIntent()
          }
        } else if (actionTagMatch) {
          // Legacy ACTION tag fallback
          const actionType = actionTagMatch[1]
          const actionArg = actionTagMatch[2].trim()
          
          setPendingAction({
            type: actionType,
            target: actionArg,
            execute: async () => {
              try {
                if (actionType === 'OPEN_URL') {
                  await window.luna.openExternal(actionArg)
                  toast.success(`Opening Link: ${actionArg}`)
                } else if (actionType === 'MAILTO') {
                  await window.luna.openExternal(actionArg)
                  toast.success('Opening Email Client')
                } else if (actionType === 'APP') {
                  const res = await window.luna.launchApp(actionArg)
                  if (res.success) {
                    toast.success(`Launched ${actionArg}`)
                  } else {
                    toast.error(`Launch failed: ${res.error}`)
                  }
                }
              } catch {
                toast.error('Failed to execute desktop action')
              }
            }
          })
          setPermissionOpen(true)
        }

        // Automatic Memory Extraction & Personalization
        let extracted = []
        if (settings?.autoExtractMemory && ollamaStatus === 'online') {
          try {
            // Background cognitive extraction via Ollama
            const extractPrompt = `Exchange:
User: "${userContent}"
Assistant: "${content}"

Extract new user preferences, favorite apps, writing styles, or key personal facts. Write ONLY a single concise fact to remember (max 12 words), or "none".`
            const res = await fetch(`${settings.ollamaUrl}/api/chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: settings.model || 'qwen2:0.5b',
                messages: [{ role: 'user', content: extractPrompt }],
                stream: false,
              }),
            })
            if (res.ok) {
              const data = await res.json()
              const reply = data.message?.content || ''
              if (!reply.toLowerCase().includes('none') && reply.trim().length > 5) {
                extracted.push(reply.replace(/^[-*•\d.\s]+/, '').trim())
              }
            }
          } catch {}
        }
        
        // Fallback or additional heuristic check
        const lower = userContent.toLowerCase()
        if (settings?.autoExtractMemory) {
          if (lower.includes('my name is')) {
          const match = userContent.match(/my name is\s+([A-Za-z0-9\s]+?)(?:\s+my|\s+i|\s+and|$)/i)
          if (match) extracted.push(`User's name: ${match[1].trim()}`)
        } else if (lower.includes('i am ')) {
          const match = userContent.match(/i am\s+([A-Za-z0-9\s]+?)(?:\s+my|\s+i|\s+and|$)/i)
          if (match && !['a', 'the', 'very', 'not', 'just', 'here', 'so', 'now', 'using'].includes(match[1].trim().toLowerCase())) {
            extracted.push(`User's name: ${match[1].trim()}`)
          }
        }
        if (lower.includes('i prefer')) {
          const match = userContent.match(/i prefer\s+([A-Za-z0-9\s,-]+?)(?:\s+my|\s+i|\s+and|$)/i)
          if (match) extracted.push(`User preference: ${match[1].trim()}`)
        }
        if (lower.includes('favorite app') || lower.includes('favourite app')) {
          const match = userContent.match(/(?:favorite|favourite)\s+app\s+(?:is\s+)?([A-Za-z0-9\s,-]+?)(?:\s+my|\s+i|\s+and|$)/i)
          if (match) extracted.push(`Favorite app: ${match[1].trim()}`)
        }
        if (lower.includes('writing style')) {
          const match = userContent.match(/writing style\s+(?:is\s+)?([A-Za-z0-9\s,-]+?)(?:\s+my|\s+i|\s+and|$)/i)
          if (match) extracted.push(`Writing style: ${match[1].trim()}`)
        }
        }
        
        // Save extracted items
        for (const item of extracted) {
          if (item && item.length < 150) {
            await addMemory(item)
          }
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          const errorMessage = {
            id: uuidv4(),
            role: 'assistant',
            content: `I could not complete the local response: ${error.message}`,
            timestamp: new Date().toISOString(),
          }
          await updateConversation(conversation.id, {
            messages: [...allMessages.filter((message) => message.id !== assistantMessage.id), errorMessage],
          })
          toast.error(t.aiFailed)
        }
      } finally {
        setIsStreaming(false)
        abortRef.current = null
      }
    },
    [
      attachments,
      getOrCreateConversation,
      updateConversation,
      settings,
      ollamaStatus,
      memory,
      addMemory,
      t,
    ],
  )

  const handleKey = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage(input)
    }
  }

  const handleCopy = async (text) => {
    await window.luna.writeClipboard(text)
    toast.success(t.copied)
  }

  const handleRegenerate = async (messageId) => {
    if (!activeConversation) return
    const index = activeConversation.messages.findIndex((message) => message.id === messageId)
    if (index < 1) return
    const previousUserMessage = activeConversation.messages[index - 1]
    if (previousUserMessage?.role === 'user') sendMessage(previousUserMessage.content)
  }

  const handleSaveMemory = async () => {
    const lastAssistantMessage = messages.filter((message) => message.role === 'assistant').at(-1)
    if (!lastAssistantMessage) return
    await addMemory(lastAssistantMessage.content.slice(0, 300))
    toast.success(t.savedMem)
  }

  const toggleVoiceInput = () => {
    setIsListening((prev) => !prev)
  }

  return (
    <div className="chat-page">
      <div className="chat-messages" ref={chatMessagesRef}>
        {messages.length === 0 ? (
          <div className="chat-empty">
            <div className="chat-empty-logo">L</div>
            <div style={{ textAlign: 'center' }}>
              <h2>{t.emptyTitle}</h2>
              <div style={{ 
                marginTop: 8, 
                color: 'var(--text-secondary)', 
                fontSize: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                alignItems: 'center'
              }}>
                <div>• {t.emptyBullet1}</div>
                <div>• {t.emptyBullet2}</div>
              </div>
            </div>
            <div className="suggestions">
              {suggestions.map((suggestion) => (
                <button
                  type="button"
                  key={suggestion.title}
                  className="suggestion-card"
                  onClick={() => sendMessage(suggestion.title)}
                >
                  <strong>{suggestion.title}</strong>
                  {suggestion.desc}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages
            .filter((msg) => msg.role !== 'assistant' || msg.content)
            .map((message) => (
              <Message
                key={message.id}
                msg={{ ...message, actionCard: actionCards[message.id] }}
                onCopy={handleCopy}
                onRegenerate={handleRegenerate}
              />
            ))
        )}
        {isStreaming && (!messages.at(-1)?.content || messages.at(-1)?.role !== 'assistant') && (
          <TypingIndicator assistantName={settings.assistantName} />
        )}
      </div>

      <div className="chat-input-area">
        {attachments.length > 0 && (
          <div className="flex gap-2" style={{ marginBottom: 8, flexWrap: 'wrap' }}>
            {attachments.map((attachment, index) => {
              const ext = attachment.name.split('.').pop().toLowerCase()
              const isImg = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)
              return (
                <div key={`${attachment.name}-${index}`} className="attachment-chip" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {isImg && attachment.content ? (
                    <img 
                      src={`data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${attachment.content}`} 
                      alt={attachment.name} 
                      style={{ width: 18, height: 18, objectFit: 'cover', borderRadius: 3 }} 
                    />
                  ) : (
                    <Paperclip size={12} />
                  )}
                  <span style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {attachment.name}
                  </span>
                  <button onClick={() => removeAttachment(index)} title="Remove attachment">
                    <X size={12} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
        <div className="chat-input-wrapper">
          <button className="input-action-btn" onClick={handleAttach} title={t.attachFile}>
            <Paperclip size={14} />
          </button>
          <button className="input-action-btn" onClick={handleSaveMemory} title={t.saveToMemory}>
            <Brain size={14} />
          </button>
          <button 
            className={`input-action-btn ${isListening ? 'active-listening' : ''}`}
            onClick={toggleVoiceInput}
            title={isListening ? 'Stop Voice Input' : 'Voice Input (STT)'}
            style={{
              color: isListening ? 'var(--accent-light)' : 'var(--text-secondary)',
              borderColor: isListening ? 'var(--accent)' : 'var(--border)',
              background: isListening ? 'rgba(39, 199, 184, 0.08)' : 'transparent',
            }}
          >
            {isListening ? <Mic size={14} className="animation-pulse" style={{ color: 'var(--accent-light)' }} /> : <Mic size={14} />}
          </button>
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            placeholder={isListening ? 'Listening...' : (t.placeholder ? t.placeholder.replace('{name}', settings.assistantName) : `Message ${settings.assistantName}...`)}
            value={input}
            onChange={(event) => {
              setInput(event.target.value)
              autoResize()
              if (isSpeaking) {
                stopSpeaking()
                setIsSpeaking(false)
              }
            }}
            onKeyDown={handleKey}
            rows={1}
          />
          {(isStreaming || isSpeaking) ? (
            <button
              className="send-btn"
              onClick={() => {
                if (isStreaming) abortRef.current?.abort()
                if (isSpeaking) {
                  stopSpeaking()
                  setIsSpeaking(false)
                }
              }}
              title={t.stop}
              style={{ background: 'var(--danger)' }}
            >
              {isSpeaking ? <VolumeX size={15} style={{ color: '#fff' }} /> : <span style={{ width: 10, height: 10, background: '#fff', borderRadius: 2, display: 'block' }} />}
            </button>
          ) : (
            <button
              className="send-btn"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() && attachments.length === 0}
              title={t.send}
            >
              <Send size={15} />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between" style={{ marginTop: 8, paddingInline: 2 }}>
          <span className="text-xs text-muted">{t.localMode}</span>
          <div className="model-tag">
            <Sparkles size={10} />
            {ollamaStatus === 'online' ? settings.model || 'local model' : 'offline mock'}
          </div>
        </div>
      </div>
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
