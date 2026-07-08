const SETTINGS_KEY = 'luna.settings'
const MEMORY_KEY = 'luna.memory'
const CONVERSATIONS_KEY = 'luna.conversations'
const TASKS_KEY = 'luna.tasks'
const NOTES_KEY = 'luna.notes'

export const defaultSettings = {
  assistantName: 'Luna',
  userName: 'User',
  ollamaUrl: 'http://localhost:11434',
  model: 'qwen2.5:1.5b',
  inferenceMode: 'auto',
  onboardingComplete: false,
  voice: false,
  voiceName: '',
  wakeWord: false,
  fontSize: 'medium',
  aiPersonality: 'friendly',
  responseLength: 'balanced',
  autoExtractMemory: true,
  notifications: true,
  mockWhenOffline: true,
  theme: 'dark',
  language: 'English',
  permissions: {
    files: false,
    clipboard: true,
    notifications: true,
    automation: false,
  },
  systemPrompt:
    'You are Luna, a helpful, friendly, and privacy-focused AI desktop assistant. You run locally, ask before sensitive actions, and keep responses concise.',
  accentColor: '#27c7b8',
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
  return value
}

function makeId() {
  if (crypto?.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function saveCollectionItem(key, item) {
  const items = read(key, [])
  const updated = item.updatedAt ? item : { ...item, updatedAt: new Date().toISOString() }
  const exists = items.some((x) => x.id === updated.id)
  const next = exists ? items.map((x) => (x.id === updated.id ? updated : x)) : [updated, ...items]
  write(key, next)
  return updated
}

export function installLunaBridgeFallback() {
  if (window.luna) return

  window.luna = {
    isFallback: true,
    isElectron: false,
    minimize: () => {},
    maximize: () => {},
    close: () => {},

    loadSettings: async () => ({ ...defaultSettings, ...read(SETTINGS_KEY, {}) }),
    saveSettings: async (data) => {
      write(SETTINGS_KEY, { ...defaultSettings, ...data })
      return true
    },

    listMemory: async () => read(MEMORY_KEY, []),
    addMemory: async (content) => {
      const item = { id: makeId(), content, createdAt: new Date().toISOString(), pinned: false }
      write(MEMORY_KEY, [item, ...read(MEMORY_KEY, [])])
      return item
    },
    deleteMemory: async (id) => {
      write(
        MEMORY_KEY,
        read(MEMORY_KEY, []).filter((item) => item.id !== id),
      )
      return true
    },
    pinMemory: async (id) => {
      write(
        MEMORY_KEY,
        read(MEMORY_KEY, []).map((item) => (item.id === id ? { ...item, pinned: !item.pinned } : item)),
      )
      return true
    },
    clearMemory: async () => {
      write(MEMORY_KEY, [])
      return true
    },

    listConversations: async () => read(CONVERSATIONS_KEY, []),
    saveConversation: async (conversation) => {
      saveCollectionItem(CONVERSATIONS_KEY, conversation)
      return true
    },
    deleteConversation: async (id) => {
      write(
        CONVERSATIONS_KEY,
        read(CONVERSATIONS_KEY, []).filter((conversation) => conversation.id !== id),
      )
      return true
    },

    listTasks: async () => read(TASKS_KEY, []),
    saveTasks: async (tasks) => {
      write(TASKS_KEY, tasks)
      return true
    },

    listNotes: async () => read(NOTES_KEY, []),
    saveNote: async (note) => saveCollectionItem(NOTES_KEY, note),
    deleteNote: async (id) => {
      write(
        NOTES_KEY,
        read(NOTES_KEY, []).filter((note) => note.id !== id),
      )
      return true
    },

    openFileDialog: async () => [
      { name: 'sample.txt', path: '/mock/sample.txt', content: 'This is a sample local file loaded in web preview mode.' }
    ],
    openFolderDialog: async () => '/mock/Downloads',
    readFile: async () => 'Sample content',
    saveFileDialog: async (name, content) => {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = name
      link.click()
      URL.revokeObjectURL(url)
      return true
    },

    systemInfo: async () => ({
      platform: navigator.platform,
      arch: 'browser-preview',
      totalMemory: navigator.deviceMemory ? navigator.deviceMemory * 1024 ** 3 : 0,
      freeMemory: 0,
      cpus: navigator.hardwareConcurrency || 1,
      homeDir: 'preview',
      hostname: location.hostname,
      nodeVersion: 'browser',
    }),

    writeClipboard: async (text) => {
      await navigator.clipboard?.writeText(text)
      return true
    },
    readClipboard: async () => navigator.clipboard?.readText?.() || '',
    notify: async (title, body) => {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body })
      }
      return true
    },
    shellOpen: async () => true,

    // Contacts fallbacks
    listContacts: async () => read('luna.contacts', []),
    saveContacts: async (contacts) => {
      write('luna.contacts', contacts)
      return true
    },

    // Calendar fallbacks
    listCalendar: async () => read('luna.calendar', []),
    saveCalendar: async (calendar) => {
      write('luna.calendar', calendar)
      return true
    },

    // Smart Home fallbacks
    listSmartDevices: async () => read('luna.smartDevices', [
      {
        id: 'light-living-room',
        name: 'Living Room Lamp',
        type: 'light',
        room: 'Living Room',
        state: 'off',
        brightness: 80,
        integration: 'mock',
        entityId: 'light.living_room_lamp',
        topic: 'luna/home/light/living_room'
      },
      {
        id: 'plug-coffee-maker',
        name: 'Coffee Maker',
        type: 'plug',
        room: 'Kitchen',
        state: 'off',
        powerWatts: 0,
        integration: 'mock',
        entityId: 'switch.coffee_maker',
        topic: 'luna/home/plug/coffee_maker'
      },
      {
        id: 'thermostat-hallway',
        name: 'Hallway Climate',
        type: 'thermostat',
        room: 'Hallway',
        state: 'cool',
        temperature: 72,
        targetTemperature: 70,
        integration: 'mock',
        entityId: 'climate.hallway_thermostat',
        topic: 'luna/home/thermostat/hallway'
      },
      {
        id: 'speaker-studio',
        name: 'Studio Speakers',
        type: 'speaker',
        room: 'Studio',
        state: 'paused',
        volume: 50,
        track: 'Ambient Focus Beats',
        integration: 'mock',
        entityId: 'media_player.studio_speaker',
        topic: 'luna/home/speaker/studio'
      }
    ]),
    saveSmartDevices: async (devices) => {
      write('luna.smartDevices', devices)
      return true
    },
    controlSmartDevice: async (id, action, value) => {
      const defaultDevices = [
        { id: 'light-living-room', name: 'Living Room Lamp', type: 'light', room: 'Living Room', state: 'off', brightness: 80, integration: 'mock', entityId: 'light.living_room_lamp', topic: 'luna/home/light/living_room' },
        { id: 'plug-coffee-maker', name: 'Coffee Maker', type: 'plug', room: 'Kitchen', state: 'off', powerWatts: 0, integration: 'mock', entityId: 'switch.coffee_maker', topic: 'luna/home/plug/coffee_maker' },
        { id: 'thermostat-hallway', name: 'Hallway Climate', type: 'thermostat', room: 'Hallway', state: 'cool', temperature: 72, targetTemperature: 70, integration: 'mock', entityId: 'climate.hallway_thermostat', topic: 'luna/home/thermostat/hallway' },
        { id: 'speaker-studio', name: 'Studio Speakers', type: 'speaker', room: 'Studio', state: 'paused', volume: 50, track: 'Ambient Focus Beats', integration: 'mock', entityId: 'media_player.studio_speaker', topic: 'luna/home/speaker/studio' }
      ]
      const devices = read('luna.smartDevices', defaultDevices)
      const deviceIdx = devices.findIndex(d => d.id === id)
      if (deviceIdx === -1) return { success: false, error: 'Device not found' }
      const device = devices[deviceIdx]
      const oldState = { ...device }

      if (action === 'turn_on') {
        device.state = device.type === 'speaker' ? 'playing' : (device.type === 'thermostat' ? 'heat' : 'on')
        if (device.type === 'plug') device.powerWatts = 135
      } else if (action === 'turn_off') {
        device.state = device.type === 'speaker' ? 'paused' : (device.type === 'thermostat' ? 'off' : 'off')
        if (device.type === 'plug') device.powerWatts = 0
      } else if (action === 'set_value') {
        if (device.type === 'light') {
          device.brightness = value
          device.state = 'on'
        } else if (device.type === 'speaker') {
          device.volume = value
        } else if (device.type === 'thermostat') {
          device.targetTemperature = value
        }
      }
      devices[deviceIdx] = device
      write('luna.smartDevices', devices)

      // Add IoT Log fallback
      const logs = read('luna.iotLogs', [])
      const actionLabel = action === 'turn_on' ? 'Turn On' : (action === 'turn_off' ? 'Turn Off' : `Set Value (${value})`)
      const newLog = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date().toISOString(),
        type: 'CONTROL',
        message: `${device.name} (${device.room}): ${actionLabel} (Simulated)`,
        details: `Previous state: ${oldState.state || oldState.brightness || oldState.targetTemperature}. New state: ${device.state || device.brightness || device.targetTemperature}.`
      }
      logs.unshift(newLog)
      write('luna.iotLogs', logs.slice(0, 100))

      return { success: true, device, haStatus: 'Mocked', mqttStatus: 'Mocked' }
    },
    listIotLogs: async () => read('luna.iotLogs', []),
    clearIotLogs: async () => {
      write('luna.iotLogs', [])
      return true
    },

    // Browser fallbacks
    openExternal: async (url) => {
      window.open(url, '_blank')
      return true
    },

    // File manipulation fallbacks
    renameFile: async () => ({ success: true }),
    organizeFolder: async () => ({ success: true, movedCount: 3 }),
    searchFiles: async () => ({
      success: true,
      results: [{ name: 'sample.txt', path: '/mock/sample.txt', size: 1024, updatedAt: new Date().toISOString() }]
    }),

    // App launcher fallback
    launchApp: async (appName) => {
      alert(`[Launch Request] "${appName}" triggered. App launching is mocked in web browser fallback mode.`)
      return { success: true }
    },

    getAppVersion: async () => '0.1.0-prototype',
    checkForUpdates: async () => ({ available: false }),
    pullModel: async (name, onProgress) => {
      for (let p = 0; p <= 100; p += 10) {
        await new Promise((r) => setTimeout(r, 200))
        onProgress(p, p === 100 ? 'Success' : `Downloading: ${p}%`)
      }
      return true
    },
    cancelPullModel: async (_name) => true,
    deleteModel: async (_name) => true,
    startLocalSpeechRecognition: async () => ({ success: false, error: 'Not supported in browser' }),
  }
}
