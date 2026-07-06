import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Paperclip, Brain, Copy, RefreshCw, Sparkles, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { v4 as uuidv4 } from 'uuid'
import { useApp } from '../context/AppContext'
import { toast } from '../components/Toast'
import { streamAssistantReply } from '../services/inference'

const SUGGESTIONS = [
  { title: 'Summarize a file', desc: 'Attach a text or markdown file' },
  { title: 'Create a task list', desc: 'Plan the next practical steps' },
  { title: 'Draft an email', desc: 'Write a clear editable draft' },
  { title: 'Remember a preference', desc: 'Save useful context locally' },
]

function TypingIndicator() {
  return (
    <div className="message assistant fade-in">
      <div className="message-avatar">L</div>
      <div className="typing-indicator">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  )
}

function Message({ msg, onCopy, onRegenerate }) {
  const isUser = msg.role === 'user'
  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`message ${msg.role} fade-in`}>
      <div className="message-avatar">{isUser ? 'You' : 'L'}</div>
      <div className="message-content">
        <div className="message-bubble">
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
        </div>
        <div className="message-meta">
          <span className="message-time">{time}</span>
          {msg.provider && <span className="message-time">{msg.provider}</span>}
          <div className="message-actions">
            <button className="msg-action-btn" onClick={() => onCopy(msg.content)}>
              <Copy size={11} /> Copy
            </button>
            {!isUser && (
              <button className="msg-action-btn" onClick={() => onRegenerate(msg.id)}>
                <RefreshCw size={11} /> Retry
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
  const [attachments, setAttachments] = useState([])
  const chatMessagesRef = useRef(null)
  const textareaRef = useRef(null)
  const abortRef = useRef(null)

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
      let userContent = text.trim()

      if (attachments.length > 0) {
        const fileTexts = attachments
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

        const history = updatedMessages.slice(-12).map((message) => ({
          role: message.role,
          content: message.content,
        }))
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

        allMessages = allMessages.map((message) =>
          message.id === assistantMessage.id
            ? { ...message, content: result.content || content, provider: result.provider }
            : message,
        )
        await updateConversation(conversation.id, { messages: allMessages })

        const memoryCues = ['remember that', 'my name is', 'i prefer', 'i like', 'i work', 'i am', 'my goal']
        const lower = userContent.toLowerCase()
        if (memoryCues.some((cue) => lower.includes(cue))) {
          await addMemory(userContent.slice(0, 240))
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
          toast.error('AI response failed')
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
    toast.success('Copied to clipboard')
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
    toast.success('Saved to memory')
  }

  return (
    <div className="chat-page">
      <div className="chat-messages" ref={chatMessagesRef}>
        {messages.length === 0 ? (
          <div className="chat-empty">
            <div className="chat-empty-logo">L</div>
            <div style={{ textAlign: 'center' }}>
              <h2>Hello, I am {settings.assistantName}.</h2>
              <p style={{ marginTop: 8 }}>
                Your local, privacy-first AI assistant. Conversations, files, and memory stay on this device.
              </p>
            </div>
            <div className="suggestions">
              {SUGGESTIONS.map((suggestion) => (
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
          messages.map((message) => (
            <Message key={message.id} msg={message} onCopy={handleCopy} onRegenerate={handleRegenerate} />
          ))
        )}
        {isStreaming && messages.at(-1)?.role !== 'assistant' && <TypingIndicator />}
      </div>

      <div className="chat-input-area">
        {attachments.length > 0 && (
          <div className="flex gap-2" style={{ marginBottom: 8, flexWrap: 'wrap' }}>
            {attachments.map((attachment, index) => (
              <div key={`${attachment.name}-${index}`} className="attachment-chip">
                <Paperclip size={12} />
                {attachment.name}
                <button onClick={() => removeAttachment(index)} title="Remove attachment">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="chat-input-wrapper">
          <button className="input-action-btn" onClick={handleAttach} title="Attach file">
            <Paperclip size={14} />
          </button>
          <button className="input-action-btn" onClick={handleSaveMemory} title="Save last response to memory">
            <Brain size={14} />
          </button>
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            placeholder={`Message ${settings.assistantName}...`}
            value={input}
            onChange={(event) => {
              setInput(event.target.value)
              autoResize()
            }}
            onKeyDown={handleKey}
            rows={1}
          />
          {isStreaming ? (
            <button
              className="send-btn"
              onClick={() => abortRef.current?.abort()}
              title="Stop response"
              style={{ background: 'var(--danger)' }}
            >
              <span style={{ width: 10, height: 10, background: '#fff', borderRadius: 2, display: 'block' }} />
            </button>
          ) : (
            <button
              className="send-btn"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() && attachments.length === 0}
              title="Send"
            >
              <Send size={15} />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between" style={{ marginTop: 8, paddingInline: 2 }}>
          <span className="text-xs text-muted">Local mode: data stays on this device</span>
          <div className="model-tag">
            <Sparkles size={10} />
            {ollamaStatus === 'online' ? settings.model || 'local model' : 'offline mock'}
          </div>
        </div>
      </div>
    </div>
  )
}
