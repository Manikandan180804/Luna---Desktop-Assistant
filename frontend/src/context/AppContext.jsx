import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { defaultSettings } from '../services/lunaBridge'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [settings, setSettings] = useState(null)
  const [conversations, setConversations] = useState([])
  const [activeConvId, setActiveConvId] = useState(null)
  const [memory, setMemory] = useState([])
  const [tasks, setTasks] = useState([])
  const [notes, setNotes] = useState([])
  const [contacts, setContacts] = useState([])
  const [calendar, setCalendar] = useState([])
  const [ollamaStatus, setOllamaStatus] = useState('checking') // 'online' | 'offline' | 'checking'
  const [availableModels, setAvailableModels] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Load everything on mount
  useEffect(() => {
    async function init() {
      const s = await window.luna.loadSettings()
      setSettings({ ...defaultSettings, ...s, permissions: { ...defaultSettings.permissions, ...(s.permissions || {}) } })
      const convs = await window.luna.listConversations()
      setConversations(convs)
      const mem = await window.luna.listMemory()
      setMemory(mem)
      const t = await window.luna.listTasks()
      setTasks(t)
      const n = await window.luna.listNotes()
      setNotes(n)
      const c = await window.luna.listContacts()
      setContacts(c)
      const cal = await window.luna.listCalendar()
      setCalendar(cal)
    }
    init()
  }, [])

  // Handle theme application (dark, light, system)
  useEffect(() => {
    if (!settings?.theme) return
    const theme = settings.theme
    const rootEl = document.documentElement

    const applyTheme = (resolvedTheme) => {
      if (resolvedTheme === 'light') {
        rootEl.classList.add('theme-light')
        rootEl.classList.remove('theme-dark')
      } else {
        rootEl.classList.add('theme-dark')
        rootEl.classList.remove('theme-light')
      }
    }

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      applyTheme(mediaQuery.matches ? 'dark' : 'light')

      const listener = (event) => {
        applyTheme(event.matches ? 'dark' : 'light')
      }
      mediaQuery.addEventListener('change', listener)
      return () => mediaQuery.removeEventListener('change', listener)
    } else {
      applyTheme(theme)
    }
  }, [settings?.theme])

  // Handle font size application (small, medium, large)
  useEffect(() => {
    if (!settings?.fontSize) return
    const rootEl = document.documentElement
    rootEl.classList.remove('font-small', 'font-medium', 'font-large')
    rootEl.classList.add(`font-${settings.fontSize}`)
  }, [settings?.fontSize])

  // Check Ollama status
  useEffect(() => {
    if (!settings) return
    checkOllama()
    const interval = setInterval(checkOllama, 30000)
    return () => clearInterval(interval)
  }, [settings])

  const checkOllama = useCallback(async (override = {}) => {
    if (!settings && !override.ollamaUrl) return
    const currentSettings = { ...settings, ...override }
    try {
      const res = await fetch(`${currentSettings.ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(3000) })
      if (res.ok) {
        const data = await res.json()
        const models = data.models || []
        setAvailableModels(models)
        setOllamaStatus('online')

        // Auto-switch model if the configured one isn't installed
        if (models.length > 0) {
          const installedNames = models.map(m => m.name)
          const currentModel = currentSettings.model
          const isInstalled = installedNames.some(
            n => n === currentModel || n.startsWith(currentModel + ':') || currentModel.startsWith(n.split(':')[0])
          )
          if (!isInstalled) {
            const firstModel = models[0].name
            setSettings(prev => ({ ...prev, model: firstModel }))
            await window.luna.saveSettings({ ...currentSettings, model: firstModel })
          }
        }
      } else setOllamaStatus('offline')
    } catch {
      setOllamaStatus('offline')
    }
  }, [settings])

  const saveSettings = useCallback(async (newSettings) => {
    const merged = {
      ...defaultSettings,
      ...settings,
      ...newSettings,
      permissions: {
        ...defaultSettings.permissions,
        ...(settings?.permissions || {}),
        ...(newSettings.permissions || {}),
      },
    }
    setSettings(merged)
    await window.luna.saveSettings(merged)
  }, [settings])

  // Conversation helpers
  const createConversation = useCallback(async () => {
    const conv = { id: uuidv4(), title: 'New Chat', messages: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    await window.luna.saveConversation(conv)
    setConversations(prev => [conv, ...prev])
    setActiveConvId(conv.id)
    return conv
  }, [])

  const updateConversation = useCallback(async (id, updates, options = {}) => {
    let convToSave = null
    setConversations(prev => {
      const updated = prev.map(c => {
        if (c.id !== id) return c
        const next = { ...c, ...updates, updatedAt: new Date().toISOString() }
        convToSave = next
        return next
      })
      return updated
    })
    if (options.persist !== false && convToSave) await window.luna.saveConversation(convToSave)
  }, [])

  const deleteConversation = useCallback(async (id) => {
    await window.luna.deleteConversation(id)
    setConversations(prev => prev.filter(c => c.id !== id))
    if (activeConvId === id) setActiveConvId(null)
  }, [activeConvId])

  const clearAllConversations = useCallback(async () => {
    for (const c of conversations) {
      await window.luna.deleteConversation(c.id)
    }
    setConversations([])
    setActiveConvId(null)
  }, [conversations])

  const activeConversation = conversations.find(c => c.id === activeConvId) || null

  // Memory helpers
  const addMemory = useCallback(async (content) => {
    const entry = await window.luna.addMemory(content)
    setMemory(prev => [entry, ...prev])
    return entry
  }, [])

  const deleteMemory = useCallback(async (id) => {
    await window.luna.deleteMemory(id)
    setMemory(prev => prev.filter(m => m.id !== id))
  }, [])

  const pinMemory = useCallback(async (id) => {
    await window.luna.pinMemory(id)
    setMemory(prev => prev.map(m => m.id === id ? { ...m, pinned: !m.pinned } : m))
  }, [])

  const clearMemory = useCallback(async () => {
    await window.luna.clearMemory()
    setMemory([])
  }, [])

  // Tasks helpers
  const saveTasks = useCallback(async (newTasks) => {
    setTasks(newTasks)
    await window.luna.saveTasks(newTasks)
  }, [])

  // Contacts helpers
  const saveContacts = useCallback(async (newContacts) => {
    setContacts(newContacts)
    await window.luna.saveContacts(newContacts)
  }, [])

  // Calendar helpers
  const saveCalendar = useCallback(async (newCalendar) => {
    setCalendar(newCalendar)
    await window.luna.saveCalendar(newCalendar)
  }, [])

  // Notes helpers
  const saveNote = useCallback(async (note) => {
    const saved = await window.luna.saveNote(note)
    setNotes(prev => {
      const existing = prev.find(n => n.id === saved.id)
      if (existing) return prev.map(n => n.id === saved.id ? saved : n)
      return [saved, ...prev]
    })
    return saved
  }, [])

  const deleteNote = useCallback(async (id) => {
    await window.luna.deleteNote(id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }, [])

  if (!settings) return null

  return (
    <AppContext.Provider value={{
      settings, saveSettings,
      conversations, activeConvId, setActiveConvId, activeConversation,
      createConversation, updateConversation, deleteConversation, clearAllConversations,
      memory, addMemory, deleteMemory, pinMemory,
      clearMemory,
      tasks, saveTasks,
      notes, saveNote, deleteNote,
      contacts, saveContacts,
      calendar, saveCalendar,
      ollamaStatus, availableModels, checkOllama,
      sidebarOpen, setSidebarOpen,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
